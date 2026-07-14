import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/toast';
import { KYC_DOCS, pickAndUploadKycDocument, submitKycForReview, type KycDocKey } from '@/lib/kyc';

/**
 * شاشة «تحقّق من الهوية» (رفع مستندات KYC) — متصلة فعليًا بـ Supabase Storage.
 * كل مستند يُرفع فور اختياره إلى bucket `kyc-documents` ويُحفظ مساره في صف
 * السائقة. زر «إرسال للتدقيق» يُفعَّل بعد رفع المستندات الثلاثة، فيضبط الحالة
 * إلى pending وتتكفّل بوابة التوجيه بنقلها لشاشة «قيد المراجعة».
 */
export default function KycScreen() {
  const { user, driver, refreshDriver, signOut } = useAuth();

  // الحالة المحلية لرفع المستندات (تُهيّأ مما رُفع سابقًا في صف السائقة).
  const [uploaded, setUploaded] = useState<Record<string, boolean>>(() => ({
    national_id: Boolean(driver?.national_id_url),
    license: Boolean(driver?.license_url),
    vehicle_registration: Boolean(driver?.vehicle_registration_url),
  }));
  const [busyKey, setBusyKey] = useState<KycDocKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const wasRejected = driver?.status === 'rejected';
  const allUploaded = KYC_DOCS.every((d) => uploaded[d.key]);
  const uploadedCount = KYC_DOCS.filter((d) => uploaded[d.key]).length;

  async function onPick(doc: { key: KycDocKey; column: (typeof KYC_DOCS)[number]['column'] }) {
    if (!user) return;
    setBusyKey(doc.key);
    const res = await pickAndUploadKycDocument(user.id, doc);
    setBusyKey(null);
    if (res.status === 'uploaded') {
      setUploaded((prev) => ({ ...prev, [doc.key]: true }));
      notify.success('تم رفع المستند بنجاح');
    } else if (res.status === 'error') {
      notify.error(res.message);
    }
  }

  async function onSubmit() {
    if (!user || !allUploaded) return;
    setSubmitting(true);
    const res = await submitKycForReview(user.id);
    if (!res.ok) {
      setSubmitting(false);
      notify.error(res.message ?? 'تعذّر الإرسال، حاول مرة أخرى.');
      return;
    }
    // تحديث سياق المصادقة ⇐ تنقل البوابة السائقة تلقائيًا لشاشة «قيد المراجعة».
    await refreshDriver();
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
        <Pressable
          onPress={signOut}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="logout" size={22} color={driverNavy[500]} />
        </Pressable>
        <Text className="font-plex-bold text-2xl text-brand-700 dark:text-brand-200">أمانة</Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Text className="mb-2 font-plex-bold text-3xl text-brand-700 dark:text-brand-100">
            تحقّق من الهوية
          </Text>
          <Text className="font-plex text-base leading-6 text-neutral-500 dark:text-neutral-400">
            يرجى تحميل المستندات المطلوبة لتفعيل حسابك كشريكة سائقة في أمانة.
          </Text>
        </View>

        {/* تنبيه الرفض السابق */}
        {wasRejected ? (
          <View className="mb-6 flex-row items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <MaterialIcons name="error-outline" size={24} color="#dc2626" />
            <Text className="flex-1 font-plex-medium text-sm leading-6 text-red-700 dark:text-red-300">
              تم رفض طلبك السابق. يرجى إعادة رفع المستندات بوضوح ثم الإرسال للتدقيق من جديد.
            </Text>
          </View>
        ) : null}

        {/* عدّاد التقدم */}
        <View className="mb-6">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
              اكتمال المستندات
            </Text>
            <Text className="font-plex-bold text-sm text-brand-700 dark:text-brand-200">
              {uploadedCount} / {KYC_DOCS.length}
            </Text>
          </View>
          <View className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <View
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${(uploadedCount / KYC_DOCS.length) * 100}%` }}
            />
          </View>
        </View>

        {/* قائمة المستندات */}
        <View className="gap-4">
          {KYC_DOCS.map((doc) => {
            const isUploaded = uploaded[doc.key];
            const isBusy = busyKey === doc.key;
            return (
              <View
                key={doc.key}
                className={`flex-row items-center justify-between rounded-xl border bg-white p-4 dark:bg-neutral-800 ${
                  isUploaded
                    ? 'border-neutral-200 dark:border-neutral-700'
                    : 'border-2 border-dashed border-brand-300 dark:border-brand-700'
                }`}
              >
                <View className="flex-1 flex-row items-center gap-4">
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-neutral-700">
                    <MaterialIcons name={doc.icon} size={26} color={driverNavy[700]} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-plex-semibold text-base text-neutral-900 dark:text-neutral-50">
                      {doc.label}
                    </Text>
                    <Text
                      className={`font-plex text-xs ${
                        isUploaded ? 'text-green-600' : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {isUploaded ? 'تم الرفع بنجاح' : doc.hint}
                    </Text>
                  </View>
                </View>

                {isUploaded ? (
                  <Pressable
                    onPress={() => onPick(doc)}
                    disabled={isBusy}
                    className="items-center gap-1"
                  >
                    {isBusy ? (
                      <ActivityIndicator color={driverNavy[600]} />
                    ) : (
                      <>
                        <MaterialIcons name="check-circle" size={26} color="#16a34a" />
                        <Text className="font-plex-medium text-[11px] text-brand-600">
                          إعادة الرفع
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => onPick(doc)}
                    disabled={isBusy}
                    className="h-10 min-w-[92px] flex-row items-center justify-center gap-1 rounded-lg bg-brand-700 px-4 active:scale-95"
                  >
                    {isBusy ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <MaterialIcons name="file-upload" size={16} color="#ffffff" />
                        <Text className="font-plex-medium text-sm text-white">رفع</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}

          {/* بطاقة نصيحة التصوير */}
          <LinearGradient
            colors={[driverNavy[800], driverNavy[600]]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ borderRadius: 16 }}
            className="mt-2 overflow-hidden p-6"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="mb-1 font-plex-semibold text-lg text-white">نصيحة التصوير</Text>
                <Text className="max-w-[85%] font-plex text-xs leading-5 text-white/80">
                  ضع المستند على سطح مستوٍ مع إضاءة جيدة وتجنّب الانعكاسات لضمان القبول السريع.
                </Text>
              </View>
              <MaterialIcons name="camera-enhance" size={64} color="rgba(255,255,255,0.25)" />
            </View>
          </LinearGradient>
        </View>

        {/* زر الإرسال */}
        <View className="mt-8">
          <Pressable
            onPress={onSubmit}
            disabled={!allUploaded || submitting}
            className={`h-14 flex-row items-center justify-center gap-3 rounded-xl ${
              allUploaded ? 'bg-brand-700 active:scale-[0.98] dark:bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text
                  className={`font-plex-semibold text-lg ${
                    allUploaded ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  إرسال للتدقيق
                </Text>
                <MaterialIcons
                  name="send"
                  size={20}
                  color={allUploaded ? '#ffffff' : '#9ca3af'}
                />
              </>
            )}
          </Pressable>
          <Text className="mt-4 px-6 text-center font-plex text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            بضغطك على إرسال، أنتِ توافقين على معالجة بياناتك وفقًا لسياسة الخصوصية الخاصة بأمانة.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
