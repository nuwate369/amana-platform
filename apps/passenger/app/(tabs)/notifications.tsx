import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة «الإشعارات» — تحويل مطابق لتصميم Stitch
 * (Notifications Screen، مشروع Amanah Mobility Platform)
 * مع مطابقة الألوان للوحة الراكبة الأرجوانية والخط IBM Plex Sans Arabic.
 * البيانات ثابتة (mock) مطابقة للتصميم — بلا منطق أعمال.
 */

// شريحة تصفية.
function FilterChip({ label, active }: { label: string; active?: boolean }) {
  if (active) {
    return (
      <View className="rounded-full bg-brand-600 px-4 py-1.5 shadow-sm">
        <Text className="font-plex-medium text-xs text-white">{label}</Text>
      </View>
    );
  }
  return (
    <Pressable className="rounded-full bg-neutral-100 px-4 py-1.5 active:bg-neutral-200 dark:bg-neutral-800 dark:active:bg-neutral-700">
      <Text className="font-plex-medium text-xs text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
    </Pressable>
  );
}

// بطاقة إشعار.
function NotifCard({
  icon,
  iconBg,
  iconColor,
  title,
  time,
  body,
  unread,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  time: string;
  body: string;
  unread?: boolean;
}) {
  return (
    <Pressable
      className={`relative flex-row items-start gap-4 rounded-xl p-4 active:scale-[0.98] ${
        unread
          ? 'border border-brand-100 bg-brand-50 shadow-sm dark:border-brand-800 dark:bg-brand-900/30'
          : 'border border-neutral-100 bg-white dark:border-neutral-700 dark:bg-neutral-800'
      }`}
    >
      {unread ? (
        <View className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1 rounded-full bg-brand-700" />
      ) : null}
      <View
        className="h-12 w-12 items-center justify-center rounded-lg"
        style={{ backgroundColor: iconBg }}
      >
        <MaterialIcons name={icon} size={24} color={iconColor} />
      </View>
      <View className="flex-1">
        <View className="mb-1 flex-row items-start justify-between">
          <Text
            className={`flex-1 font-plex-semibold text-base leading-tight ${
              unread
                ? 'text-brand-700 dark:text-brand-200'
                : 'text-neutral-900 dark:text-neutral-50'
            }`}
          >
            {title}
          </Text>
          <Text className="ml-2 font-plex-medium text-xs text-neutral-400">{time}</Text>
        </View>
        <Text className="font-plex text-sm leading-5 text-neutral-500 dark:text-neutral-400">
          {body}
        </Text>
      </View>
    </Pressable>
  );
}

// عنوان قسم زمني.
function TimeHeading({ label }: { label: string }) {
  return (
    <Text className="px-2 font-plex-medium text-xs uppercase tracking-wider text-neutral-400">
      {label}
    </Text>
  );
}

export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
          >
            <MaterialIcons name="arrow-forward" size={24} color={passengerPurple[700]} />
          </Pressable>
          <Text className="font-plex-semibold text-xl text-brand-700 dark:text-brand-200">
            الإشعارات
          </Text>
        </View>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800">
          <MaterialIcons name="done-all" size={24} color={passengerPurple[700]} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* شرائح التصفية */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
          className="mb-4"
        >
          <FilterChip label="الكل" active />
          <FilterChip label="الرحلات" />
          <FilterChip label="العروض" />
          <FilterChip label="تحديثات النظام" />
        </ScrollView>

        {/* اليوم */}
        <View className="mb-2 gap-4">
          <TimeHeading label="اليوم" />
          <NotifCard
            icon="directions-car"
            iconBg={passengerPurple[600]}
            iconColor="#ffffff"
            title="تم تأكيد رحلتك"
            time="الآن"
            body="تم تخصيص الكابتن سارة لرحلتك المتجهة إلى مطار الملك خالد. ستصل خلال 10 دقائق."
            unread
          />
          <NotifCard
            icon="redeem"
            iconBg="#fce7ec"
            iconColor="#b78c95"
            title="خصم خاص لكِ"
            time="منذ ساعة"
            body="استمتعي بخصم 20% على رحلتك القادمة باستخدام الكود AMANA20. صالح لمدة 48 ساعة."
            unread
          />
        </View>

        {/* أمس */}
        <View className="mt-4 gap-4">
          <TimeHeading label="أمس" />
          <NotifCard
            icon="system-update"
            iconBg="#f3f4f6"
            iconColor="#6b7280"
            title="تحديث جديد للتطبيق"
            time="أمس، 4:30 م"
            body="أضفنا ميزات أمان جديدة وخيارات تتبع مباشرة لضمان أقصى درجات الطمأنينة."
          />
          <NotifCard
            icon="notifications"
            iconBg="#f3f4f6"
            iconColor="#6b7280"
            title="اكتمال التحقق من الهوية"
            time="أمس، 11:15 ص"
            body='تم التحقق من بياناتك بنجاح. يمكنك الآن الاستمتاع بكافة خدمات "أمانة" بكل ثقة.'
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
