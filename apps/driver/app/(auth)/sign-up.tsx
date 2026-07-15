import { MaterialIcons } from '@expo/vector-icons';
import { Link, router, type Href } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUpSchema, type SignUpInput, translateError } from '@amana/shared-ui/validation';
import { driverNavy } from '@amana/shared-ui/tokens';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/toast';
import { translateAuthError } from '@/lib/authErrors';
import { PasswordInput } from '@/components/PasswordInput';

const FIELDS: {
  name: keyof SignUpInput;
  labelKey: string;
  secure?: boolean;
  email?: boolean;
}[] = [
  { name: 'fullName', labelKey: 'auth.fullName' },
  { name: 'email', labelKey: 'auth.email', email: true },
  { name: 'password', labelKey: 'auth.password', secure: true },
  { name: 'confirmPassword', labelKey: 'auth.confirmPassword', secure: true },
];

export default function SignUpScreen() {
  const { t } = useTranslation();
  // موافقة الشروط إلزامية قبل إنشاء الحساب.
  const [agreed, setAgreed] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: 'onTouched', // تحقّق فوري عند مغادرة الحقل
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  // توست مرئي عند محاولة الإنشاء بحقول غير صالحة (الخطأ قد يكون خلف لوحة المفاتيح).
  const onInvalid = (errs: typeof errors) => {
    const msg =
      errs.fullName?.message ??
      errs.email?.message ??
      errs.password?.message ??
      errs.confirmPassword?.message;
    if (msg) notify.error(translateError(t, msg) ?? t('common.error'));
  };

  async function onSubmit(values: SignUpInput) {
    if (!agreed) {
      notify.error(t('auth.mustAgreeTerms', 'يجب الموافقة على الشروط والأحكام للمتابعة.'));
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      // user_type=driver ⇐ يُنشئ الـtrigger صفَّي profiles + drivers (status=pending).
      // نخزّن لحظة الموافقة على الشروط في بيانات المصادقة (سجلّ امتثال).
      options: {
        data: {
          full_name: values.fullName,
          user_type: 'driver',
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });
    if (error) {
      notify.error(translateAuthError(error.message, t));
      return;
    }
    notify.success(t('auth.mfaSent'));
    // justSent=1 ⇐ رمز أُرسل للتوّ، فيبدأ عدّاد إعادة الإرسال على الشاشة.
    router.replace({
      pathname: '/(auth)/verify-email',
      params: { email: values.email.trim(), justSent: '1' },
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8 items-center gap-3">
          <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-brand-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="shield" size={40} color={driverNavy[700]} />
          </View>
          <Text className="font-plex-bold text-3xl text-neutral-900 dark:text-neutral-50">أمانة</Text>
          <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
            انضمّي كشريكة سائقة
          </Text>
        </View>

        <Text className="mb-6 font-plex-bold text-2xl text-brand-700 dark:text-brand-200">
          {t('auth.signUpTitle')}
        </Text>

        {FIELDS.map((f) => (
          <View key={f.name} className="mb-4 gap-1">
            <Controller
              control={control}
              name={f.name}
              render={({ field: { onChange, onBlur, value } }) =>
                f.secure ? (
                  <PasswordInput
                    placeholder={t(f.labelKey)}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                  />
                ) : (
                  <TextInput
                    className="h-14 rounded-xl border border-neutral-200 bg-white px-4 font-plex text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                    placeholder={t(f.labelKey)}
                    placeholderTextColor="#9ca3af"
                    autoCapitalize={f.email ? 'none' : 'sentences'}
                    keyboardType={f.email ? 'email-address' : 'default'}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                  />
                )
              }
            />
            {errors[f.name] ? (
              <Text className="font-plex text-sm text-red-500">
                {translateError(t, errors[f.name]?.message)}
              </Text>
            ) : null}
          </View>
        ))}

        {/* موافقة الشروط والأحكام (إلزامية) */}
        <Pressable
          onPress={() => setAgreed((v) => !v)}
          className="mb-4 mt-1 flex-row items-center gap-2.5"
        >
          <View
            className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
              agreed ? 'border-brand-700 bg-brand-700 dark:border-brand-500 dark:bg-brand-600' : 'border-neutral-300 dark:border-neutral-600'
            }`}
          >
            {agreed ? <MaterialIcons name="check" size={16} color="#ffffff" /> : null}
          </View>
          <Text className="flex-1 font-plex text-sm text-neutral-600 dark:text-neutral-300">
            {t('terms.agreePrefix', 'أوافق على')}{' '}
            <Text
              className="font-plex-bold text-brand-700 dark:text-brand-300"
              onPress={() => router.push('/terms' as Href)}
            >
              {t('terms.agreeLink', 'الشروط والأحكام')}
            </Text>
          </Text>
        </Pressable>

        <Pressable
          className={`h-14 items-center justify-center rounded-xl active:scale-[0.98] ${
            agreed ? 'bg-brand-700 dark:bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
          }`}
          disabled={isSubmitting || !agreed}
          onPress={handleSubmit(onSubmit, onInvalid)}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className={`font-plex-semibold text-lg ${
                agreed ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {t('auth.signUpButton')}
            </Text>
          )}
        </Pressable>

        <View className="mt-6 flex-row justify-center gap-1">
          <Text className="font-plex text-neutral-500 dark:text-neutral-400">
            {t('auth.haveAccount')}
          </Text>
          <Link href="/(auth)/sign-in" className="font-plex-bold text-brand-700 dark:text-brand-300">
            {t('auth.signInButton')}
          </Link>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
