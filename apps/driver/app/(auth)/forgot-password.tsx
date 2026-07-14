import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { emailOnlySchema, translateError } from '@amana/shared-ui/validation';
import { z } from 'zod';
import { driverNavy } from '@amana/shared-ui/tokens';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/toast';

type EmailOnlyInput = z.infer<typeof emailOnlySchema>;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyInput>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: EmailOnlyInput) {
    const { error } = await supabase.auth.resetPasswordForEmail(values.email.trim(), {
      redirectTo: 'http://localhost:3000/auth/reset-password',
    });
    if (error) {
      notify.error(error.message || t('common.error'));
      return;
    }
    notify.success(t('auth.verifyEmailBody'));
    setSent(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <View className="flex-1 justify-center gap-5 px-6">
        <View className="mb-2 items-center gap-3">
          <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-brand-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="lock-reset" size={40} color={driverNavy[700]} />
          </View>
          <Text className="font-plex-bold text-2xl text-brand-700 dark:text-brand-200">
            {t('auth.forgotPasswordTitle')}
          </Text>
        </View>

        {sent ? (
          <View className="items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
            <MaterialIcons name="mark-email-read" size={32} color="#16a34a" />
            <Text className="text-center font-plex text-base text-green-800 dark:text-green-300">
              {t('auth.verifyEmailBody')}
            </Text>
          </View>
        ) : (
          <>
            <View className="gap-1">
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
            <Pressable
              className="h-14 items-center justify-center rounded-xl bg-brand-700 active:scale-[0.98] dark:bg-brand-600"
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-plex-semibold text-lg text-white">{t('auth.sendResetLink')}</Text>
              )}
            </Pressable>
          </>
        )}

        <Link
          href="/(auth)/sign-in"
          className="mt-2 text-center font-plex-medium text-brand-600 dark:text-brand-300"
        >
          {t('auth.backToSignIn')}
        </Link>
      </View>
    </SafeAreaView>
  );
}
