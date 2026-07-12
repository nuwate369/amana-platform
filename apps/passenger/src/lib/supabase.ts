import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseClient } from '@amana/supabase-client';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !anonKey) {
  // في التطوير نطبع تحذيرًا بدل الانهيار حتى تكتمل تهيئة .env.
  console.warn('[passenger] متغيرات Supabase غير مضبوطة — راجع .env.example');
}

export const supabase = createSupabaseClient({
  url,
  anonKey,
  storage: AsyncStorage,
  detectSessionInUrl: false,
});
