import { supabase } from '@/lib/supabase';

/**
 * محادثة الرحلة (جهة الراكبة) — جدول ride_messages، RLS يقصر الوصول على طرفَي
 * الرحلة، وRealtime يُحدّث المحادثة فورًا (يُشترَك في الشاشة).
 */

export interface RideMessage {
  id: string;
  senderId: string;
  message: string;
  createdAt: string;
  /** هل الرسالة منّي (الراكبة)؟ */
  mine: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapMsg(m: any, myId: string): RideMessage {
  return {
    id: m.id,
    senderId: m.sender_id,
    message: m.message,
    createdAt: m.created_at,
    mine: m.sender_id === myId,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** رسائل الرحلة (الأقدم أولًا). */
export async function listRideMessages(rideId: string, myId: string): Promise<RideMessage[]> {
  const { data, error } = await supabase
    .from('ride_messages')
    .select('id, sender_id, message, created_at')
    .eq('ride_id', rideId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((m) => mapMsg(m, myId));
}

/** إرسال رسالة في محادثة الرحلة (من الراكبة). */
export async function sendRideMessage(
  rideId: string,
  userId: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('ride_messages').insert({
    ride_id: rideId,
    sender_id: userId,
    sender_role: 'passenger',
    message: message.trim(),
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
