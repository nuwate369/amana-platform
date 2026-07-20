import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomInset, useScrollBottomPadding } from '@amana/shared-ui/layout';
import { driverNavy } from '@amana/shared-ui/tokens';
import { ratePassenger } from '@/lib/driver-rides';

/**
 * شاشة «تقييم الراكبة» (جهة السائقة) — الاتجاه المعاكس للتقييم بعد إنهاء الرحلة.
 * التقييم اختياري: يمكن الإرسال بلا نجوم (يتخطّى) والعودة للرئيسية. الهوية كحليّة
 * (لوحة السائقة) والخط IBM Plex Sans Arabic. تكتب في جدول `ratings` عبر ratePassenger.
 */

const FEEDBACK_CHIPS = ['حسن التعامل', 'الالتزام بالموعد', 'دقة نقطة الالتقاط', 'هادئة', 'محترمة'];

export default function RatePassengerScreen() {
  const { rideId, passengerId } = useLocalSearchParams<{ rideId?: string; passengerId?: string }>();
  const [rating, setRating] = useState(0);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomInset = useBottomInset(16);
  const scrollPad = useScrollBottomPadding(140);

  const toggleChip = (chip: string) =>
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip],
    );

  function goHome() {
    router.replace('/(tabs)/home');
  }

  async function onSubmit() {
    if (busy) return;
    setBusy(true);
    if (rideId && passengerId && rating > 0) {
      const note = [selectedChips.join('، '), comment.trim()].filter(Boolean).join(' — ');
      const res = await ratePassenger(rideId, passengerId, rating, note);
      if (res.error) {
        Alert.alert('تعذّر إرسال التقييم', res.error);
        setBusy(false);
        return;
      }
    }
    goHome();
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable
          onPress={goHome}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="close" size={24} color={driverNavy[700]} />
        </Pressable>
        <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">
          تقييم الراكبة
        </Text>
        <Pressable onPress={goHome} className="h-10 items-center justify-center rounded-full px-2">
          <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">تخطّي</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, ...scrollPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* ملف الراكبة */}
        <View className="items-center">
          <View className="relative">
            <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-neutral-200 shadow-lg dark:border-neutral-800 dark:bg-neutral-700">
              <MaterialIcons name="person" size={56} color={driverNavy[400]} />
            </View>
          </View>
          <Text className="mt-4 font-plex-semibold text-xl text-neutral-900 dark:text-neutral-50">
            راكبتك
          </Text>
          <Text className="mt-1 font-plex text-sm text-neutral-500 dark:text-neutral-400">
            شكرًا لإكمالك الرحلة بأمان
          </Text>
        </View>

        {/* نظام النجوم */}
        <View className="items-center py-6">
          <Text className="mb-3 font-plex-medium text-xs tracking-wider text-neutral-500 dark:text-neutral-400">
            كيف كانت الراكبة؟
          </Text>
          <View className="flex-row-reverse gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} onPress={() => setRating(value)} className="active:scale-110">
                <MaterialIcons
                  name="star"
                  size={40}
                  color={value <= rating ? '#f59e0b' : driverNavy[200]}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* وسوم الملاحظات السريعة */}
        <View className="mb-6">
          <Text className="mb-3 font-plex-medium text-xs tracking-wider text-neutral-500 dark:text-neutral-400">
            اختاري ما ينطبق:
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
            placeholder="اكتبي ملاحظاتك هنا..."
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
      <View
        className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-white px-5 pt-4 dark:bg-neutral-800"
        style={bottomInset}
      >
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
