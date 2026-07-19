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
import { signInSchema, type SignInInput, translateError } from '@amana/shared-ui/validation';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/toast';
import { Ionicons } from '@expo/vector-icons';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: SignInInput) {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      // بريد غير مُفعّل ⇐ رسالة عربية + توجيه لشاشة الرمز (مع إتاحة إعادة الإرسال).
      const unconfirmed =
        (error as { code?: string }).code === 'email_not_confirmed' ||
        /not confirmed/i.test(error.message);
      if (unconfirmed) {
        notify.error('بريدكِ غير مُفعّل — أدخلي رمز التحقق المُرسَل إليكِ');
        router.push({ pathname: '/(auth)/verify-email', params: { email: values.email.trim() } });
        return;
      }
      notify.error(error.message || t('common.error'));
      return;
    }
    // نعود للجذر وبوّابة التوجيه تقرّر الوجهة (رئيسية إن مفعّلة، أو شاشة الانتظار).
    router.replace('/');
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9fa] dark:bg-brand-900">
      {/* Decorative Blob */}
      <View className="absolute top-[-10%] left-[-10%] w-[120%] h-[40%] bg-brand-100 dark:bg-brand-800 rounded-b-full opacity-60" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Header Area */}
        <View className="items-center mb-8">
          <Text className="text-4xl font-plex-bold text-brand-700 dark:text-brand-100 mb-6">
            Amana
          </Text>
          <View className="w-24 h-24 mb-4 rounded-full bg-brand-50 border-2 border-white items-center justify-center shadow-sm overflow-hidden">
             {/* Placeholder for Logo/Image */}
             <Ionicons name="person-circle-outline" size={64} color="#7838bf" />
          </View>
          <Text className="text-2xl font-plex-semibold text-gray-900 dark:text-white mb-2">
            مرحباً بكِ مجدداً
          </Text>
          <Text className="text-sm font-plex text-gray-500 dark:text-gray-300">
            الرجاء تسجيل الدخول للمتابعة
          </Text>
        </View>

        {/* Login Form Card */}
        <View className="bg-white dark:bg-brand-800 p-6 rounded-2xl shadow-sm">
          <View className="space-y-4">
            {/* Email Field */}
            <View className="space-y-1">
              <Text className="text-xs font-plex-medium text-gray-500 dark:text-gray-400">البريد الإلكتروني</Text>
              <View className="relative justify-center">
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="w-full h-14 bg-gray-50 dark:bg-brand-900 px-12 rounded-lg border border-gray-200 dark:border-brand-700 text-gray-900 dark:text-white font-plex text-base"
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
                <View className="absolute left-4">
                  <Ionicons name="mail-outline" size={20} color="#718096" />
                </View>
              </View>
              {errors.email ? (
                <Text className="text-xs text-red-500 font-plex mt-1">
                  {translateError(t, errors.email.message)}
                </Text>
              ) : null}
            </View>

            {/* Password Field */}
            <View className="space-y-1 mt-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs font-plex-medium text-gray-500 dark:text-gray-400">كلمة المرور</Text>
                <Link href="/(auth)/forgot-password" className="text-xs font-plex-medium text-brand-600 dark:text-brand-300">
                  نسيتِ كلمة المرور؟
                </Link>
              </View>
              <View className="relative justify-center">
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="w-full h-14 bg-gray-50 dark:bg-brand-900 px-12 rounded-lg border border-gray-200 dark:border-brand-700 text-gray-900 dark:text-white font-plex text-base"
                      placeholder="••••••••"
                      placeholderTextColor="#a0aec0"
                      secureTextEntry={!showPassword}
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                    />
                  )}
                />
                <Pressable className="absolute left-4" onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#718096" />
                </Pressable>
              </View>
              {errors.password ? (
                <Text className="text-xs text-red-500 font-plex mt-1">
                  {translateError(t, errors.password.message)}
                </Text>
              ) : null}
            </View>

            {/* Submit Button */}
            <Pressable
              className="w-full h-14 bg-brand-600 mt-6 rounded-xl flex-row items-center justify-center active:scale-95 transition-transform"
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text className="font-plex-semibold text-lg text-white">تسجيل الدخول</Text>
                  <Ionicons name="arrow-back" size={20} color="#fff" style={{ marginRight: 8 }} />
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View className="mt-8 items-center">
          <View className="flex-row items-center">
            <Text className="font-plex text-gray-500 dark:text-gray-400">ليس لديكِ حساب؟ </Text>
            <Link href="/(auth)/sign-up" className="font-plex-semibold text-brand-600 dark:text-brand-300 text-lg">
              إنشاء حساب جديد
            </Link>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
