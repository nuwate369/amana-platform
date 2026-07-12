import { Link } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-brand-900">
      <View className="flex-1 justify-center gap-4 px-6">
        <Text className="mb-2 text-2xl font-bold text-brand-700 dark:text-brand-100">
          {t('auth.forgotPasswordTitle')}
        </Text>

        {sent ? (
          <Text className="text-brand-500 dark:text-brand-200">{t('auth.verifyEmailBody')}</Text>
        ) : (
          <>
            <TextInput
              className="rounded-lg border border-brand-200 px-4 py-3 text-brand-900 dark:text-brand-50"
              placeholder={t('auth.email')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
            <Pressable
              className="mt-2 items-center rounded-lg bg-brand-600 px-6 py-3"
              disabled={loading}
              onPress={onSubmit}
            >
              {loading ? (
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
    </SafeAreaView>
  );
}
