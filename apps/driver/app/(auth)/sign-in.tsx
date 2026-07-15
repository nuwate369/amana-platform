import { MaterialIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
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
import { signInSchema, type SignInInput, translateError } from '@amana/shared-ui/validation';
import { driverNavy } from '@amana/shared-ui/tokens';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/toast';
import { translateAuthError, isEmailNotConfirmed } from '@/lib/authErrors';
import { PasswordInput } from '@/components/PasswordInput';

export default function SignInScreen() {
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    mode: 'onTouched', // تحقّق فوري عند مغادرة الحقل
    defaultValues: { email: '', password: '' },
  });

  // توست مرئي عند محاولة الإرسال بحقول غير صالحة (رسالة الخطأ قد تكون خلف لوحة المفاتيح).
  const onInvalid = (errs: typeof errors) => {
    const msg = errs.email?.message ?? errs.password?.message;
    if (msg) notify.error(translateError(t, msg) ?? t('common.error'));
  };

  async function onSubmit(values: SignInInput) {
    const email = values.email.trim();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: values.password,
    });
    if (error) {
      // بريد لم يُفعّل ⇐ رسالة عربية + توجيه لشاشة الرمز (مع إتاحة إعادة الإرسال).
      if (isEmailNotConfirmed(error)) {
        notify.error(t('auth.errEmailNotConfirmed'));
        router.push({ pathname: '/(auth)/verify-email', params: { email } });
        return;
      }
      notify.error(translateAuthError(error.message, t));
      return;
    }
    // نوجّه للجذر وتتكفّل بوابة التوجيه بإرسالها للوجهة حسب حالة اعتمادها.
    router.replace('/');
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
        {/* الشعار */}
        <View className="mb-8 items-center gap-3">
          <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-brand-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="shield" size={40} color={driverNavy[700]} />
          </View>
          <Text className="font-plex-bold text-3xl text-neutral-900 dark:text-neutral-50">أمانة</Text>
          <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
            بوابة الشريكات السائقات
          </Text>
        </View>

        <Text className="mb-6 font-plex-bold text-2xl text-brand-700 dark:text-brand-200">
          {t('auth.signInTitle')}
        </Text>

        {/* البريد */}
        <View className="mb-4 gap-1">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="h-14 rounded-xl border border-neutral-200 bg-white px-4 font-plex text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                placeholder={t('auth.email')}
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                keyboardType="email-address"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />
          {errors.email ? (
            <Text className="font-plex text-sm text-red-500">
              {translateError(t, errors.email.message)}
            </Text>
          ) : null}
        </View>

        {/* كلمة المرور */}
        <View className="mb-2 gap-1">
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <PasswordInput
                placeholder={t('auth.password')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />
          {errors.password ? (
            <Text className="font-plex text-sm text-red-500">
              {translateError(t, errors.password.message)}
            </Text>
          ) : null}
        </View>

        <Link href="/(auth)/forgot-password" className="mb-6 text-left font-plex-medium text-sm text-brand-600">
          {t('auth.forgotPasswordLink')}
        </Link>

        <Pressable
          className="h-14 items-center justify-center rounded-xl bg-brand-700 active:scale-[0.98] dark:bg-brand-600"
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit, onInvalid)}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-plex-semibold text-lg text-white">{t('auth.signInButton')}</Text>
          )}
        </Pressable>

        <View className="mt-6 flex-row justify-center gap-1">
          <Text className="font-plex text-neutral-500 dark:text-neutral-400">{t('auth.noAccount')}</Text>
          <Link href="/(auth)/sign-up" className="font-plex-bold text-brand-700 dark:text-brand-300">
            {t('auth.signUpButton')}
          </Link>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
