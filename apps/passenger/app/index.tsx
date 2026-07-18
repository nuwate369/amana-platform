import { ActivityIndicator, View } from 'react-native';
import { passengerPurple } from '@amana/shared-ui/tokens';

/**
 * شاشة بداية صامتة — حارس المسارات (useProtectedRoute) يتكفّل بالتوجيه حسب
 * الجلسة وحالة التفعيل: تسجيل الدخول / شاشة الانتظار / الرئيسية.
 */
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
      <ActivityIndicator color={passengerPurple[600]} />
    </View>
  );
}
