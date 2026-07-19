import { Link } from 'expo-router';
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
import { emailOnlySchema, translateError } from '@amana/shared-ui/validation';
import { z } from 'zod';
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
    // Mobile apps redirect to admin web for password reset (deep links not yet configured)
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
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
    <SafeAreaView className="flex-1 bg-white dark:bg-brand-900">
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
          <View className="gap-4">
        <Text className="mb-2 text-2xl font-bold text-brand-700 dark:text-brand-100">
          {t('auth.forgotPasswordTitle')}
        </Text>

        {sent ? (
          <Text className="text-brand-500 dark:text-brand-200">{t('auth.verifyEmailBody')}</Text>
        ) : (
          <>
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
            <Pressable
              className="mt-2 items-center rounded-lg bg-brand-600 px-6 py-3"
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">{t('auth.sendResetLink')}</Text>
              )}
            </Pressable>
          </>
        )}

          <Link href="/(auth)/sign-in" className="mt-4 text-center text-brand-500">
            {t('auth.backToSignIn')}
          </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
