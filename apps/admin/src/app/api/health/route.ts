import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1. NEXT_PUBLIC_SUPABASE_URL
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  checks['NEXT_PUBLIC_SUPABASE_URL'] = {
    ok: !!url && url.startsWith('https://'),
    detail: url ? `${url.substring(0, 30)}...` : 'MISSING',
  };

  // 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  checks['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = {
    ok: !!anonKey && anonKey.length > 20,
    detail: anonKey ? `${anonKey.substring(0, 10)}...(${anonKey.length} chars)` : 'MISSING',
  };

  // 3. NEXT_PUBLIC_SITE_URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  checks['NEXT_PUBLIC_SITE_URL'] = {
    ok: !!siteUrl && siteUrl.startsWith('http'),
    detail: siteUrl || 'MISSING',
  };

  // 4. SUPABASE_SERVICE_ROLE_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  checks['SUPABASE_SERVICE_ROLE_KEY'] = {
    ok: !!serviceKey && serviceKey.length > 20,
    detail: serviceKey ? `${serviceKey.substring(0, 10)}...(${serviceKey.length} chars)` : 'MISSING',
  };

  // 5. Supabase Connection Test
  if (url && serviceKey) {
    try {
      const supabase = createClient(url, serviceKey);
      const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' });
      checks['supabase_connection'] = {
        ok: !error,
        detail: error ? error.message : 'Connected — profiles table reachable',
      };
    } catch (err: any) {
      checks['supabase_connection'] = { ok: false, detail: err.message };
    }
  } else {
    checks['supabase_connection'] = { ok: false, detail: 'Skipped — missing env vars' };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json({ status: allOk ? 'ALL OK' : 'ISSUES FOUND', checks }, {
    status: allOk ? 200 : 500,
  });
}
