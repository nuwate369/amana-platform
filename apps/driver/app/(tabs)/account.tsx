import { MaterialIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import type { AppLocale } from '@amana/i18n';
import { useAuth } from '@/lib/auth';
import { usePreferences, type ThemePref } from '@/lib/preferences';
import { pickAndUploadAvatar } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/toast';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const SAUDI_PHONE_RE = /^05\d{8}$/;

/**
 * شاشة «حسابي» — الملف الشخصي + التفضيلات (المظهر/اللغة) + تسجيل الخروج.
 * الاسم والجوال قابلان للتعديل (يُحفظان في profiles + بيانات المصادقة).
 */
export default function AccountScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme, setTheme, language, setLanguage } = usePreferences();

  const email = user?.email ?? '—';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState({ fullName: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // جلب الاسم والجوال والصورة من الملف لإعادة التعبئة.
  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from('profiles')
      .select('full_name, phone, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const name = (data?.full_name as string | null) ?? (user.user_metadata?.full_name as string | undefined) ?? '';
        const ph = (data?.phone as string | null) ?? '';
        setFullName(name);
        setPhone(ph);
        setAvatarUrl((data?.avatar_url as string | null) ?? null);
        setInitial({ fullName: name, phone: ph });
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  // اختيار مصدر الصورة (كاميرا/معرض) ثم الرفع.
  function onChangeAvatar() {
    if (!user || uploadingAvatar) return;
    Alert.alert(
      t('profile.changePhoto', 'صورة الحساب'),
      t('profile.choosePhotoSource', 'اختاري مصدر الصورة'),
      [
        { text: t('kyc.sourceCamera', 'التقاط بالكاميرا'), onPress: () => doUploadAvatar('camera') },
        { text: t('kyc.sourceLibrary', 'اختيار من المعرض'), onPress: () => doUploadAvatar('library') },
        { text: t('common.cancel', 'إلغاء'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  }

  async function doUploadAvatar(source: 'camera' | 'library') {
    if (!user) return;
    setUploadingAvatar(true);
    const res = await pickAndUploadAvatar(user.id, source);
    setUploadingAvatar(false);
    if (res.cancelled) return;
    if (!res.ok) {
      notify.error(res.message ?? t('common.error', 'حدث خطأ'));
      return;
    }
    setAvatarUrl(res.url ?? null);
    notify.success(t('profile.successMessage', 'تم تحديث البيانات بنجاح!'));
  }

  const phoneValid = phone.length === 0 || SAUDI_PHONE_RE.test(phone);
  const dirty = fullName.trim() !== initial.fullName || phone !== initial.phone;
  const canSave = dirty && fullName.trim().length > 0 && phoneValid && !saving;

  async function onSave() {
    if (!user || !canSave) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() })
      .eq('id', user.id);
    if (error) {
      setSaving(false);
      notify.error(error.message);
      return;
    }
    // مزامنة الاسم في بيانات المصادقة (تعتمدها الشاشة الرئيسية).
    await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
    setInitial({ fullName: fullName.trim(), phone: phone.trim() });
    setSaving(false);
    notify.success(t('profile.successMessage', 'تم تحديث البيانات بنجاح!'));
  }

  // تبديل اللغة يقلب الاتجاه ⇒ نؤكّد ثم نعيد التشغيل.
  function onPickLanguage(next: AppLocale) {
    if (next === language) return;
    Alert.alert(
      t('profile.fields.language', 'اللغة المفضلة'),
      t('common.languageRestartHint', 'سيُعاد تشغيل التطبيق لتطبيق اللغة الجديدة.'),
      [
        { text: t('common.cancel', 'إلغاء'), style: 'cancel' },
        { text: t('common.continue', 'متابعة'), onPress: () => void setLanguage(next) },
      ],
      { cancelable: true },
    );
  }

  const avatarLetter = fullName.trim().charAt(0) || 'أ';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row items-center justify-center border-b border-neutral-200 px-5 dark:border-neutral-800">
        <Text className="font-plex-bold text-xl text-neutral-900 dark:text-neutral-50">
          {t('profile.title', 'الملف الشخصي')}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={driverNavy[500]} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* بطاقة الهوية + تغيير الصورة */}
          <View className="mb-6 items-center">
            <Pressable onPress={onChangeAvatar} disabled={uploadingAvatar} className="active:scale-95">
              <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-100 dark:bg-neutral-800">
                {uploadingAvatar ? (
                  <ActivityIndicator color={driverNavy[500]} />
                ) : avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} className="h-24 w-24" resizeMode="cover" />
                ) : (
                  <Text className="font-plex-bold text-4xl text-brand-700 dark:text-brand-200">
                    {avatarLetter}
                  </Text>
                )}
              </View>
              {/* شارة الكاميرا */}
              <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-neutral-50 bg-brand-700 dark:border-neutral-900 dark:bg-brand-600">
                <MaterialIcons name="photo-camera" size={16} color="#ffffff" />
              </View>
            </Pressable>
            <Text className="mt-3 font-plex-bold text-xl text-neutral-900 dark:text-neutral-50">
              {fullName || '—'}
            </Text>
            <Text className="mt-0.5 font-plex text-sm text-neutral-500 dark:text-neutral-400">{email}</Text>
          </View>

          {/* المعلومات الأساسية */}
          <SectionTitle icon="badge" title={t('profile.sections.basic', 'المعلومات الأساسية')} />
          <View className="mb-6 gap-4">
            <Field
              label={t('profile.fields.fullName', 'الاسم الكامل')}
              icon="person"
              value={fullName}
              onChangeText={setFullName}
            />
            <Field
              label={t('profile.fields.phone', 'رقم الجوال')}
              icon="phone"
              value={phone}
              keyboardType="number-pad"
              maxLength={10}
              onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
              error={!phoneValid ? t('validation.saudiPhone', 'رقم سعودي يبدأ بـ 05 (10 أرقام)') : undefined}
            />
            <Field
              label={t('profile.fields.email', 'البريد الإلكتروني')}
              icon="mail"
              value={email}
              editable={false}
            />
            <Pressable
              onPress={onSave}
              disabled={!canSave}
              className={`mt-1 h-14 flex-row items-center justify-center gap-2 rounded-xl active:scale-[0.98] ${
                canSave ? 'bg-brand-700 dark:bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text
                  className={`font-plex-semibold text-base ${
                    canSave ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {t('profile.save', 'حفظ التعديلات')}
                </Text>
              )}
            </Pressable>
          </View>

          {/* التفضيلات */}
          <SectionTitle icon="tune" title={t('profile.sections.preferences', 'التفضيلات')} />
          <View className="mb-6 gap-5">
            {/* المظهر */}
            <View className="gap-2">
              <Text className="font-plex-medium text-sm text-neutral-700 dark:text-neutral-300">
                {t('profile.fields.theme', 'المظهر')}
              </Text>
              <Segmented<ThemePref>
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'light', label: t('common.light', 'فاتح'), icon: 'light-mode' },
                  { value: 'dark', label: t('common.dark', 'داكن'), icon: 'dark-mode' },
                  { value: 'system', label: t('common.system', 'تلقائي'), icon: 'brightness-auto' },
                ]}
              />
            </View>

            {/* اللغة */}
            <View className="gap-2">
              <Text className="font-plex-medium text-sm text-neutral-700 dark:text-neutral-300">
                {t('profile.fields.language', 'اللغة المفضلة')}
              </Text>
              <Segmented<AppLocale>
                value={language}
                onChange={onPickLanguage}
                options={[
                  { value: 'ar', label: t('common.arabic', 'العربية'), icon: 'translate' },
                  { value: 'en', label: t('common.english', 'الإنجليزية'), icon: 'translate' },
                ]}
              />
            </View>
          </View>

          {/* المزيد: الدعم + حول */}
          <View className="mb-6 gap-3">
            <NavRow
              icon="support-agent"
              label={t('nav.support', 'الدعم الفني')}
              onPress={() => router.push('/support' as Href)}
            />
            <NavRow
              icon="info-outline"
              label={t('about.title', 'حول التطبيق')}
              onPress={() => router.push('/about')}
            />
          </View>

          {/* تسجيل الخروج */}
          <Pressable
            onPress={signOut}
            className="h-14 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 active:scale-[0.98] dark:border-red-900 dark:bg-red-900/20"
          >
            <MaterialIcons name="logout" size={20} color="#dc2626" />
            <Text className="font-plex-semibold text-base text-red-600 dark:text-red-400">
              {t('nav.logout', 'تسجيل الخروج')}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** عنوان قسم بأيقونة. */
