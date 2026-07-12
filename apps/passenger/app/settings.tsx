import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «الإعدادات» — تحويل مطابق لتصميم Stitch
 * (Settings Screen، مشروع Amanah Mobility Platform)
 * مع مطابقة الألوان للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * التبديلات ثابتة (بلا منطق) والبيانات mock مطابقة للتصميم.
 */

// عنوان قسم صغير.
function SectionTitle({ title }: { title: string }) {
  return (
    <Text className="mb-3 px-2 font-plex-medium text-xs uppercase tracking-wider text-neutral-400">
      {title}
    </Text>
  );
}

// صف تبديل (Switch ثابت).
function ToggleRow({
  icon,
  label,
  value,
  divider,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: boolean;
  divider?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between p-4 ${
        divider ? 'border-b border-neutral-100 dark:border-neutral-700' : ''
      }`}
    >
      <View className="flex-row items-center gap-4">
        <MaterialIcons name={icon} size={24} color={passengerPurple[600]} />
        <Text className="font-plex text-base text-neutral-900 dark:text-neutral-50">{label}</Text>
      </View>
      <Switch
        value={value}
        trackColor={{ false: '#d1d5db', true: passengerPurple[600] }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

// صف قابل للنقر (بسهم أو قيمة).
function LinkRow({
  icon,
  label,
  trailing,
  divider,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  trailing?: string;
  divider?: boolean;
}) {
  return (
    <Pressable
      className={`flex-row items-center justify-between p-4 active:bg-neutral-50 dark:active:bg-neutral-700/40 ${
        divider ? 'border-b border-neutral-100 dark:border-neutral-700' : ''
      }`}
    >
      <View className="flex-row items-center gap-4">
        <MaterialIcons name={icon} size={24} color={passengerPurple[600]} />
        <Text className="font-plex text-base text-neutral-900 dark:text-neutral-50">{label}</Text>
      </View>
      <View className="flex-row items-center gap-1">
        {trailing ? (
          <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
            {trailing}
          </Text>
        ) : null}
        <MaterialIcons name="chevron-left" size={22} color="#9ca3af" />
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={passengerPurple[700]} />
        </Pressable>
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">
          الإعدادات
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* هوية الحساب */}
        <View className="mb-6 flex-row items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <View className="h-16 w-16 overflow-hidden rounded-full border-2 border-brand-600 bg-brand-100">
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzfJ5L4FPXbIgtcGB2iUTucm6eQt305H9uJ8PiqgSEmkfsguQpavnYXaI7ZJvQaYx7Zvg3iY3QZpZVDJZwXv6j9tt-ljQLuhvHzPYhh2PTsGPxfkmE1mVz-cIdmgWRNB0zjxyHWDkr4tV8gKCl2DFljWaUE1LzIxVNj4JqP7vZF3XcrInuNLeezkm8KRflH6X0YvXD0KfCIX-LyJYuvBWAApd5AqhBmBJGlWfzHvCPcaIwYQ4dvO7bGx1YhKcqJujUp_IWH7XfUpTT',
              }}
              className="h-full w-full"
              resizeMode="cover"
            />
          </View>
          <View>
            <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">
              سارة أحمد
            </Text>
            <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
              sarah.a@amana.sa
            </Text>
          </View>
        </View>

        {/* الإشعارات والتواصل */}
        <View className="mb-6">
          <SectionTitle title="الإشعارات والتواصل" />
          <View className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
            <ToggleRow icon="notifications-active" label="تنبيهات التطبيق" value divider />
            <ToggleRow icon="mail" label="تحديثات البريد الإلكتروني" value={false} />
          </View>
        </View>

        {/* المظهر واللغة */}
        <View className="mb-6">
          <SectionTitle title="المظهر واللغة" />
          <View className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
            <ToggleRow icon="dark-mode" label="الوضع الليلي" value={false} divider />
            <LinkRow icon="language" label="اختيار اللغة" trailing="العربية" />
          </View>
        </View>

        {/* الأمان والخصوصية */}
        <View className="mb-6">
          <SectionTitle title="الأمان والخصوصية" />
          <View className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
            <LinkRow icon="lock" label="تغيير كلمة المرور" divider />
            <LinkRow icon="shield" label="سياسة الخصوصية" />
          </View>
        </View>

        {/* إجراءات حسّاسة */}
        <View className="mb-6 gap-4 pt-2">
          <Pressable className="h-14 flex-row items-center justify-center gap-3 rounded-xl bg-brand-50 active:opacity-90 dark:bg-brand-900/40">
            <MaterialIcons name="logout" size={22} color={passengerPurple[700]} />
            <Text className="font-plex-medium text-base text-brand-700 dark:text-brand-200">
              تسجيل الخروج
            </Text>
          </Pressable>
          <Pressable className="h-14 flex-row items-center justify-center gap-3 rounded-xl border border-red-200 active:bg-red-50 dark:border-red-900/40 dark:active:bg-red-900/20">
            <MaterialIcons name="delete-forever" size={22} color="#dc2626" />
            <Text className="font-plex-medium text-base text-red-600">حذف الحساب</Text>
          </Pressable>
        </View>

        {/* تذييل الدعم */}
        <View className="items-center pb-2">
          <Text className="font-plex text-sm text-neutral-500 dark:text-neutral-400">
            نسخة التطبيق 2.4.0 (Amana)
          </Text>
          <Pressable className="mt-2 active:opacity-70">
            <Text className="font-plex-medium text-xs text-brand-600 dark:text-brand-300">
              تواصل مع الدعم الفني
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
