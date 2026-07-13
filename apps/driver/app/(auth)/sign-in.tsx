import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInSchema, type SignInInput, translateError } from '@amana/shared-ui/validation';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/toast';

export default function SignInScreen() {
  const { t } = useTranslation();

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
      notify.error(error.message || t('common.error'));
      return;
    }
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-brand-900">
      <View className="flex-1 justify-center gap-4 px-6">
        <Text className="mb-2 text-2xl font-bold text-brand-700 dark:text-brand-100">
          {t('auth.signInTitle')}
        </Text>

        {/* Email */}
        <View className="gap-1">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="rounded-lg border border-brand-200 px-4 py-3 text-brand-900 dark:text-brand-50"
                placeholder={t('auth.email')}
                autoCapitalize="none"
                keyboardType="email-address"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />
          {errors.email ? (
            <Text className="text-sm text-red-500">{translateError(t, errors.email.message)}</Text>
          ) : null}
        </View>

        {/* Password */}
        <View className="gap-1">
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="rounded-lg border border-brand-200 px-4 py-3 text-brand-900 dark:text-brand-50"
                placeholder={t('auth.password')}
                secureTextEntry
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />
          {errors.password ? (
            <Text className="text-sm text-red-500">{translateError(t, errors.password.message)}</Text>
          ) : null}
        </View>

        <Pressable
          className="mt-2 items-center rounded-lg bg-brand-600 px-6 py-3"
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-semibold text-white">{t('auth.signInButton')}</Text>
          )}
        </Pressable>

        <Link href="/(auth)/forgot-password" className="text-center text-brand-500">
          {t('auth.forgotPasswordLink')}
        </Link>

        <View className="mt-4 flex-row justify-center gap-1">
          <Text className="text-brand-500">{t('auth.noAccount')}</Text>
          <Link href="/(auth)/sign-up" className="font-semibold text-brand-700">
            {t('auth.signUpButton')}
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
