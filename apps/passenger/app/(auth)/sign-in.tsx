import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/');
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-brand-900">
      <View className="flex-1 justify-center gap-4 px-6">
        <Text className="mb-2 text-2xl font-bold text-brand-700 dark:text-brand-100">
          {t('auth.signInTitle')}
        </Text>

        <TextInput
          className="rounded-lg border border-brand-200 px-4 py-3 text-brand-900 dark:text-brand-50"
          placeholder={t('auth.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="rounded-lg border border-brand-200 px-4 py-3 text-brand-900 dark:text-brand-50"
          placeholder={t('auth.password')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
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
