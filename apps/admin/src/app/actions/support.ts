'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import type {
  TicketStatus,
  TicketCategory,
  TicketPriority,
  UserType,
} from '@amana/shared-types';
import { MAX_OPEN_TICKETS, canTransitionTicket } from '@amana/shared-types';
import { logAudit } from '@/app/actions/moderation';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// =============================================================================
// الأنواع
// =============================================================================

/** صف تذكرة الدعم كما يُعرض في الجدول. */
export interface TicketRow {
  id: string;
  ticketNumber: string | null;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  userId: string;
  userRole: UserType;
  userName: string;
  userEmail: string;
  assignedTo: string | null;
  assignedName: string | null;
  messageCount: number;
  surveyRating: number | null;
  createdAt: string;
  updatedAt: string;
}

/** تفاصيل تذكرة (مع الرسائل + الاستبيان). */
export interface TicketDetail extends TicketRow {
  description: string;
  messages: TicketMessage[];
  surveySentAt: string | null;
  surveyRating: number | null;
  surveyComment: string | null;
  surveyAnsweredAt: string | null;
}

/** رسالة في التذكرة. */
export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: UserType;
  senderName: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

/** إحصائيات التذاكر. */
export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  cancelled: number;
}

// =============================================================================
// دوال مساعدة
// =============================================================================

function translateSupabaseError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many requests'))
    return 'تم إرسال عدد كبير من الطلبات. حاول مرة أخرى بعد بضع دقائق.';
  if (m.includes('not found') || m.includes('does not exist'))
    return 'التذكرة غير موجودة.';
  if (m.includes('foreign key') || m.includes('referenced'))
    return 'بيانات غير متوافقة.';
  if (m.includes('check constraint'))
    return 'قيمة غير مسموح بها.';
  return message || 'حدث خطأ غير متوقع.';
}

// =============================================================================
// تذاكر الدعم
// =============================================================================

/**
 * عرض تذاكر الدعم — يدعم فلترة الحالة والبحث.
 */
