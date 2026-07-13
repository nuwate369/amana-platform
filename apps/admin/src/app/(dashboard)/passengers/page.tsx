'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, User } from 'lucide-react';
import { listPassengers, type ProfileRow } from '@/app/actions/admin';

/**
 * صفحة إدارة الراكبات — بيانات حقيقية (Supabase)، هوية أنثراسايت + ذهبي، RTL، دعم الوضع الداكن.
 */

export default function PassengersPage() {
  const [passengers, setPassengers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listPassengers();
        if (alive) setPassengers(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    const q = query.trim();
    if (!q) return passengers;
    return passengers.filter(
      (p) => (p.fullName ?? '').includes(q) || (p.phone ?? '').includes(q),
    );
  }, [passengers, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">إدارة الراكبات</h1>
        <p className="text-sm text-muted-foreground">
          قائمة الراكبات المسجّلات في المنصّة ونشاطهنّ
        </p>
      </div>

      {/* البحث */}
      <div className="relative max-w-md">
        <Search
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحثي بالاسم أو رقم الجوال…"
          className="w-full rounded-lg border border-border bg-background py-2.5 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* جدول الراكبات */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">الاسم</th>
                <th className="px-5 py-3 font-medium">الجوال</th>
                <th className="px-5 py-3 font-medium">عدد الرحلات</th>
                <th className="px-5 py-3 font-medium">تاريخ الانضمام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                    جارٍ التحميل…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id} className="text-foreground hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <User size={15} />
                        </span>
                        <span className="font-medium text-foreground">
                          {p.fullName ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">
                      {p.phone ?? '—'}
                    </td>
                    <td className="px-5 py-3">—</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString('ar-SA')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
