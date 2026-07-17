import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { submitRating } from '@/lib/rides';

/**
 * شاشة «تقييم الرحلة» — تحويل مطابق لتصميم Stitch
 * (Rating Screen, مشروع Amanah Mobility Platform)
 * الألوان مطابقة للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * حالة النجوم والوسوم محليّة للواجهة فقط — بلا منطق أعمال.
 */

const FEEDBACK_CHIPS = ['احترافية', 'قيادة آمنة', 'سيارة نظيفة', 'التزام بالموعد', 'خلوقة'];

export default function RatingScreen() {
  const { rideId, driverId } = useLocalSearchParams<{ rideId?: string; driverId?: string }>();
  const [rating, setRating] = useState(0);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleChip = (chip: string) =>
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );

  async function onSubmit() {
    if (busy) return;
    setBusy(true);
    if (rideId && driverId && rating > 0) {
      const note = [selectedChips.join('، '), comment.trim()].filter(Boolean).join(' — ');
      const res = await submitRating(rideId, driverId, rating, note);
      if (res.error) {
        Alert.alert('تعذّر إرسال التقييم', res.error);
        setBusy(false);
        return;
      }
    }
    router.replace(rideId ? `/payment?rideId=${rideId}` : '/payment');
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="close" size={24} color={passengerPurple[700]} />
        </Pressable>
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">
          تقييم الرحلة
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ملف السائقة */}
        <View className="items-center">
          <View className="relative">
            <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-neutral-200 shadow-lg dark:border-neutral-800 dark:bg-neutral-700">
              <MaterialIcons name="person" size={56} color={passengerPurple[400]} />
            </View>
            <View className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-brand-600 p-1 dark:border-neutral-800">
              <MaterialIcons name="verified" size={16} color="#ffffff" />
            </View>
          </View>
          <Text className="mt-4 font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
            سائقتك
          </Text>
          <Text className="mt-1 font-plex text-sm text-neutral-500 dark:text-neutral-400">
            شكرًا لرحلتك مع أمانة
          </Text>
        </View>

        {/* نظام النجوم */}
        <View className="items-center py-6">
          <Text className="mb-3 font-plex-medium text-xs tracking-wider text-neutral-500 dark:text-neutral-400">
            كيف كانت تجربتك؟
          </Text>
          <View className="flex-row-reverse gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                onPress={() => setRating(value)}
                className="active:scale-110"
              >
                <MaterialIcons
                  name="star"
                  size={40}
                  color={value <= rating ? '#f59e0b' : passengerPurple[200]}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* وسوم الملاحظات السريعة */}
        <View className="mb-6">
          <Text className="mb-3 font-plex-medium text-xs tracking-wider text-neutral-500 dark:text-neutral-400">
            اختر ما أعجبك:
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {FEEDBACK_CHIPS.map((chip) => {
              const active = selectedChips.includes(chip);
              return (
                <Pressable
                  key={chip}
                  onPress={() => toggleChip(chip)}
                  className={
                    active
                      ? 'rounded-full border border-brand-600 bg-brand-600 px-4 py-2'
                      : 'rounded-full border border-neutral-300 px-4 py-2 dark:border-neutral-600'
                  }
                >
                  <Text
                    className={
                      active
                        ? 'font-plex text-sm text-white'
                        : 'font-plex text-sm text-neutral-500 dark:text-neutral-400'
                    }
                  >
                    {chip}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* تعليقات إضافية */}
        <View className="mb-4">
          <Text className="mb-3 font-plex-medium text-xs tracking-wider text-neutral-500 dark:text-neutral-400">
            تعليقات إضافية (اختياري):
          </Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="اكتب ملاحظاتك هنا..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlign="right"
            className="h-28 rounded-xl border border-neutral-300 bg-white p-4 font-plex text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            style={{ textAlignVertical: 'top' }}
          />
        </View>
      </ScrollView>

      {/* شريط الإجراء الثابت أسفل الشاشة */}
      <View className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-white px-5 pb-8 pt-4 dark:bg-neutral-800">
        <Pressable
          onPress={onSubmit}
          disabled={busy}
          className="h-14 flex-row items-center justify-center gap-2 rounded-xl bg-brand-600 active:scale-[0.98]"
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text className="font-plex-semibold text-xl text-white">إرسال التقييم</Text>
              <MaterialIcons name="send" size={22} color="#ffffff" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
