import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * شاشة انتظار اعتماد حساب السائقة.
 * تُعرض عندما تكون حالة السائقة "قيد المراجعة" (pending).
 */
export default function Pending() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-brand-900">
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text className="text-center text-2xl font-bold text-brand-700 dark:text-brand-100">
          حسابك قيد المراجعة
        </Text>
        <Text className="text-center text-base text-brand-500 dark:text-brand-200">
          نراجع بياناتك حاليًا للتأكد من اكتمالها. سنُعلمك فور اعتماد حسابك لتتمكني من
          استقبال الرحلات.
        </Text>
      </View>
    </SafeAreaView>
  );
}
