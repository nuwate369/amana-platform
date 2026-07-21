import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import type { RideDetail } from './ride-details';

/**
 * عرض تفاصيل رحلة — مكوّن واحد للطرفين.
 *
 * الفارق بينهما هو المنظور لا البيانات: الراكبة ترى سائقتها ومركبتها،
 * والسائقة ترى راكبتها. أمّا السجلّ الزمني والأجرة والتسوية فواحدة — ولو
 * اختلفت لظهرت رحلة برواية مختلفة عند كل طرف، وهو أسوأ ما يقع في نزاع.
 */

export interface RideDetailViewProps {
  ride: RideDetail | null;
  loading: boolean;
  /** منظور العرض — يحدّد الطرف المقابل الذي يُعرض. */
  perspective: 'passenger' | 'driver';
  accent: string;
}

const STATUS_UI: Record<string, { label: string; icon: keyof typeof MaterialIcons.glyphMap; tone: string }> = {
  requested: { label: 'قيد البحث', icon: 'search', tone: '#6B7280' },
  matched: { label: 'سائقة في الطريق', icon: 'directions-car', tone: '#2563EB' },
  arrived: { label: 'وصلت السائقة', icon: 'place', tone: '#2563EB' },
  in_progress: { label: 'جارية', icon: 'navigation', tone: '#D97706' },
  completed: { label: 'مكتملة', icon: 'check-circle', tone: '#059669' },
  cancelled: { label: 'ملغاة', icon: 'cancel', tone: '#DC2626' },
  no_show: { label: 'لم يتمّ اللقاء', icon: 'person-off', tone: '#DC2626' },
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'نقدًا',
  card: 'بطاقة',
  demo_card: 'بطاقة (تجريبي)',
};

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-5 rounded-2xl bg-white p-4 dark:bg-neutral-800">
      <Text className="mb-3 font-plex-bold text-sm text-neutral-900 dark:text-neutral-50">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between border-b border-neutral-100 py-2.5 last:border-0 dark:border-neutral-700">
      <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text
        className={`font-plex${strong ? '-bold' : '-medium'} text-sm text-neutral-900 dark:text-neutral-50`}
      >
        {value}
      </Text>
    </View>
  );
}

