import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { supabase } from '@/lib/supabase';

/**
 * شاشة «الملف الشخصي» — تحويل مطابق لتصميم Stitch
 * (User Profile Screen، مشروع Amanah Mobility Platform)
 * مع مطابقة الألوان للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) مطابقة للتصميم — بلا منطق أعمال.
 */

// عنصر في قائمة الملف الشخصي.
function MenuItem({
  icon,
  label,
  trailing,
  danger,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  trailing?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between border-t border-neutral-100 p-4 first:border-t-0 active:bg-neutral-50 dark:border-neutral-700 dark:active:bg-neutral-700/40"
    >
      <View className="flex-row items-center gap-4">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${
            danger ? 'bg-red-100 dark:bg-red-900/40' : 'bg-brand-50 dark:bg-brand-900/40'
          }`}
        >
          <MaterialIcons
            name={icon}
            size={22}
            color={danger ? '#dc2626' : passengerPurple[700]}
          />
        </View>
        <Text className="font-plex text-base text-neutral-900 dark:text-neutral-50">{label}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        {trailing ? (
          <Text className="font-plex-medium text-xs text-neutral-400">{trailing}</Text>
        ) : null}
        <MaterialIcons name="chevron-left" size={22} color="#9ca3af" />
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="menu" size={24} color={passengerPurple[700]} />
        </Pressable>
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">أمانة</Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="notifications" size={24} color={passengerPurple[700]} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* رأس الملف الشخصي */}
        <View className="mb-6 items-center">
          <View className="mb-4">
            <View className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-brand-100 shadow-lg dark:border-neutral-800">
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1Oi_Ro-qPTU2Y-yNIs6ZCeEDanJkaBu5Gm8U-yPJvqMlDTSamCpVql6GZ1SUzDPNx4zYsbgvNdHrCS19Q-3Ryblkx_aKHtWgMt3gowlOAn9bWl34MgC-EJNvkQSKTDoZfetJ5fDvB6GaNEToUwYCebBtDvu6E8CqgC-iCAQyLsD2t5qc12DqnV_KBc9-SYFr2ah7EYDuwtGFwEXYIIcYSREFayQjhJ5OJgG7SQRpH_pT4FxOObqPdKH5EFpTTbhNEheKpSJzU1C2j',
                }}
                className="h-full w-full"
                resizeMode="cover"
              />
            </View>
            <Pressable className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full bg-brand-600 shadow-md active:scale-95">
              <MaterialIcons name="edit" size={18} color="#ffffff" />
            </Pressable>
          </View>
          <Text className="mb-1 font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
            نورة الفيصل
          </Text>
          <Text className="mb-2 font-plex text-sm text-neutral-500 dark:text-neutral-400">
            noura.alfaisal@email.com
          </Text>
          <View className="flex-row items-center gap-1 rounded-full bg-brand-50 px-3 py-1 dark:bg-brand-900/40">
            <MaterialIcons name="calendar-today" size={14} color={passengerPurple[700]} />
            <Text className="font-plex-medium text-xs text-brand-700 dark:text-brand-200">
              انضم في أكتوبر 2023
            </Text>
          </View>
        </View>

        {/* بطاقات الإحصائيات */}
        <View className="mb-6 flex-row gap-4">
          <View className="flex-1 items-center justify-center rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-300">٤٨</Text>
            <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
              رحلة مكتملة
            </Text>
          </View>
          <View className="flex-1 items-center justify-center rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-300">
              ٤.٩
            </Text>
            <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
              التقييم
            </Text>
          </View>
        </View>

        {/* قائمة الملف الشخصي */}
        <View className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <Text className="border-b border-neutral-100 px-4 py-4 font-plex-semibold text-xl text-neutral-900 dark:border-neutral-700 dark:text-neutral-50">
            الملف الشخصي
          </Text>
          <MenuItem icon="person" label="تعديل الملف الشخصي" />
          <MenuItem
            icon="payments"
            label="طرق الدفع"
            trailing="مدى ****٤٣٢١"
            onPress={() => router.push('/payment')}
          />
          <MenuItem icon="settings" label="الإعدادات" onPress={() => router.push('/settings')} />
          <MenuItem icon="star" label="الأماكن المفضلة" />
          <MenuItem icon="contact-phone" label="جهات اتصال الطوارئ" danger />
        </View>

        {/* زر تسجيل الخروج */}
        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="h-14 flex-row items-center justify-center gap-2 rounded-xl border border-red-500 active:bg-red-50 dark:active:bg-red-900/20"
        >
          <MaterialIcons name="logout" size={22} color="#dc2626" />
          <Text className="font-plex-semibold text-xl text-red-600">تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
