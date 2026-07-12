import 'server-only';

import { createSupabaseServiceClient } from '@amana/supabase-client';

/**
 * عميل service role — للخادم فقط.
 * استيراد 'server-only' يمنع حزمه ضمن أي bundle للعميل (خطأ وقت البناء إن حدث).
 * يُستدعى حصريًا من Server Actions / Route Handlers.
 */
export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  return createSupabaseServiceClient({ url, serviceRoleKey });
}