export function RideDetailView({ ride, loading, perspective, accent }: RideDetailViewProps) {
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (!ride) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <MaterialIcons name="error-outline" size={44} color="#9CA3AF" />
        <Text className="text-center font-plex text-sm text-neutral-500 dark:text-neutral-400">
          تعذّر العثور على هذه الرحلة.
        </Text>
      </View>
    );
  }

  const status = STATUS_UI[ride.status] ?? {
    label: ride.status,
    icon: 'help-outline' as const,
    tone: '#6B7280',
  };
  // الرحلة الملغاة لا أجرة لها. عرض التقدير عليها يوحي بخصم لم يقع —
  // وهو أسوأ لبس ممكن في شاشة مالية.
  const settled = ride.status !== 'cancelled' && ride.status !== 'no_show';
  const fare = settled ? (ride.fareTotal ?? ride.priceEstimate) : null;
  const counterpart = perspective === 'passenger' ? ride.driverName : ride.passengerName;
  const counterpartLabel = perspective === 'passenger' ? 'السائقة' : 'الراكبة';

  return (
    <ScrollView
      className="flex-1 px-4"
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* الحالة والأجرة */}
      <View className="items-center rounded-2xl bg-white p-5 dark:bg-neutral-800">
        <View
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: `${status.tone}1A` }}
        >
          <MaterialIcons name={status.icon} size={28} color={status.tone} />
        </View>
        <Text className="mt-3 font-plex-bold text-lg" style={{ color: status.tone }}>
          {status.label}
        </Text>
        {fare != null ? (
          <Text className="mt-1 font-plex-bold text-3xl text-neutral-900 dark:text-neutral-50">
            {fare} <Text className="text-base">ر.س</Text>
          </Text>
        ) : (
          <Text className="mt-1 font-plex-medium text-base text-neutral-500 dark:text-neutral-400">
            لم تُحتسب أجرة
          </Text>
        )}
        <Text className="mt-1 font-plex text-xs text-neutral-400">
          {fmtDate(ride.timeline[0]?.at ?? null)}
        </Text>

        {ride.cancelReason && (
          <View className="mt-3 w-full rounded-xl bg-red-50 px-3 py-2 dark:bg-red-900/20">
            <Text className="text-center font-plex text-xs text-red-700 dark:text-red-300">
              {ride.cancelReason}
            </Text>
          </View>
        )}
      </View>

      {/* المسار */}
      <Section title="المسار">
        <View className="flex-row items-start gap-3">
          <View className="items-center pt-1">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
            <View className="my-1 h-8 w-px bg-neutral-300 dark:bg-neutral-600" />
            <View className="h-2.5 w-2.5 rounded-full border-2 border-neutral-400" />
          </View>
          <View className="flex-1 gap-5">
            <Text className="font-plex-medium text-sm text-neutral-900 dark:text-neutral-50">
              {ride.pickupAddress ?? 'نقطة الانطلاق'}
            </Text>
            <Text className="font-plex-medium text-sm text-neutral-900 dark:text-neutral-50">
              {ride.dropoffAddress ?? (ride.dropoff ? 'الوجهة' : 'بدون وجهة محدّدة')}
            </Text>
          </View>
        </View>
      </Section>

      {/* السجلّ الزمني — الفارق بين كل خطوة يكشف أين ضاع الوقت */}
      <Section title="السجلّ الزمني">
        {ride.timeline.map((step, i) => (
          <View key={step.key} className="flex-row items-center gap-3 py-2">
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: i === ride.timeline.length - 1 ? accent : '#D1D5DB' }}
            />
            <Text className="flex-1 font-plex text-sm text-neutral-700 dark:text-neutral-200">
              {step.label}
            </Text>
            {step.gapMinutes != null && step.gapMinutes > 0 && (
              <Text className="font-plex text-[11px] text-neutral-400">
                +{step.gapMinutes} د
              </Text>
            )}
            <Text className="font-plex-medium text-sm text-neutral-900 dark:text-neutral-50">
              {fmtTime(step.at)}
            </Text>
          </View>
        ))}
        {ride.durationMinutes != null && (
          <View className="mt-2 border-t border-neutral-100 pt-2.5 dark:border-neutral-700">
            <Row label="مدّة الرحلة" value={`${ride.durationMinutes} دقيقة`} strong />
          </View>
        )}
      </Section>

      {/* الطرف الآخر */}
      {counterpart && (
        <Section title={counterpartLabel}>
          <Row label="الاسم" value={counterpart} strong />
          {perspective === 'passenger' && ride.driverVehicle && (
            <Row label="المركبة" value={ride.driverVehicle} />
          )}
          {perspective === 'passenger' && ride.driverPlate && (
            <Row label="اللوحة" value={ride.driverPlate} />
          )}
        </Section>
      )}

      {/* التسوية المالية — كل ريال مبيَّن مصدره */}
      {(ride.paymentMethod || ride.walletApplied) && (
        <Section title="الدفع">
          {fare != null && <Row label="الأجرة" value={`${fare} ر.س`} />}
          {ride.walletApplied != null && ride.walletApplied > 0 && (
            <Row label="خُصم من الرصيد" value={`${ride.walletApplied} ر.س`} />
          )}
          {ride.cashReceived != null && (
            <Row label="المبلغ المستلم نقدًا" value={`${ride.cashReceived} ر.س`} />
          )}
          {ride.settlementDiff != null && ride.settlementDiff !== 0 && (
            <Row
              label={ride.settlementDiff > 0 ? 'أُضيف لرصيدك' : 'فرق التسوية'}
              value={`${Math.abs(ride.settlementDiff)} ر.س`}
            />
          )}
          {ride.paymentMethod && (
            <Row
              label="طريقة الدفع"
              value={PAYMENT_LABEL[ride.paymentMethod] ?? ride.paymentMethod}
              strong
            />
          )}
        </Section>
      )}

      <Text className="mt-5 text-center font-plex text-[11px] text-neutral-400">
        رقم الرحلة {ride.id.slice(0, 8)}
      </Text>
    </ScrollView>
  );
}
