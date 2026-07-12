/**
 * عميل Supabase موحّد لمنصة أمانة.
 *
 * فصل الأمان المهم:
 *  - `createSupabaseClient` يستخدم المفتاح العام (anon key) ويُستعمل في
 *    التطبيقات الثلاثة (راكبة / سائقة / إدارة) على العميل.
 *  - `createSupabaseServiceClient` يستخدم مفتاح service role ويجب ألّا
 *    يُستدعى إلا داخل Server Actions في مشروع admin (بيئة الخادم فقط).
 *    ممنوع منعًا باتًا استيراده في أي كود يصل للمتصفح/الجهاز.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type { SupabaseClient } from '@supabase/supabase-js';

/**
 * الحد الأدنى المتوافق مع واجهة تخزين الجلسة لدى Supabase
 * (متوافق مع AsyncStorage في React Native و localStorage في الويب).
 */
export interface SupabaseSessionStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export interface AnonClientConfig {
  /** رابط مشروع Supabase (متغيّر بيئي عام). */
  url: string;
  /** المفتاح العام anon (متغيّر بيئي عام — آمن على العميل). */
  anonKey: string;
  /**
   * مخزّن الجلسة. في الويب اتركه فارغًا (localStorage افتراضيًا).
   * في React Native مرّر AsyncStorage.
   */
  storage?: SupabaseSessionStorage;
  /** هل تُدار الجلسة تلقائيًا (true للتطبيقات، قد نعطّلها في بيئات الخادم). */
  persistSession?: boolean;
  /** استخراج رمز الدخول من رابط الإعادة (مطلوب للويب في تأكيد البريد). */
  detectSessionInUrl?: boolean;
}

/**
 * ينشئ عميل Supabase عامًا (anon). يُستخدم في كل التطبيقات على جهة العميل.
 */
export function createSupabaseClient(config: AnonClientConfig): SupabaseClient {
  const { url, anonKey, storage, persistSession = true, detectSessionInUrl = false } = config;

  if (!url || !anonKey) {
    throw new Error('[supabase-client] يجب تمرير url و anonKey.');
  }

  return createClient(url, anonKey, {
    auth: {
      storage,
      persistSession,
      autoRefreshToken: true,
      detectSessionInUrl,
    },
  });
}

export interface ServiceClientConfig {
  url: string;
  /** مفتاح service role — سري، للخادم فقط. */
  serviceRoleKey: string;
}

/**
 * ينشئ عميلًا بصلاحيات service role. للخادم فقط (Server Actions في admin).
 * يرمي خطأً إن استُدعي في بيئة متصفح لتقليل خطر التسريب.
 */
export function createSupabaseServiceClient(config: ServiceClientConfig): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error(
      '[supabase-client] createSupabaseServiceClient لا يجوز استدعاؤه على العميل/المتصفح.',
    );
  }

  const { url, serviceRoleKey } = config;
  if (!url || !serviceRoleKey) {
    throw new Error('[supabase-client] يجب تمرير url و serviceRoleKey.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
