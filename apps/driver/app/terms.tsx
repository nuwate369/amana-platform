import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';

/** شاشة «الشروط والأحكام» — تُفتح من التسجيل ومن «حول». محتوى ثنائي اللغة. */
export default function TermsScreen() {
  const { t } = useTranslation();
  const sections = (t('terms.sections', { returnObjects: true }) as { h: string; b: string }[]) ?? [];

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
          {t('terms.title', 'الشروط والأحكام')}
        </Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-plex text-xs text-neutral-400 dark:text-neutral-500">
          {t('terms.updated', '')}
        </Text>
        <Text className="mt-3 font-plex text-base leading-7 text-neutral-600 dark:text-neutral-300">
          {t('terms.intro', '')}
        </Text>

        <View className="mt-6 gap-5">
          {sections.map((s, i) => (
            <View key={i} className="gap-1.5">
              <Text className="font-plex-bold text-base text-brand-700 dark:text-brand-200">
                {i + 1}. {s.h}
              </Text>
              <Text className="font-plex text-sm leading-7 text-neutral-600 dark:text-neutral-300">
                {s.b}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