function SectionTitle({ icon, title }: { icon: MaterialIconName; title: string }) {
  return (
    <View className="mb-4 flex-row items-center gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-neutral-800">
        <MaterialIcons name={icon} size={18} color={driverNavy[700]} />
      </View>
      <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">{title}</Text>
    </View>
  );
}

/** صفّ تنقّل قابل للنقر بأيقونة ونصّ وسهم. */
function NavRow({
  icon,
  label,
  onPress,
}: {
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="h-14 flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 active:scale-[0.99] dark:border-neutral-700 dark:bg-neutral-800"
    >
      <View className="flex-row items-center gap-3">
        <MaterialIcons name={icon} size={22} color={driverNavy[600]} />
        <Text className="font-plex-medium text-base text-neutral-800 dark:text-neutral-100">{label}</Text>
      </View>
      <MaterialIcons name="chevron-left" size={22} color="#9ca3af" />
    </Pressable>
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
  editable = true,
  error,
}: {
  label: string;
  icon: MaterialIconName;
  value: string;
  onChangeText?: (text: string) => void;
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
  maxLength?: number;
  editable?: boolean;
  error?: string;
}) {
  return (
    <View className="gap-1.5">
      <Text className="font-plex-medium text-sm text-neutral-700 dark:text-neutral-300">{label}</Text>
      <View
        className={`h-14 flex-row items-center gap-2 rounded-xl border px-4 ${
          editable ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-100 dark:bg-neutral-800/50'
        } ${error ? 'border-red-400 dark:border-red-600' : 'border-neutral-200 dark:border-neutral-700'}`}
      >
        <MaterialIcons name={icon} size={20} color={driverNavy[400]} />
        <TextInput
          className="h-full flex-1 font-plex text-base text-neutral-900 dark:text-neutral-50"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={editable}
          autoCapitalize="none"
          textAlign="right"
        />
      </View>
      {error ? <Text className="font-plex text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}

/** شريط اختيار مجزّأ (segmented control) عام. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon: MaterialIconName }[];
}) {
  return (
    <View className="flex-row gap-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg ${
              active ? 'bg-brand-700 dark:bg-brand-600' : ''
            }`}
          >
            <MaterialIcons
              name={opt.icon}
              size={16}
              color={active ? '#ffffff' : driverNavy[400]}
            />
            <Text
              className={`font-plex-medium text-sm ${
                active ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
