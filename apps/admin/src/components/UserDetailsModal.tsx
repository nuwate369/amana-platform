'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  X, User, Car, Phone, Mail, Calendar, Star, Ban, Lock, UserCog,
  FileText, CreditCard, Navigation, ShieldCheck, ScrollText, Clock, MessageSquareQuote, ZoomIn,
} from 'lucide-react';
import { STAFF_TYPE_LABELS, STAFF_TYPE_COLORS } from '@amana/shared-types';
import { getUserDetails, type UserDetails } from '@/app/actions/details';
import { auditActionMeta } from '@/lib/audit-meta';

/**
 * نافذة تفاصيل المستخدم الموحّدة (راكبة/سائقة/موظف) — نمط «تفاصيل الفاتورة»:
 * عمود ملخّص في الجهة اليمنى (الهوية/التواصل/التواريخ/الحظر) والتفاصيل في
 * الجهة اليسرى:
 *  - راكبة/سائقة: بطاقة رأس + مركبة وKYC (سائقة) + آخر الرحلات + آخر التقييمات.
 *  - موظف: بطاقة رأس + حركاته المسجّلة في سجل النظام.
 * مكوّن واحد يُعاد استخدامه من السائقات والراكبات وفريق العمل.
 */

const RIDE_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  requested: { label: 'مطلوبة', className: 'bg-primary/10 text-primary' },
  matched: { label: 'مُسنَدة', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  accepted: { label: 'مقبولة', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  in_progress: { label: 'جارية', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  completed: { label: 'مكتملة', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  cancelled: { label: 'ملغاة', className: 'bg-destructive/10 text-destructive' },
};

const KYC_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  approved: { label: 'موثّقة', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  pending: { label: 'قيد المراجعة', className: 'bg-primary/10 text-primary' },
  rejected: { label: 'مرفوضة', className: 'bg-destructive/10 text-destructive' },
};

function fmtDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' as const } : {}),
  });
}

/** نجوم صغيرة للعرض السريع. */
function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          className={i <= value ? 'fill-primary text-primary' : 'text-border'}
        />
      ))}
    </span>
  );
}

/** بطاقة قسم في العمود الجانبي — قابلة لإعادة الاستخدام. */
function AsideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-xs font-semibold text-muted-foreground">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

/** سطر معلومة (أيقونة + تسمية + قيمة) — قابل لإعادة الاستخدام. */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        <Icon size={14} />
        {label}
      </span>
      <span className="font-medium text-foreground text-left break-all">{value ?? '—'}</span>
    </div>
  );
}

/** رأس قسم داخل بطاقة التفاصيل. */
function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof Star;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-5 py-3">
      <Icon size={15} className="text-primary" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {count !== undefined && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
          {count}
        </span>
      )}
    </div>
  );
}

export type DetailsKind = 'driver' | 'passenger' | 'staff';

const KIND_META: Record<DetailsKind, { title: string; aside: string; sinceLabel: string; icon: typeof User }> = {
  driver: { title: 'تفاصيل السائقة', aside: 'السائقة', sinceLabel: 'سائقة', icon: Car },
  passenger: { title: 'تفاصيل الراكبة', aside: 'الراكبة', sinceLabel: 'عميلة', icon: User },
  staff: { title: 'تفاصيل الموظف', aside: 'الموظف', sinceLabel: 'موظف', icon: UserCog },
};

export interface UserDetailsModalProps {
  /** معرّف المستخدم المطلوب عرضه — null يعني مغلقة. */
  userId: string | null;
  /** نوع السياق للعناوين. */
  kind: DetailsKind;
  onClose: () => void;
}

