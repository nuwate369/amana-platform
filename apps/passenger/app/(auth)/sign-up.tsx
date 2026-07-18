import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
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
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/toast';

/**
 * إنشاء حساب راكبة — نفس الهوية البصرية لشاشة الدخول (بطاقة + حقول بأيقونات +
 * إظهار/إخفاء كلمة المرور). داخل ScrollView + KeyboardAvoidingView كي لا تختفي
 * الحقول خلف لوحة المفاتيح. عند النجاح ⇒ شاشة التحقق برمز OTP.
 */
export default function SignUpScreen() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: 'onTouched',
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onInvalid = (errs: typeof errors) => {
    const msg =
      errs.fullName?.message ?? errs.email?.message ?? errs.password?.message ?? errs.confirmPassword?.message;
    if (msg) notify.error(translateError(t, msg) ?? t('common.error'));
  };

  async function onSubmit(values: SignUpInput) {
    const email = values.email.trim();
    const { error } = await supabase.auth.signUp({
      email,
      password: values.password,
      options: { data: { full_name: values.fullName.trim(), user_type: 'passenger' } },
    });
    if (error) {
      notify.error(error.message || t('common.error'));
      return;
    }
    notify.success(t('auth.mfaSent'));
    router.replace({ pathname: '/(auth)/verify-email', params: { email, justSent: '1' } });
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9fa] dark:bg-brand-900">
      {/* زخرفة علوية */}
      <View className="absolute left-[-10%] top-[-10%] h-[36%] w-[120%] rounded-b-full bg-brand-100 opacity-60 dark:bg-brand-800" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* الترويسة */}
          <View className="mb-6 items-center">
            <Text className="mb-4 font-plex-bold text-4xl text-brand-700 dark:text-brand-100">Amana</Text>
            <View className="mb-3 h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-brand-50 shadow-sm">
              <Ionicons name="person-add-outline" size={52} color="#7838bf" />
            </View>
            <Text className="mb-1 font-plex-semibold text-2xl text-gray-900 dark:text-white">
              إنشاء حساب جديد
            </Text>
            <Text className="font-plex text-sm text-gray-500 dark:text-gray-300">
              انضمّي إلى أمانة وابدئي رحلتك الأولى
            </Text>
          </View>

          {/* بطاقة النموذج */}
          <View className="rounded-2xl bg-white p-6 shadow-sm dark:bg-brand-800">
            {/* الاسم الكامل */}
            <View className="mb-4">
              <Text className="mb-1 font-plex-medium text-xs text-gray-500 dark:text-gray-400">
                {t('auth.fullName')}
              </Text>
              <View className="relative justify-center">
                <Controller
                  control={control}
                  name="fullName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="h-14 w-full rounded-lg border border-gray-200 bg-gray-50 px-12 font-plex text-base text-gray-900 dark:border-brand-700 dark:bg-brand-900 dark:text-white"
                      placeholder={t('auth.fullName')}
                      placeholderTextColor="#a0aec0"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                    />
                  )}
                />
                <View className="absolute right-4">
                  <Ionicons name="person-outline" size={20} color="#718096" />
                </View>
              </View>
              {errors.fullName ? (
                <Text className="mt-1 font-plex text-xs text-red-500">
                  {translateError(t, errors.fullName.message)}
                </Text>
              ) : null}
            </View>

            {/* البريد */}
            <View className="mb-4">
              <Text className="mb-1 font-plex-medium text-xs text-gray-500 dark:text-gray-400">
                {t('auth.email')}
              </Text>
              <View className="relative justify-center">
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="h-14 w-full rounded-lg border border-gray-200 bg-gray-50 px-12 font-plex text-base text-gray-900 dark:border-brand-700 dark:bg-brand-900 dark:text-white"
                      placeholder="name@example.com"
                      placeholderTextColor="#a0aec0"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                    />
                  )}
                />
                <View className="absolute right-4">
                  <Ionicons name="mail-outline" size={20} color="#718096" />
                </View>
              </View>
              {errors.email ? (
                <Text className="mt-1 font-plex text-xs text-red-500">
                  {translateError(t, errors.email.message)}
                </Text>
              ) : null}
            </View>

            {/* كلمة المرور */}
            <View className="mb-4">
              <Text className="mb-1 font-plex-medium text-xs text-gray-500 dark:text-gray-400">
                {t('auth.password')}
              </Text>
              <View className="relative justify-center">
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="h-14 w-full rounded-lg border border-gray-200 bg-gray-50 px-12 font-plex text-base text-gray-900 dark:border-brand-700 dark:bg-brand-900 dark:text-white"
                      placeholder="••••••••"
                      placeholderTextColor="#a0aec0"
                      secureTextEntry={!showPassword}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                    />
                  )}
                />
                <Pressable className="absolute left-4" onPress={() => setShowPassword((s) => !s)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#718096" />
                </Pressable>
              </View>
              {errors.password ? (
                <Text className="mt-1 font-plex text-xs text-red-500">
                  {translateError(t, errors.password.message)}
                </Text>
              ) : null}
            </View>

            {/* تأكيد كلمة المرور */}
            <View className="mb-2">
              <Text className="mb-1 font-plex-medium text-xs text-gray-500 dark:text-gray-400">
                {t('auth.confirmPassword')}
              </Text>
              <View className="relative justify-center">
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="h-14 w-full rounded-lg border border-gray-200 bg-gray-50 px-12 font-plex text-base text-gray-900 dark:border-brand-700 dark:bg-brand-900 dark:text-white"
                      placeholder="••••••••"
                      placeholderTextColor="#a0aec0"
                      secureTextEntry={!showConfirm}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                    />
                  )}
                />
                <Pressable className="absolute left-4" onPress={() => setShowConfirm((s) => !s)}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#718096" />
                </Pressable>
              </View>
              {errors.confirmPassword ? (
                <Text className="mt-1 font-plex text-xs text-red-500">
                  {translateError(t, errors.confirmPassword.message)}
                </Text>
              ) : null}
            </View>

            {/* زر الإنشاء */}
            <Pressable
              className="mt-6 h-14 w-full flex-row items-center justify-center rounded-xl bg-brand-600 active:scale-95"
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit, onInvalid)}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-plex-semibold text-lg text-white">{t('auth.signUpButton')}</Text>
              )}
            </Pressable>
          </View>

          {/* التذييل */}
          <View className="mt-8 flex-row items-center justify-center">
            <Text className="font-plex text-gray-500 dark:text-gray-400">{t('auth.haveAccount')} </Text>
            <Link href="/(auth)/sign-in" className="font-plex-semibold text-lg text-brand-600 dark:text-brand-300">
              {t('auth.signInButton')}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
