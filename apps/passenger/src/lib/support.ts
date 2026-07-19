import { supabase } from '@/lib/supabase';

/**
 * تذاكر الدعم الفني — جانب الراكبة. متصل فعليًا بجدولَي support_tickets
 * وticket_messages (RLS يسمح للراكبة برؤية/إنشاء تذاكرها ومراسلتها، وإلغائها
 * وتعبئة استبيانها عبر دوال SECURITY DEFINER). مطابق لجانب السائقة بدور 'passenger'.
 */

export type TicketCategory = 'complaint' | 'question' | 'suggestion' | 'technical';
/** 5 حالات: open(جديد) · in_progress(قيد العمل) · resolved(بانتظار الرد) · closed(منتهي) · cancelled(ملغي). */
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
export type TicketPriority = 'high' | 'medium' | 'low';

export interface Ticket {
  id: string;
  ticketNumber: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  // الاستبيان (يُرسَل عند الإغلاق، والإجابة اختيارية).
  surveySentAt: string | null;
  surveyRating: number | null;
  surveyComment: string | null;
  surveyAnsweredAt: string | null;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  createdAt: string;
  /** هل الرسالة منّي (الراكبة) أم من الدعم؟ */
  mine: boolean;
}

/** الحد الأقصى للتذاكر غير المُغلقة في آنٍ واحد. */
export const MAX_OPEN_TICKETS = 5;

/** الحالات التي تُعدّ «مفتوحة» (تحتسب ضمن الحدّ). */
const OPEN_STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved'];

const TICKET_COLUMNS =
  'id, ticket_number, subject, description, category, priority, status, created_at, updated_at, ' +
  'survey_sent_at, survey_rating, survey_comment, survey_answered_at';

/** أولوية افتراضية مشتقّة من نوع التذكرة. */
function priorityFor(category: TicketCategory): TicketPriority {
  if (category === 'complaint') return 'high';
  if (category === 'suggestion') return 'low';
  return 'medium';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapTicket(t: any): Ticket {
  return {
    id: t.id,
    ticketNumber: t.ticket_number ?? null,
    subject: t.subject,
    description: t.description,
    category: t.category as TicketCategory,
    priority: t.priority as TicketPriority,
    status: t.status as TicketStatus,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    surveySentAt: t.survey_sent_at ?? null,
    surveyRating: t.survey_rating ?? null,
    surveyComment: t.survey_comment ?? null,
    surveyAnsweredAt: t.survey_answered_at ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** قائمة تذاكري (الأحدث أولًا). */
export async function listMyTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(TICKET_COLUMNS)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapTicket);
}

/**
 * إنشاء تذكرة جديدة. يمنع التجاوز إن بلغت التذاكر غير المُغلقة الحدّ الأقصى.
 * يعيد كائنًا يصف النتيجة (لا يرمي).
 */
export async function createTicket(
  userId: string,
  values: { subject: string; category: TicketCategory; description: string },
): Promise<{ ok: boolean; message?: string; id?: string }> {
  // عدد التذاكر المفتوحة (open + in_progress + resolved) — دون المُغلقة/الملغاة.
  const { count } = await supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', OPEN_STATUSES);
  if ((count ?? 0) >= MAX_OPEN_TICKETS) {
    return { ok: false, message: `لا يمكن تجاوز ${MAX_OPEN_TICKETS} تذاكر مفتوحة في آنٍ واحد.` };
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
      user_role: 'passenger',
      subject: values.subject.trim(),
      description: values.description.trim(),
      category: values.category,
      priority: priorityFor(values.category),
    })
    .select('id')
    .single();
  if (error) return { ok: false, message: error.message };
  return { ok: true, id: data.id };
}

/** تذكرة واحدة بمعرّفها. */
export async function getTicket(ticketId: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(TICKET_COLUMNS)
    .eq('id', ticketId)
    .maybeSingle();
  if (error || !data) return null;
  return mapTicket(data);
}

/** رسائل تذكرة (بلا الرسائل الداخلية — RLS يخفيها عن الراكبة). */
export async function listMessages(ticketId: string, myId: string): Promise<TicketMessage[]> {
  const { data, error } = await supabase
    .from('ticket_messages')
    .select('id, ticket_id, sender_id, message, is_internal, created_at')
    .eq('ticket_id', ticketId)
    .eq('is_internal', false)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((m) => ({
    id: m.id,
    ticketId: m.ticket_id,
    senderId: m.sender_id,
    message: m.message,
    createdAt: m.created_at,
    mine: m.sender_id === myId,
  }));
}

/** إرسال رسالة داخل تذكرة (من الراكبة). */
export async function sendMessage(
  ticketId: string,
  userId: string,
  message: string,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: userId,
    sender_role: 'passenger',
    message: message.trim(),
    is_internal: false,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** إلغاء تذكرتي (عبر دالة SECURITY DEFINER — لا تُلغى المُغلقة). */
export async function cancelTicket(ticketId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.rpc('cancel_my_ticket', { p_ticket_id: ticketId });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** تعبئة استبيان الرضا (اختياري) بعد إغلاق التذكرة. */
export async function submitSurvey(
  ticketId: string,
  rating: number,
  comment: string,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.rpc('submit_ticket_survey', {
    p_ticket_id: ticketId,
    p_rating: rating,
    p_comment: comment,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * مساعد الدعم الذكيّ (Groq) — يُحاور الراكبة ويحاول حلّ مشكلتها، وإن تعذّر يُصعّدها
 * بإنشاء تذكرة فعلية (من جهة الخادم عبر service role). يُرسِل رمز جلسة Supabase
 * للتحقّق من الهوية. القاعدة والخادم على نفس مشروع Supabase.
 */
export interface AiSupportReply {
  reply: string;
  escalated: boolean;
  ticketNumber: string | null;
}

const ADMIN_API_URL = process.env.EXPO_PUBLIC_ADMIN_API_URL ?? '';

export async function askSupportAi(
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<{ ok: boolean; data?: AiSupportReply; error?: string }> {
  if (!ADMIN_API_URL) {
    return { ok: false, error: 'خدمة الدعم الذكيّ غير مُهيّأة (EXPO_PUBLIC_ADMIN_API_URL).' };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: 'انتهت الجلسة، سجّلي الدخول من جديد.' };

  try {
    const res = await fetch(`${ADMIN_API_URL}/api/ai/support`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) {
      if (res.status === 429) return { ok: false, error: 'أرسلتِ رسائل كثيرة بسرعة، انتظري قليلًا.' };
      return { ok: false, error: 'تعذّر الوصول لمساعد الدعم، حاولي لاحقًا.' };
    }
    const data = (await res.json()) as AiSupportReply;
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'تعذّر الاتصال بمساعد الدعم، تحقّقي من الإنترنت.' };
  }
}
