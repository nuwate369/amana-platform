import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'driver' } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/(auth)/verify-email');
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-brand-900">
      <View className="flex-1 justify-center gap-4 px-6">
        <Text className="mb-2 text-2xl font-bold text-brand-700 dark:text-brand-100">
          {t('auth.signUpTitle')}
        </Text>

        <TextInput
          className="rounded-lg border border-brand-200 px-4 py-3 text-brand-900 dark:text-brand-50"
          placeholder={t('auth.fullName')}
          value={fullName}
          onChangeText={setFullName}
        />
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
            <Text className="font-semibold text-white">{t('auth.signUpButton')}</Text>
          )}
        </Pressable>

        <View className="mt-4 flex-row justify-center gap-1">
          <Text className="text-brand-500">{t('auth.haveAccount')}</Text>
          <Link href="/(auth)/sign-in" className="font-semibold text-brand-700">
            {t('auth.signInButton')}
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
