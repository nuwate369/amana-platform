import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { useAuth } from '@/lib/auth';

/**
 * الشاشة الرئيسية — تُعرض فقط بعد اعتماد السائقة (status = approved).
 * في المرحلة أ هي شاشة ترحيب تؤكّد الاعتماد؛ تُبنى ميزات القيادة الفعلية
 * (استقبال الطلبات، الأرباح، الرحلات) في المرحلة ب.
 */
export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? 'شريكتنا السائقة';

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
        <Pressable
          onPress={signOut}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="logout" size={22} color={driverNavy[500]} />
        </Pressable>
        <Text className="font-plex-bold text-2xl text-brand-700 dark:text-brand-200">أمانة</Text>
        <View className="h-10 w-10" />
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <MaterialIcons name="verified" size={56} color="#16a34a" />
        </View>
        <Text className="mt-6 text-center font-plex-bold text-2xl text-neutral-900 dark:text-neutral-50">
          أهلًا {name}
        </Text>
        <Text className="mt-2 text-center font-plex-medium text-lg text-green-700 dark:text-green-400">
          تم اعتماد حسابك بنجاح
        </Text>
        <Text className="mt-4 max-w-xs text-center font-plex text-base leading-7 text-neutral-500 dark:text-neutral-400">
          حسابك مفعّل الآن. ميزات القيادة واستقبال الطلبات والأرباح ستتوفّر قريبًا في التحديث القادم.
        </Text>
      </View>
    </SafeAreaView>
  );
}
