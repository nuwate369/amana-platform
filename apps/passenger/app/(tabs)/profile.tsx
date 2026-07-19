import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { supabase } from '@/lib/supabase';
import { getMyProfile, type MyProfile } from '@/lib/account';

/**
 * شاشة «الملف الشخصي» — بيانات حقيقية للراكبة (الاسم/البريد/تاريخ الانضمام +
 * إحصاءات: رحلات مكتملة ومتوسّط تقييم) من Supabase. لا بيانات وهمية.
 */

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
          <MaterialIcons name={icon} size={22} color={danger ? '#dc2626' : passengerPurple[700]} />
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

function joinedLabel(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `انضمّت في ${d.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}`;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // يُعاد الجلب عند كل دخول للشاشة (كي تُحدَّث الإحصاءات بعد رحلة جديدة).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getMyProfile().then((p) => {
        if (!alive) return;
        setProfile(p);
        setLoading(false);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const initials = (profile?.fullName ?? '؟').trim().charAt(0);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <View className="w-10" />
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">أمانة</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/notifications')}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="notifications" size={24} color={passengerPurple[700]} />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={passengerPurple[600]} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* رأس الملف الشخصي */}
          <View className="mb-6 items-center">
            <View className="mb-4">
              <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-brand-100 shadow-lg dark:border-neutral-800 dark:bg-brand-900/50">
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <Text className="font-plex-bold text-4xl text-brand-700 dark:text-brand-200">
                    {initials}
                  </Text>
                )}
              </View>
            </View>
            <Text className="mb-1 font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
              {profile?.fullName ?? 'راكبة أمانة'}
            </Text>
            <Text className="mb-2 font-plex text-sm text-neutral-500 dark:text-neutral-400">
              {profile?.email ?? '—'}
            </Text>
            <View className="flex-row items-center gap-1 rounded-full bg-brand-50 px-3 py-1 dark:bg-brand-900/40">
              <MaterialIcons name="calendar-today" size={14} color={passengerPurple[700]} />
              <Text className="font-plex-medium text-xs text-brand-700 dark:text-brand-200">
                {joinedLabel(profile?.joinedAt ?? null)}
              </Text>
            </View>
          </View>

          {/* بطاقات الإحصائيات الحقيقية */}
          <View className="mb-6 flex-row gap-4">
            <View className="flex-1 items-center justify-center rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
              <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-300">
                {profile?.trips ?? 0}
              </Text>
              <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
                رحلة مكتملة
              </Text>
            </View>
            <View className="flex-1 items-center justify-center rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
              <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-300">
                {profile?.rating != null ? profile.rating.toFixed(1) : '—'}
              </Text>
              <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
                التقييم
              </Text>
            </View>
          </View>

          {/* قائمة الملف الشخصي */}
          <View className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <Text className="border-b border-neutral-100 px-4 py-4 font-plex-semibold text-xl text-neutral-900 dark:border-neutral-700 dark:text-neutral-50">
              الحساب
            </Text>
            <MenuItem
              icon="receipt-long"
              label="سجلّ الرحلات"
              onPress={() => router.push('/(tabs)/ride-history')}
            />
            <MenuItem icon="settings" label="الإعدادات" onPress={() => router.push('/settings')} />
            <MenuItem
              icon="notifications"
              label="التنبيهات"
              onPress={() => router.push('/(tabs)/notifications')}
            />
            <MenuItem
              icon="support-agent"
              label="الدعم الفني"
              onPress={() => router.push('/support' as Href)}
            />
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
      )}
    </SafeAreaView>
  );
}