export function UserDetailsModal({ userId, kind, onClose }: UserDetailsModalProps) {
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setDetails(null); return; }
    let alive = true;
    setLoading(true);
    getUserDetails(userId)
      .then((d) => { if (alive) setDetails(d); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  if (!userId) return null;

  const meta = KIND_META[kind];
  const isStaff = kind === 'staff';
  const HeadIcon = meta.icon;
  const kyc = details?.driver ? KYC_STATUS_LABELS[details.driver.status] : null;
  const roleBadge =
    isStaff && details?.userType ? STAFF_TYPE_LABELS[details.userType] ?? details.userType : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 border border-border flex flex-col">
        {/* الرأس */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-xl font-bold text-foreground">{meta.title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* الجسم */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !details ? (
            <div className="flex h-64 items-center justify-center gap-3 text-muted-foreground">
              {loading ? (
                <>
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  جارٍ تحميل التفاصيل…
                </>
              ) : (
                'تعذّر تحميل البيانات'
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5 lg:flex-row">
              {/* ===== العمود الجانبي (يمين في RTL) ===== */}
              <aside className="w-full shrink-0 space-y-4 lg:w-72">
                <AsideCard title={meta.aside}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {details.fullName?.trim()?.charAt(0) || <User size={18} />}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                        {details.isProtected && <Lock size={13} className="text-amber-500" />}
                        {details.fullName ?? '—'}
                        {details.isActive ? (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {isStaff ? 'نشط' : 'نشطة'}
                          </span>
                        ) : (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                            {isStaff ? 'معطّل' : 'محظورة'}
                          </span>
                        )}
                        {kyc && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${kyc.className}`}>
                            {kyc.label}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {meta.sinceLabel} منذ {fmtDate(details.createdAt)}
                      </p>
                      {!isStaff && (
                        details.stats.avgRating !== null ? (
                          <p className="flex items-center gap-1 text-sm font-bold text-foreground mt-1.5 w-fit">
                            {details.stats.avgRating}
                            <Star size={13} className="fill-primary text-primary" />
                            <span className="text-xs font-normal text-muted-foreground mr-1">
                              ({details.stats.ratingsCount} تقييم)
                            </span>
                          </p>
                        ) : (
                          <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground mt-1.5 w-fit">
                            <Star size={12} className="text-muted-foreground/50" />
                            لا توجد تقييمات بعد
                          </p>
                        )
                      )}
                    </div>
                  </div>
                  <div className="pt-3 mt-1 border-t border-border space-y-2.5">
                    {roleBadge && details.userType && (
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <ShieldCheck size={14} />
                          الدور
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAFF_TYPE_COLORS[details.userType] ?? 'bg-muted text-foreground'}`}>
                          {roleBadge}
                        </span>
                      </div>
                    )}
                    <InfoRow icon={Phone} label="الجوال" value={details.phone ?? '—'} />
                    <InfoRow icon={Mail} label="البريد" value={details.email ?? '—'} />
                    {isStaff ? (
                      <>
                        <InfoRow icon={ScrollText} label="حركات مسجّلة" value={`${details.stats.auditTotal}`} />
                      </>
                    ) : (
                      <>
                        <InfoRow icon={Navigation} label="إجمالي الرحلات" value={`${details.stats.ridesTotal} رحلة`} />
                        <InfoRow
                          icon={CreditCard}
                          label={kind === 'driver' ? 'إجمالي الأرباح' : 'إجمالي الإنفاق'}
                          value={`${details.stats.amountTotal.toFixed(2)} SAR`}
                        />
                      </>
                    )}
                  </div>
                </AsideCard>

                <AsideCard title="التواريخ">
                  <InfoRow icon={Calendar} label="تاريخ الانضمام" value={fmtDate(details.createdAt, true)} />
                  <InfoRow icon={Clock} label="آخر دخول" value={fmtDate(details.lastSignInAt, true)} />
                  {details.bannedAt && (
                    <InfoRow icon={Ban} label={isStaff ? 'تاريخ التعطيل' : 'تاريخ الحظر'} value={fmtDate(details.bannedAt, true)} />
                  )}
                </AsideCard>

                {!details.isActive && (
                  <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300">
                      <Ban size={13} />
                      {isStaff ? 'حساب معطّل' : 'حساب محظور'}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-red-800 dark:text-red-200">
                        <span className="text-red-600 dark:text-red-400">السبب: </span>
                        {details.banReason ?? '—'}
                      </p>
                      <p className="text-red-800 dark:text-red-200">
                        <span className="text-red-600 dark:text-red-400">بواسطة: </span>
                        {details.bannedByName ?? '—'}
                      </p>
                    </div>
                  </div>
                )}
              </aside>

              {/* ===== التفاصيل (يسار في RTL) ===== */}
              <main className="flex-1 space-y-4 min-w-0">

                {/* المركبة والمستندات — للسائقة فقط */}
                {details.driver && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ShieldCheck size={16} className="text-primary" />
                      المركبة ومستندات KYC
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <InfoRow
                        icon={Car}
                        label="المركبة"
                        value={
                          [details.driver.vehicleMake, details.driver.vehicleModel]
                            .filter(Boolean)
                            .join(' ') || '—'
                        }
                      />
                      <InfoRow icon={CreditCard} label="اللوحة" value={details.driver.vehiclePlate ?? '—'} />
                    </div>
                    {/* معاينة المستندات المرفوعة — اضغط الصورة لفتحها بالحجم الكامل */}
                    <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">
                      المستندات المرفوعة (اضغط للتكبير)
                    </p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { label: 'الهوية الوطنية', url: details.driver.nationalIdUrl },
                        { label: 'رخصة القيادة', url: details.driver.licenseUrl },
                        { label: 'استمارة المركبة', url: details.driver.vehicleRegistrationUrl },
                      ].map((doc) => (
                        <div key={doc.label} className="flex flex-col gap-1.5">
                          {doc.url ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative block aspect-[3/4] overflow-hidden rounded-lg border border-border bg-muted"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={doc.url}
                                alt={doc.label}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                                <ZoomIn size={22} />
                              </span>
                            </a>
                          ) : (
                            <div className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground">
                              <FileText size={18} />
                              <span className="text-[10px]">غير مرفوعة</span>
                            </div>
                          )}
                          <span className="text-center text-[11px] font-medium text-foreground">
                            {doc.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isStaff ? (
                  /* حركات الموظف في سجل النظام */
                  <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <SectionHeader icon={ScrollText} title="آخر الحركات في سجل النظام" count={details.recentAudit.length} />
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2.5 font-medium">الحركة</th>
                            <th className="px-4 py-2.5 font-medium">الهدف</th>
                            <th className="px-4 py-2.5 font-medium">السبب</th>
                            <th className="px-4 py-2.5 font-medium">الوقت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {details.recentAudit.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                                لا توجد حركات مسجّلة لهذا الموظف
                              </td>
                            </tr>
                          ) : (
                            details.recentAudit.map((a) => {
                              const am = auditActionMeta(a.action);
                              const ActionIcon = am.icon;
                              return (
                                <tr key={a.id} className="text-foreground">
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${am.className}`}>
                                      <ActionIcon size={13} />
                                      {am.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">{a.targetName ?? '—'}</td>
                                  <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate" title={a.reason ?? undefined}>
                                    {a.reason ?? '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                                    {fmtDate(a.createdAt, true)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* آخر الرحلات — على نمط «بنود الفاتورة» */}
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                      <SectionHeader icon={Navigation} title="آخر الرحلات" count={details.recentRides.length} />
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                          <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                              <th className="px-4 py-2.5 font-medium">#</th>
                              <th className="px-4 py-2.5 font-medium">من</th>
                              <th className="px-4 py-2.5 font-medium">إلى</th>
                              <th className="px-4 py-2.5 font-medium">الحالة</th>
                              <th className="px-4 py-2.5 font-medium">المبلغ</th>
                              <th className="px-4 py-2.5 font-medium">التاريخ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {details.recentRides.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                                  لا توجد رحلات بعد
                                </td>
                              </tr>
                            ) : (
                              details.recentRides.map((r, i) => {
                                const s = RIDE_STATUS_LABELS[r.status] ?? {
                                  label: r.status,
                                  className: 'bg-muted text-muted-foreground',
                                };
                                return (
                                  <tr key={r.id} className="text-foreground">
                                    <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                                    <td className="px-4 py-2.5">{r.pickup ?? '—'}</td>
                                    <td className="px-4 py-2.5">{r.dropoff ?? '—'}</td>
                                    <td className="px-4 py-2.5">
                                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
                                        {s.label}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 font-medium">
                                      {r.price !== null ? `${Number(r.price).toFixed(2)}` : '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                                      {fmtDate(r.requestedAt, true)}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* آخر التقييمات المستلمة */}
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                      <SectionHeader
                        icon={MessageSquareQuote}
                        title="آخر التقييمات المستلمة"
                        count={details.stats.ratingsCount}
                      />
                      {details.recentRatings.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                          لا توجد تقييمات بعد
                        </p>
                      ) : (
                        <div className="divide-y divide-border">
                          {details.recentRatings.map((r) => (
                            <div key={r.id} className="flex items-start justify-between gap-4 px-5 py-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground text-sm">
                                    {r.raterName ?? '—'}
                                  </span>
                                  <Stars value={r.stars} />
                                </div>
                                {r.comment && (
                                  <p className="mt-1 text-sm text-muted-foreground">«{r.comment}»</p>
                                )}
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                                {fmtDate(r.createdAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </main>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
