import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-brand-900">
      <View className="flex-1 justify-center gap-4 px-6">
        <Text className="text-2xl font-bold text-brand-700 dark:text-brand-100">
          {t('auth.verifyEmailTitle')}
        </Text>
        <Text className="text-brand-500 dark:text-brand-200">{t('auth.verifyEmailBody')}</Text>
        <Link href="/(auth)/sign-in" className="mt-4 text-center font-semibold text-brand-700">
          {t('auth.backToSignIn')}
        </Link>
      </View>
    </SafeAreaView>
  );
}
