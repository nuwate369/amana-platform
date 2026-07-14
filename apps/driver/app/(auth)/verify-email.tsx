import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <View className="flex-1 items-center justify-center gap-5 px-8">
        <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-brand-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <MaterialIcons name="mark-email-unread" size={48} color={driverNavy[700]} />
        </View>
        <Text className="text-center font-plex-bold text-2xl text-brand-700 dark:text-brand-200">
          {t('auth.verifyEmailTitle')}
        </Text>
        <Text className="text-center font-plex text-base leading-7 text-neutral-500 dark:text-neutral-400">
          {t('auth.verifyEmailBody')}
        </Text>
        <Link
          href="/(auth)/sign-in"
          className="mt-2 font-plex-bold text-brand-700 dark:text-brand-300"
        >
          {t('auth.backToSignIn')}
        </Link>
      </View>
    </SafeAreaView>
  );
}
