import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-brand-900">
      <View className="flex-1 items-center justify-center gap-6 px-6">
        <Text className="text-3xl font-bold text-brand-700 dark:text-brand-100">
          {t('app.driver')}
        </Text>
        <Text className="text-center text-base text-brand-500 dark:text-brand-200">
          واجهة السائقة — منصة أمانة
        </Text>
        <Link
          href="/(auth)/sign-in"
          className="rounded-lg bg-brand-600 px-6 py-3 text-center font-semibold text-white"
        >
          {t('auth.signInButton')}
        </Link>
      </View>
    </SafeAreaView>
  );
}
