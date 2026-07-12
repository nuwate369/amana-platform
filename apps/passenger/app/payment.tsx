import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «تفاصيل الدفع» — تحويل مطابق لتصميم Stitch
 * (Payment Details Screen, مشروع Amanah Mobility Platform)
 * مع مطابقة الألوان للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) مطابقة للتصميم — بلا منطق أعمال بعد.
 */

// صف في تفاصيل الفاتورة.
function InvoiceRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">{label}</Text>
      <Text className="font-plex text-sm text-neutral-900 dark:text-neutral-100">{value}</Text>
    </View>
  );
}

export default function PaymentScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={passengerPurple[700]} />
        </Pressable>
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">
          {t('payment.title')}
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* بطاقة الإجمالي بتدرّج لوني */}
        <LinearGradient
          colors={[passengerPurple[700], passengerPurple[500]]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ borderRadius: 16 }}
          className="mb-6 h-32 justify-center overflow-hidden px-4"
        >
          <Text className="font-plex-medium text-xs text-white/80">{t('payment.totalLabel')}</Text>
          <View className="flex-row items-baseline gap-1">
            <Text className="font-plex-semibold text-[26px] text-white">84.50</Text>
            <Text className="font-plex text-sm text-white">{t('payment.currency')}</Text>
          </View>
        </LinearGradient>

        {/* وسيلة الدفع */}
        <View className="mb-8">
          <Text className="mb-3 font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
            {t('payment.methodTitle')}
          </Text>

          {/* البطاقة النشطة */}
          <View className="mb-3 flex-row items-center gap-3 rounded-xl border-2 border-brand-600 bg-white p-4 dark:bg-neutral-800">
            <View className="h-8 w-12 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-700">
              <MaterialIcons name="credit-card" size={20} color={passengerPurple[700]} />
            </View>
            <View className="flex-1">
              <Text className="font-plex text-base text-neutral-900 dark:text-neutral-50">
                Visa •••• 9432
              </Text>
              <Text className="font-plex-medium text-xs text-neutral-400">
                {t('payment.defaultCard')}
              </Text>
            </View>
            <MaterialIcons name="check-circle" size={24} color={passengerPurple[600]} />
          </View>

          {/* إضافة بطاقة جديدة */}
          <Pressable className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-100 p-4 active:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800">
            <MaterialIcons name="add-card" size={20} color="#9ca3af" />
            <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
              {t('payment.addCard')}
            </Text>
          </Pressable>
        </View>

        {/* تفاصيل الفاتورة */}
        <View className="mb-8">
          <Text className="mb-3 font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
            {t('payment.invoiceTitle')}
          </Text>
          <View className="rounded-xl bg-white p-4 dark:bg-neutral-800">
            <View className="divide-y divide-neutral-100 dark:divide-neutral-700">
              <InvoiceRow label={t('payment.baseFare')} value={`15.00 ${t('payment.currency')}`} />
              <InvoiceRow label={t('payment.distance')} value={`58.48 ${t('payment.currency')}`} />
              <InvoiceRow label={t('payment.vat')} value={`11.02 ${t('payment.currency')}`} />
            </View>
            <View className="mt-2 flex-row items-center justify-between border-t border-brand-100 pt-4 dark:border-neutral-700">
              <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-300">
                {t('payment.total')}
              </Text>
              <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-300">
                84.50 {t('payment.currency')}
              </Text>
            </View>
          </View>
        </View>

        {/* شارة الأمان */}
        <View className="mb-4 flex-row items-center gap-2 rounded-lg bg-brand-50 p-4 dark:bg-brand-900/40">
          <MaterialIcons name="security" size={22} color={passengerPurple[600]} />
          <Text className="flex-1 font-plex-medium text-xs leading-5 text-neutral-600 dark:text-neutral-300">
            {t('payment.safety')}
          </Text>
        </View>
      </ScrollView>

      {/* زر التأكيد الثابت أسفل الشاشة */}
      <View className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-white px-5 pb-8 pt-4 dark:bg-neutral-800">
        <Pressable className="h-14 flex-row items-center justify-center gap-2 rounded-xl bg-brand-600 active:scale-[0.98]">
          <Text className="font-plex-semibold text-xl text-white">{t('payment.confirm')}</Text>
          <MaterialIcons name="payments" size={22} color="#ffffff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
