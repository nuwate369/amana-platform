import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/** شاشة «حول التطبيق» — الهوية، الإصدار، الرسالة، مدخل الدعم. */
export default function AboutScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={driverNavy[600]} />
        </Pressable>
        <Text className="font-plex-bold text-xl text-neutral-900 dark:text-neutral-50">
          {t('about.title', 'حول التطبيق')}
        </Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 32, paddingBottom: 40, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* الهوية */}
        <View className="h-24 w-24 items-center justify-center rounded-3xl bg-brand-800">
          <MaterialIcons name="shield" size={56} color={driverNavy[100]} />
        </View>
        <Text className="mt-4 font-plex-bold text-3xl text-brand-700 dark:text-brand-200">أمانة</Text>
        <Text className="mt-1 font-plex text-sm text-neutral-500 dark:text-neutral-400">
          {t('about.version', 'الإصدار')} {version}
        </Text>

        {/* الرسالة */}
        <Text className="mt-6 max-w-sm text-center font-plex text-base leading-7 text-neutral-600 dark:text-neutral-300">
          {t('about.mission', 'منصّة تنقّل ذكية وآمنة للمرأة في السعودية — تربط الراكبات بسائقات موثّقات بمعايير أمان واحترافية عالية.')}
        </Text>

        {/* روابط */}
        <View className="mt-8 w-full gap-3">
          <Row
            icon="support-agent"
            label={t('nav.support', 'الدعم الفني')}
            onPress={() => router.push('/support' as Href)}
          />
          <Row
            icon="description"
            label={t('about.terms', 'الشروط والأحكام')}
            onPress={() => router.push('/terms' as Href)}
          />
        </View>

        <Text className="mt-10 font-plex text-xs text-neutral-400 dark:text-neutral-500">
          © 2026 أمانة
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** صفّ قابل للنقر بأيقونة ونصّ. */
function Row({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="h-14 flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 active:scale-[0.99] dark:border-neutral-700 dark:bg-neutral-800"
    >
      <View className="flex-row items-center gap-3">
        <MaterialIcons name={icon} size={22} color={driverNavy[600]} />
        <Text className="font-plex-medium text-base text-neutral-800 dark:text-neutral-100">{label}</Text>
      </View>
      <MaterialIcons name="chevron-left" size={22} color="#9ca3af" />
    </Pressable>
  );
}