export async function listTickets(filters?: {
  status?: TicketStatus | 'all';
  search?: string;
}): Promise<TicketRow[]> {
  const { status = 'all', search = '' } = filters || {};

  let query = supabaseAdmin
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`subject.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data: tickets, error } = await query;
  if (error) {
    console.error('[listTickets] Error:', error.code, error.message);
    return [];
  }

  if (!tickets?.length) return [];

  // جلب أسماء المستخدمين
  const userIds = [...new Set(tickets.map((t) => t.user_id))];
  const assignedIds = [...new Set(tickets.map((t) => t.assigned_to).filter(Boolean))];

  const [{ data: profiles }, { data: authList }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', [...userIds, ...assignedIds]),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profileMap = new Map<string, any>();
  (profiles ?? []).forEach((p) => profileMap.set(p.id, p));

  const authMap = new Map<string, any>();
  (authList?.users ?? []).forEach((u) => authMap.set(u.id, u));

  // جلب عدد الرسائل لكل تذكرة
  const ticketIds = tickets.map((t) => t.id);
  const { data: messageCounts } = await supabaseAdmin
    .from('ticket_messages')
    .select('ticket_id')
    .in('ticket_id', ticketIds);

  const countMap = new Map<string, number>();
  (messageCounts ?? []).forEach((m) => {
    countMap.set(m.ticket_id, (countMap.get(m.ticket_id) || 0) + 1);
  });

  return tickets.map((t) => {
    const userProfile = profileMap.get(t.user_id);
    const authUser = authMap.get(t.user_id);
    const assignedProfile = t.assigned_to ? profileMap.get(t.assigned_to) : null;

    return {
      id: t.id,
      ticketNumber: t.ticket_number ?? null,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      userId: t.user_id,
      userRole: t.user_role,
      userName: userProfile?.full_name || authUser?.email || '—',
      userEmail: authUser?.email ?? '',
      assignedTo: t.assigned_to,
      assignedName: assignedProfile?.full_name || null,
      messageCount: countMap.get(t.id) || 0,
      surveyRating: t.survey_rating ?? null,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  });
}

/**
 * تفاصيل تذكرة مع الرسائل.
 */
export async function getTicket(ticketId: string): Promise<TicketDetail | null> {
  const { data: ticket, error } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (error || !ticket) {
    console.error('[getTicket] Error:', error?.code, error?.message);
    return null;
  }

  // جلب الرسائل
  const { data: messages } = await supabaseAdmin
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  // جلب أسماء المشاركين
  const senderIds = [...new Set([ticket.user_id, ticket.assigned_to, ...(messages ?? []).map((m) => m.sender_id)].filter(Boolean))];
  const [{ data: profiles }, { data: authList }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', senderIds),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profileMap = new Map<string, any>();
  (profiles ?? []).forEach((p) => profileMap.set(p.id, p));

  const authMap = new Map<string, any>();
  (authList?.users ?? []).forEach((u) => authMap.set(u.id, u));

  const getUserName = (userId: string) => {
    const p = profileMap.get(userId);
    const a = authMap.get(userId);
    return p?.full_name || a?.email || '—';
  };

  return {
    id: ticket.id,
    ticketNumber: ticket.ticket_number ?? null,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    userId: ticket.user_id,
    userRole: ticket.user_role,
    userName: getUserName(ticket.user_id),
    userEmail: authMap.get(ticket.user_id)?.email ?? '',
    assignedTo: ticket.assigned_to,
    assignedName: ticket.assigned_to ? getUserName(ticket.assigned_to) : null,
    messageCount: (messages ?? []).length,
    description: ticket.description,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    surveySentAt: ticket.survey_sent_at ?? null,
    surveyRating: ticket.survey_rating ?? null,
    surveyComment: ticket.survey_comment ?? null,
    surveyAnsweredAt: ticket.survey_answered_at ?? null,
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      ticketId: m.ticket_id,
      senderId: m.sender_id,
      senderRole: m.sender_role,
      senderName: getUserName(m.sender_id),
      message: m.message,
      isInternal: m.is_internal,
      createdAt: m.created_at,
    })),
  };
}

/**
 * إنشاء تذكرة جديدة — يتحقق من الحد الأقصى 10 تذاكر مفتوحة.
 */
export async function createTicket(
  userId: string,
  userRole: UserType,
  input: {
    subject: string;
    description: string;
    category: TicketCategory;
    priority?: TicketPriority;
  },
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  if (!userId) return { success: false, error: 'يجب تسجيل الدخول أولاً.' };

  // فحص الحد الأقصى للتذاكر غير المُغلقة (open + in_progress + resolved)
  const { count, error: countErr } = await supabaseAdmin
    .from('support_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['open', 'in_progress', 'resolved']);

  if (countErr) {
    console.error('[createTicket] Count error:', countErr.message);
    return { success: false, error: translateSupabaseError(countErr.message) };
  }

  if ((count ?? 0) >= MAX_OPEN_TICKETS) {
    return {
      success: false,
      error: `لديك ${MAX_OPEN_TICKETS} تذاكر مفتوحة بالفعل. يرجى إغلاق بعضها قبل إنشاء تذكرة جديدة.`,
    };
  }

  // تحديد الأولوية التلقائية حسب النوع
  let priority = input.priority;
  if (!priority) {
    const autoPriority: Record<TicketCategory, TicketPriority> = {
      complaint: 'high',
      technical: 'high',
      question: 'medium',
      suggestion: 'low',
    };
    priority = autoPriority[input.category];
  }

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      user_id: userId,
      user_role: userRole,
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority,
      status: 'open',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[createTicket] Insert error:', error.code, error.message);
    return { success: false, error: translateSupabaseError(error.message) };
  }

  await logAudit({
    actorId: userId,
    action: 'create_ticket',
    targetType: 'ticket',
    targetId: data.id,
    targetName: input.subject,
    metadata: { category: input.category, priority },
  });

  revalidatePath('/support');
  return { success: true, ticketId: data.id };
}

/**
 * تحديث حالة التذكرة أو التخصيص.
 */
export async function updateTicket(
  actorId: string,
  ticketId: string,
  updates: {
    status?: TicketStatus;
    assignedTo?: string | null;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('support_tickets')
      .select('subject, status, assigned_to')
      .eq('id', ticketId)
      .single();

    if (fetchErr || !existing) {
      return { success: false, error: 'التذكرة غير موجودة.' };
    }

    // منع الانتقالات غير المسموح بها (مثلًا الرجوع إلى «جديد»، أو تغيير حالة نهائية).
    if (updates.status && updates.status !== existing.status) {
      if (!canTransitionTicket(existing.status as TicketStatus, updates.status)) {
        return { success: false, error: 'لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية.' };
      }
    }

    const update: Record<string, any> = {};
    if (updates.status) update.status = updates.status;
    if (updates.assignedTo !== undefined) update.assigned_to = updates.assignedTo;

    if (Object.keys(update).length === 0) {
      return { success: false, error: 'لا توجد تحديثات.' };
    }

    const { error } = await supabaseAdmin
      .from('support_tickets')
      .update(update)
      .eq('id', ticketId);

    if (error) return { success: false, error: translateSupabaseError(error.message) };

    await logAudit({
      actorId,
      action: 'update_ticket',
      targetType: 'ticket',
      targetId: ticketId,
      targetName: existing.subject,
      metadata: {
        statusChanged: updates.status ? { from: existing.status, to: updates.status } : undefined,
        assignedChanged: updates.assignedTo !== undefined,
      },
    });

    revalidatePath('/support');
    revalidatePath(`/support/${ticketId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ غير متوقع.' };
  }
}

/**
 * إرسال رسالة في التذكرة.
 */
export async function sendMessage(
  senderId: string,
  senderRole: UserType,
  ticketId: string,
  message: string,
  isInternal: boolean = false,
): Promise<{ success: boolean; error?: string }> {
  if (!message.trim()) return { success: false, error: 'الرسالة فارغة.' };

  try {
    // التحقق من وجود التذكرة
    const { data: ticket, error: fetchErr } = await supabaseAdmin
      .from('support_tickets')
      .select('id, subject, user_id, status')
      .eq('id', ticketId)
      .single();

    if (fetchErr || !ticket) {
      return { success: false, error: 'التذكرة غير موجودة.' };
    }

    // إرسال الرسالة
    const { error } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        sender_role: senderRole,
        message: message.trim(),
        is_internal: isInternal,
      });

    if (error) return { success: false, error: translateSupabaseError(error.message) };

    // التخصيص التلقائي + التقدّم (open⇒in_progress) + updated_at يتكفّل بها
    // trigger «on_ticket_message» في القاعدة (هجرة 0028) لتوحيد المنطق.
    revalidatePath(`/support/${ticketId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ غير متوقع.' };
  }
}

/**
 * إحصائيات التذاكر (للداشبورد).
 */
export async function getTicketStats(): Promise<TicketStats> {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('status');

  if (error || !data) {
    return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, cancelled: 0 };
  }

  return {
    total: data.length,
    open: data.filter((t) => t.status === 'open').length,
    inProgress: data.filter((t) => t.status === 'in_progress').length,
    resolved: data.filter((t) => t.status === 'resolved').length,
    closed: data.filter((t) => t.status === 'closed').length,
    cancelled: data.filter((t) => t.status === 'cancelled').length,
  };
}
