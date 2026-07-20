import '../global.css';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import Toast from 'react-native-toast-message';
import { UpdateGate } from '@amana/shared-ui/UpdateGate';
import { usePushNotifications } from '@amana/shared-ui/usePushNotifications';
import { driverNavy } from '@amana/shared-ui/tokens';
import { supabase } from '@/lib/supabase';
import { i18n } from '@/lib/i18n';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PreferencesProvider, usePreferences } from '@/lib/preferences';
import { NotificationsProvider } from '@/lib/notifications';
import { useProtectedRoute } from '@/lib/useProtectedRoute';

/** شاشة انتظار بسيطة أثناء تحميل الخطوط أو قراءة التفضيلات. */
function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-brand-900">
      <ActivityIndicator color="#254594" />
    </View>
  );
}

/** مكوّن داخلي يشغّل حارس المسارات ثم يعرض شجرة التنقّل. */
function RootNavigator() {
  useProtectedRoute();

  // الإشعارات الفورية — بعد تسجيل الدخول فقط.
  const { session } = useAuth();
  usePushNotifications({
    supabase,
    app: 'driver',
    enabled: Boolean(session),
    onOpen: () => router.push('/notifications'),
  });

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="kyc" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="about" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}

/** بوّابة: تنتظر جاهزية التفضيلات (المظهر/اللغة/الاتجاه) قبل عرض التطبيق. */
function Gate() {
  const { ready } = usePreferences();
  if (!ready) return <LoadingScreen />;
  return <RootNavigator />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <PreferencesProvider>
        <AuthProvider>
          <NotificationsProvider>
            <SafeAreaProvider>
              <StatusBar style="auto" />
              <Gate />
              <UpdateGate app="driver" supabase={supabase} accent={driverNavy[600]} />
              <Toast />
            </SafeAreaProvider>
          </NotificationsProvider>
        </AuthProvider>
      </PreferencesProvider>
    </I18nextProvider>
  );
}
