import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/toast';
import { plateLettersToLatin } from '@amana/shared-types';
import { SearchableSelect } from '@/components/SearchableSelect';
import { CAR_MAKE_NAMES, manufactureYears, modelsForMake } from '@/lib/carData';
import {
  KYC_DOCS,
  pickAndUploadKycDocument,
  saveKycFields,
  submitKycForReview,
  type ImageSource,
  type KycDocKey,
  type KycFieldValues,
} from '@/lib/kyc';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = manufactureYears(CURRENT_YEAR);

// قواعد التحقّق: جوال سعودي (05 + 10 أرقام)، رقم هوية/إقامة (10 أرقام).
const SAUDI_PHONE_RE = /^05\d{8}$/;
const NATIONAL_ID_RE = /^\d{10}$/;
const PLATE_LETTERS_RE = /^[ء-ي]{1,3}$/; // حتى 3 أحرف عربية
const PLATE_DIGITS_RE = /^\d{1,4}$/; // حتى 4 أرقام

/** يفكّك لوحة مخزّنة «أحرف أرقام» إلى جزأيها لإعادة التعبئة. */
function parsePlate(plate: string): { letters: string; digits: string } {
  const letters = plate.match(/[ء-ي]+/)?.[0]?.slice(0, 3) ?? '';
  const digits = plate.match(/\d+/)?.[0]?.slice(0, 4) ?? '';
  return { letters, digits };
}

/**
 * شاشة «توثيق السائقة» (KYC) — نموذج ثلاثة أقسام متصل فعليًا بـ Supabase:
 *  1) بيانات شخصية: الجوال (05 + 10 أرقام → profiles.phone) ورقم الهوية/الإقامة (10 أرقام).
 *  2) بيانات المركبة: الشركة/الموديل (قوائم منسدلة بحث)، سنة الصنع (2015..الحالي)،
 *     رقم اللوحة (أحرف + أرقام منفصلة)، رقم الاستمارة.
 *  3) المستندات (صور): الهوية، الرخصة، الاستمارة، صورة السيارة — التقاط أو من المعرض.
 * الصور تُرفع لحظة اختيارها؛ زر «إرسال للتدقيق» يُفعَّل بعد اكتمال كل الحقول والصور.
 */
