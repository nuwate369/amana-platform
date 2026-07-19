import { createClient, type User } from '@supabase/supabase-js';

/**
 * أدوات الذكاء الاصطناعي (Groq) — تعمل على الخادم فقط (مسارات API على Vercel).
 * المفتاح `GROQ_API_KEY` سرّيّ ولا يُرسَل للعميل إطلاقًا. تُستدعى هذه الأدوات من
 * `/api/ai/*` بعد التحقّق من هوية المستخدم (JWT) وحدّ المعدّل.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** استدعاء Groq (متوافق مع OpenAI). يرمي عند الفشل. */
export async function groqChat(
  messages: ChatMessage[],
  opts: { json?: boolean; temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY غير مضبوط على الخادم.');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 800,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Groq ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

/** يقرأ JSON من ردّ النموذج بأمان (يعيد null إن فشل التحليل). */
export function safeJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // بعض النماذج تلفّ JSON بنصّ — نحاول استخراج أول كتلة {...}.
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        /* تجاهل */
      }
    }
    return null;
  }
}

/** يتحقّق من هوية المستخدم من رأس Authorization: Bearer <supabase-jwt>. */
export async function getUserFromRequest(req: Request): Promise<User | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const sb = createClient(url, anon);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/**
 * حدّ معدّل بسيط لكل مستخدم (في الذاكرة — أفضل جهد، قد لا يتزامن عبر نسخ Vercel).
 * كافٍ لمرحلة التجربة لمنع الإساءة الجسيمة؛ يُقسّى لاحقًا بجدول/Redis إن لزم.
 */
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(userId: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(userId);
  if (!b || now > b.reset) {
    buckets.set(userId, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}
