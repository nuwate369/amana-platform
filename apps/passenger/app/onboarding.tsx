import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «الترحيب» (Onboarding) — تحويل مطابق لتصميم Stitch
 * (Onboarding Screens، مشروع Amanah Mobility Platform)
 * مع مطابقة الألوان للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * شرائح تعريفية ثابتة مطابقة للتصميم — بلا منطق أعمال.
 */

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  icon: keyof typeof MaterialIcons.glyphMap;
  badgeIcon: keyof typeof MaterialIcons.glyphMap;
  badge: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'directions-car',
    badgeIcon: 'verified-user',
    badge: 'أمانك أولويتنا',
    title: 'أمانك أولويتنا',
    body: 'استمتعي برحلات آمنة وموثوقة مع نخبة من السائقات السعوديات المؤهلات.',
  },
  {
    icon: 'lock',
    badgeIcon: 'lock',
    badge: 'خصوصية تامة',
    title: 'خصوصية تامة',
    body: 'تنقلي بكل راحة وطمأنينة في بيئة مخصصة تحترم خصوصيتك في كل وقت.',
  },
  {
    icon: 'auto-awesome',
    badgeIcon: 'auto-awesome',
    badge: 'المخطط الذكي',
    title: 'المخطط الذكي',
    body: 'رحلات منظمة ومدارة بذكاء اصطناعي لضمان وصولك في الوقت المحدد دائماً.',
  },
];

// شريحة واحدة داخل الكاروسيل.
function SlideView({ slide }: { slide: Slide }) {
  return (
    <View style={{ width: SCREEN_WIDTH }} className="items-center px-5">
      {/* الرسم التوضيحي (مستبدَل بواجهة مبسّطة + أيقونة) */}
      <View className="mb-12 aspect-square w-full items-center justify-center">
        <LinearGradient
          colors={[passengerPurple[700], passengerPurple[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24 }}
          className="h-full w-full items-center justify-center overflow-hidden shadow-xl"
        >
          <MaterialIcons name={slide.icon} size={96} color="#ffffff" />
        </LinearGradient>

        {/* الشارة الزخرفية */}
        <View className="absolute -bottom-4 flex-row items-center gap-2 rounded-full bg-brand-100 px-4 py-2 shadow-lg dark:bg-brand-900">
          <MaterialIcons name={slide.badgeIcon} size={16} color={passengerPurple[700]} />
          <Text className="font-plex-medium text-xs text-brand-700 dark:text-brand-200">
            {slide.badge}
          </Text>
        </View>
      </View>

      {/* النص */}
      <View className="items-center gap-4">
        <Text className="text-center font-plex-semibold text-[26px] leading-8 text-brand-700 dark:text-brand-200">
          {slide.title}
        </Text>
        <Text className="px-4 text-center font-plex text-base leading-6 text-neutral-500 dark:text-neutral-400">
          {slide.body}
        </Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(0);
  const isLast = current === SLIDES.length - 1;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrent(index);
  };

  const goNext = () => {
    if (isLast) {
      router.replace('/');
      return;
    }
    const next = current + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setCurrent(next);
  };

  const skip = () => {
    const last = SLIDES.length - 1;
    scrollRef.current?.scrollTo({ x: last * SCREEN_WIDTH, animated: true });
    setCurrent(last);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top', 'bottom']}>
      {/* الشريط العلوي: الشعار وزرّ التخطي */}
      <View className="z-20 flex-row items-center justify-between px-5 pt-4">
        <Text className="font-plex-bold text-[26px] text-brand-700 dark:text-brand-200">أمانة</Text>
        <Pressable onPress={skip} className="px-4 py-2 active:opacity-60">
          <Text className="font-plex-medium text-xs tracking-widest text-neutral-500 dark:text-neutral-400">
            تخطي
          </Text>
        </Pressable>
      </View>

      {/* الكاروسيل */}
      <View className="flex-1 justify-center">
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
        >
          {SLIDES.map((slide) => (
            <SlideView key={slide.title} slide={slide} />
          ))}
        </ScrollView>
      </View>

      {/* عناصر التحكم السفلية */}
      <View className="z-20 gap-10 px-5 pb-8 pt-8">
        {/* نقاط الترقيم */}
        <View className="flex-row items-center justify-center gap-2">
          {SLIDES.map((slide, index) => (
            <View
              key={slide.title}
              className={
                index === current
                  ? 'h-2 w-6 rounded-full bg-brand-600'
                  : 'h-2 w-2 rounded-full bg-brand-100 dark:bg-neutral-700'
              }
            />
          ))}
        </View>

        {/* زرّ الإجراء */}
        <Pressable
          onPress={goNext}
          className="h-14 flex-row items-center justify-center gap-2 rounded-xl bg-brand-600 shadow-lg active:scale-95"
        >
          <Text className="font-plex-semibold text-xl text-white">
            {isLast ? 'ابدأ الآن' : 'التالي'}
          </Text>
          <MaterialIcons name={isLast ? 'login' : 'arrow-back'} size={22} color="#ffffff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