export default function KycScreen() {
  const { user, driver, refreshDriver, signOut } = useAuth();

  const initialPlate = parsePlate(driver?.vehicle_plate ?? '');

  // الحقول النصية — تُهيّأ مما حُفظ سابقًا (لإعادة التعبئة بعد رفض).
  const [values, setValues] = useState<KycFieldValues>(() => ({
    phone: '',
    nationalIdNumber: driver?.national_id_number ?? '',
    vehicleMake: driver?.vehicle_make ?? '',
    vehicleModel: driver?.vehicle_model ?? '',
    vehicleYear: driver?.vehicle_year ? String(driver.vehicle_year) : '',
    vehiclePlate: driver?.vehicle_plate ?? '',
    vehicleRegistrationNumber: driver?.vehicle_registration_number ?? '',
  }));
  const [plateLetters, setPlateLetters] = useState(initialPlate.letters);
  const [plateDigits, setPlateDigits] = useState(initialPlate.digits);

  // حالة رفع الصور (تُهيّأ مما رُفع سابقًا).
  const [uploaded, setUploaded] = useState<Record<string, boolean>>(() => ({
    national_id: Boolean(driver?.national_id_url),
    license: Boolean(driver?.license_url),
    vehicle_registration: Boolean(driver?.vehicle_registration_url),
    car_photo: Boolean(driver?.car_photo_url),
  }));
  const [busyKey, setBusyKey] = useState<KycDocKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // الحفظ التلقائي للحقول النصية (مسودّة) — يمنع ضياع ما أُدخِل قبل «إرسال للتدقيق».
  const dirtyRef = useRef(false);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const setField = (key: keyof KycFieldValues, text: string) => {
    dirtyRef.current = true;
    setValues((prev) => ({ ...prev, [key]: text }));
  };

  // جلب رقم الجوال من profiles لإعادة تعبئته (غير مخزّن في صف السائقة).
  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const phone = (data?.phone as string | null) ?? null;
        if (active && phone) setValues((prev) => (prev.phone ? prev : { ...prev, phone }));
      });
    return () => {
      active = false;
    };
  }, [user]);

  const wasRejected = driver?.status === 'rejected';

  // اختيار الشركة يصفّر الموديل.
  function onSelectMake(make: string) {
    dirtyRef.current = true;
    setValues((prev) => ({ ...prev, vehicleMake: make, vehicleModel: '' }));
  }

  // حفظ تلقائي للحقول النصية بعد توقّف الإدخال (مسودّة) — كالصور، فلا تضيع البيانات
  // حتى لو أُغلق التطبيق قبل الإرسال. لا يُغيّر حالة السائقة.
  useEffect(() => {
    if (!user || !dirtyRef.current) return;
    setDraftStatus('saving');
    const id = setTimeout(async () => {
      const res = await saveKycFields(user.id, values);
      setDraftStatus(res.ok ? 'saved' : 'idle');
    }, 1200);
    return () => clearTimeout(id);
  }, [values, user]);

  // تركيب اللوحة من الأحرف والأرقام في القيمة المخزّنة.
  function onPlateLetters(text: string) {
    const letters = text.replace(/[^ء-ي]/g, '').slice(0, 3);
    setPlateLetters(letters);
    setField('vehiclePlate', `${letters} ${plateDigits}`.trim());
  }
  function onPlateDigits(text: string) {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPlateDigits(digits);
    setField('vehiclePlate', `${plateLetters} ${digits}`.trim());
  }

  // ===== التحقّق من صحّة الحقول =====
  const phoneValid = SAUDI_PHONE_RE.test(values.phone);
  const nationalIdValid = NATIONAL_ID_RE.test(values.nationalIdNumber);
  const makeValid = values.vehicleMake.trim().length > 0;
  const modelValid = values.vehicleModel.trim().length > 0;
  const yearValid =
    /^\d{4}$/.test(values.vehicleYear) &&
    Number(values.vehicleYear) >= 2015 &&
    Number(values.vehicleYear) <= CURRENT_YEAR;
  const plateValid = PLATE_LETTERS_RE.test(plateLetters) && PLATE_DIGITS_RE.test(plateDigits);
  const regValid = values.vehicleRegistrationNumber.trim().length > 0;
  const textComplete =
    phoneValid && nationalIdValid && makeValid && modelValid && yearValid && plateValid && regValid;

  const allUploaded = KYC_DOCS.every((d) => uploaded[d.key]);
  const uploadedCount = KYC_DOCS.filter((d) => uploaded[d.key]).length;
  const canSubmit = textComplete && allUploaded;

  async function onPick(
    doc: { key: KycDocKey; column: (typeof KYC_DOCS)[number]['column'] },
    source: ImageSource,
  ) {
    if (!user) return;
    setBusyKey(doc.key);
    const res = await pickAndUploadKycDocument(user.id, doc, source);
    setBusyKey(null);
    if (res.status === 'uploaded') {
      setUploaded((prev) => ({ ...prev, [doc.key]: true }));
      notify.success('تم رفع الصورة بنجاح');
    } else if (res.status === 'error') {
      notify.error(res.message);
    }
  }

  // اختيار مصدر الصورة: كاميرا أو معرض.
  function chooseSource(doc: { key: KycDocKey; column: (typeof KYC_DOCS)[number]['column'] }) {
    Alert.alert(
      'صورة المستند',
      'اختاري مصدر الصورة',
      [
        { text: 'التقاط بالكاميرا', onPress: () => onPick(doc, 'camera') },
        { text: 'اختيار من المعرض', onPress: () => onPick(doc, 'library') },
        { text: 'إلغاء', style: 'cancel' },
      ],
      { cancelable: true },
    );
  }

  async function onSubmit() {
    if (!user || !canSubmit) return;
    setSubmitting(true);
    const res = await submitKycForReview(user.id, values);
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

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6">
            <Text className="mb-2 font-plex-bold text-3xl text-brand-700 dark:text-brand-100">
              توثيق الحساب
            </Text>
            <Text className="font-plex text-base leading-6 text-neutral-500 dark:text-neutral-400">
              أكملي بياناتك وحمّلي المستندات المطلوبة لتفعيل حسابك كشريكة سائقة في أمانة.
            </Text>
          </View>

          {/* تنبيه الرفض السابق + سبب الرفض من الإدارة (إن وُجد) */}
          {wasRejected ? (
            <View className="mb-6 flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <MaterialIcons name="error-outline" size={24} color="#dc2626" />
              <View className="flex-1">
                <Text className="font-plex-semibold text-sm leading-6 text-red-700 dark:text-red-300">
                  تم رفض طلبك السابق. يرجى مراجعة الملاحظة ثم إعادة الإرسال للتدقيق.
                </Text>
                {driver?.rejection_reason ? (
                  <View className="mt-2 rounded-lg bg-red-100 p-3 dark:bg-red-900/40">
                    <Text className="font-plex-medium text-xs text-red-600 dark:text-red-400">
                      ملاحظة الإدارة:
                    </Text>
                    <Text className="mt-0.5 font-plex text-sm leading-6 text-red-800 dark:text-red-200">
                      {driver.rejection_reason}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* ===== القسم 1: بيانات شخصية ===== */}
          <SectionTitle index={1} icon="person" title="بيانات شخصية" />
          <View className="mb-6 gap-4">
            <Field
              label="رقم الجوال"
              icon="phone"
              placeholder="05XXXXXXXX"
              value={values.phone}
              keyboardType="number-pad"
              maxLength={10}
              onChangeText={(t) => setField('phone', t.replace(/[^0-9]/g, '').slice(0, 10))}
              error={
                values.phone.length > 0 && !phoneValid
                  ? 'رقم سعودي يبدأ بـ 05 ويتكوّن من 10 أرقام'
                  : undefined
              }
            />
            <Field
              label="رقم الهوية / الإقامة"
              icon="badge"
              placeholder="10 أرقام"
              value={values.nationalIdNumber}
              keyboardType="number-pad"
              maxLength={10}
              onChangeText={(t) => setField('nationalIdNumber', t.replace(/[^0-9]/g, '').slice(0, 10))}
              error={
                values.nationalIdNumber.length > 0 && !nationalIdValid
                  ? 'رقم الهوية/الإقامة يتكوّن من 10 أرقام'
                  : undefined
              }
            />
          </View>

          {/* ===== القسم 2: بيانات المركبة ===== */}
          <SectionTitle index={2} icon="directions-car" title="بيانات المركبة" />
          <View className="mb-6 gap-4">
            <SearchableSelect
              label="الشركة الصانعة"
              icon="directions-car"
              placeholder="اختاري الشركة"
              value={values.vehicleMake}
              options={CAR_MAKE_NAMES}
              onSelect={onSelectMake}
            />
            <SearchableSelect
              label="الموديل"
              icon="directions-car"
              placeholder="اختاري الموديل"
              value={values.vehicleModel}
              options={modelsForMake(values.vehicleMake)}
              onSelect={(v) => setField('vehicleModel', v)}
              disabled={!makeValid}
              disabledHint="اختاري الشركة أولًا"
            />
            <SearchableSelect
              label="سنة الصنع"
              icon="event"
              placeholder="اختاري السنة"
              value={values.vehicleYear}
              options={YEAR_OPTIONS}
              onSelect={(v) => setField('vehicleYear', v)}
            />
            <PlateInput
              letters={plateLetters}
              digits={plateDigits}
              onLetters={onPlateLetters}
              onDigits={onPlateDigits}
              error={
                (plateLetters.length > 0 || plateDigits.length > 0) && !plateValid
                  ? 'أدخلي حتى 3 أحرف عربية وحتى 4 أرقام'
                  : undefined
              }
            />
            <Field
              label="رقم الاستمارة"
              icon="confirmation-number"
              placeholder="رقم الاستمارة"
              value={values.vehicleRegistrationNumber}
              onChangeText={(t) => setField('vehicleRegistrationNumber', t)}
            />
          </View>

          {/* ===== القسم 3: المستندات (صور) ===== */}
          <SectionTitle index={3} icon="folder" title="المستندات" />
          {/* عدّاد اكتمال الصور */}
          <View className="mb-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
                اكتمال الصور
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
                      onPress={() => chooseSource(doc)}
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
                      onPress={() => chooseSource(doc)}
                      disabled={isBusy}
                      className="h-10 min-w-[92px] flex-row items-center justify-center gap-1 rounded-lg bg-brand-700 px-4 active:scale-95"
                    >
                      {isBusy ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <>
                          <MaterialIcons name="add-a-photo" size={16} color="#ffffff" />
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
                    ضعي المستند على سطح مستوٍ مع إضاءة جيدة وتجنّبي الانعكاسات لضمان القبول السريع.
                  </Text>
                </View>
                <MaterialIcons name="camera-enhance" size={64} color="rgba(255,255,255,0.25)" />
              </View>
            </LinearGradient>
          </View>

          {/* مؤشّر الحفظ التلقائي — يطمئن السائقة أن بياناتها لا تضيع */}
          {draftStatus !== 'idle' ? (
            <View className="mt-6 flex-row items-center justify-center gap-1.5">
              {draftStatus === 'saving' ? (
                <>
                  <ActivityIndicator size="small" color={driverNavy[500]} />
                  <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                    جارٍ حفظ بياناتك…
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="cloud-done" size={16} color="#16a34a" />
                  <Text className="font-plex text-xs text-green-600">تم حفظ بياناتك تلقائيًا</Text>
                </>
              )}
            </View>
          ) : null}

          {/* زر الإرسال */}
          <View className="mt-6">
            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit || submitting}
              // active:scale ثابت دائمًا (لا يُبدَّل ديناميكيًّا) — تبديل صنف زائف بعد
              // أول رندر يُطلق تحذير css-interop الذي تنهار دالته stringify على New Arch.
              className={`h-14 flex-row items-center justify-center gap-3 rounded-xl active:scale-[0.98] ${
                canSubmit ? 'bg-brand-700 dark:bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text
                    className={`font-plex-semibold text-lg ${
                      canSubmit ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    إرسال للتدقيق
                  </Text>
                  <MaterialIcons name="send" size={20} color={canSubmit ? '#ffffff' : '#9ca3af'} />
                </>
              )}
            </Pressable>
            {!canSubmit ? (
              <Text className="mt-3 text-center font-plex text-xs text-neutral-500 dark:text-neutral-400">
                أكملي جميع الحقول وحمّلي الصور الأربع لتفعيل الإرسال.
              </Text>
            ) : null}
            <Text className="mt-4 px-6 text-center font-plex text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              بضغطك على إرسال، أنتِ توافقين على معالجة بياناتك وفقًا لسياسة الخصوصية الخاصة بأمانة.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** عنوان قسم مرقّم داخل النموذج. */
function SectionTitle({
  index,
  icon,
  title,
}: {
  index: number;
  icon: MaterialIconName;
  title: string;
}) {
  return (
    <View className="mb-4 flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-neutral-800">
        <MaterialIcons name={icon} size={18} color={driverNavy[700]} />
      </View>
      <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">
        {index}. {title}
      </Text>
    </View>
  );
}

/** حقل نصّي بأيقونة وتسمية + رسالة خطأ اختيارية. */
function Field({
  label,
  icon,
  value,
  onChangeText,
  keyboardType,
  maxLength,
  placeholder,
  error,
}: {
  label: string;
  icon: MaterialIconName;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
  maxLength?: number;
  placeholder?: string;
  error?: string;
}) {
  return (
    <View className="gap-1.5">
      <Text className="font-plex-medium text-sm text-neutral-700 dark:text-neutral-300">{label}</Text>
      <View
        className={`h-14 flex-row items-center gap-2 rounded-xl border bg-white px-4 dark:bg-neutral-800 ${
          error ? 'border-red-400 dark:border-red-600' : 'border-neutral-200 dark:border-neutral-700'
        }`}
      >
        <MaterialIcons name={icon} size={20} color={driverNavy[400]} />
        <TextInput
          className="h-full flex-1 font-plex text-base text-neutral-900 dark:text-neutral-50"
          placeholder={placeholder ?? label}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize="none"
          value={value}
          onChangeText={onChangeText}
          textAlign="right"
        />
      </View>
      {error ? <Text className="font-plex text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}

/** حقل رقم اللوحة — أحرف (حتى 3) وأرقام (حتى 4) منفصلان. */
function PlateInput({
  letters,
  digits,
  onLetters,
  onDigits,
  error,
}: {
  letters: string;
  digits: string;
  onLetters: (text: string) => void;
  onDigits: (text: string) => void;
  error?: string;
}) {
  const boxClass = `h-14 items-center justify-center rounded-xl border bg-white px-3 dark:bg-neutral-800 ${
    error ? 'border-red-400 dark:border-red-600' : 'border-neutral-200 dark:border-neutral-700'
  }`;
  return (
    <View className="gap-1.5">
      <Text className="font-plex-medium text-sm text-neutral-700 dark:text-neutral-300">رقم اللوحة</Text>
      <View className="flex-row gap-3">
        <View className="flex-1 gap-1">
          <View className={boxClass}>
            <TextInput
              className="h-full w-full font-plex-bold text-lg text-neutral-900 dark:text-neutral-50"
              style={{ letterSpacing: 2 }}
              placeholder="أ ب ج"
              placeholderTextColor="#9ca3af"
              // نعرض الأحرف منفصلة بمسافات (ه ه ه) لأن العربية تتّصل؛ onLetters يزيل
              // المسافات ويبقي حروفًا نظيفة، فيبقى التخزين صحيحًا.
              value={letters.split('').join(' ')}
              onChangeText={onLetters}
              textAlign="center"
            />
          </View>
          {letters ? (
            // المقابل اللاتيني الرسمي كما يظهر على اللوحة (أ→A، ب→B، ...).
            <Text className="text-center font-plex-bold text-[13px] tracking-[3px] text-brand-700 dark:text-brand-300">
              {plateLettersToLatin(letters)}
            </Text>
          ) : (
            <Text className="text-center font-plex text-[11px] text-neutral-400 dark:text-neutral-500">
              الأحرف (3 كحدّ أقصى)
            </Text>
          )}
        </View>
        <View className="flex-1 gap-1">
          <View className={boxClass}>
            <TextInput
              className="h-full w-full font-plex-bold text-lg text-neutral-900 dark:text-neutral-50"
              style={{ letterSpacing: 4 }}
              placeholder="1234"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={4}
              value={digits}
              onChangeText={onDigits}
              textAlign="center"
            />
          </View>
          <Text className="text-center font-plex text-[11px] text-neutral-400 dark:text-neutral-500">
            الأرقام (4 كحدّ أقصى)
          </Text>
        </View>
      </View>
      {error ? <Text className="font-plex text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
