import '../global.css';
import { Stack } from 'expo-router';
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
import { passengerPurple } from '@amana/shared-ui/tokens';
import { supabase } from '@/lib/supabase';
import { i18n } from '@/lib/i18n';
import { AuthProvider } from '@/lib/auth';
import { NotificationsProvider } from '@/lib/notifications';
import { useProtectedRoute } from '@/lib/useProtectedRoute';

/** مكوّن داخلي يشغّل حارس المسارات ثم يعرض شجرة التنقّل. */
function RootNavigator() {
  useProtectedRoute();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="request-ride" />
      <Stack.Screen name="matching" />
      <Stack.Screen name="tracking" />
      <Stack.Screen name="rating" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="ai-planner" />
      <Stack.Screen name="circles" />
      <Stack.Screen name="carbon" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="splash" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-brand-900">
        <ActivityIndicator color="#7838bf" />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <NotificationsProvider>
          <SafeAreaProvider>
            <StatusBar style="auto" />
            <RootNavigator />
            <UpdateGate app="passenger" supabase={supabase} accent={passengerPurple[600]} />
            <Toast />
          </SafeAreaProvider>
        </NotificationsProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}
