import { MaterialIcons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/toast';

const CODE_LENGTH = 6; // مضبوط على 6 في Supabase (Email OTP Length)
const RESEND_COOLDOWN = 120; // ثانية (دقيقتان) — مطابق للحدّ الأدنى الخادمي بين الرسائل

/** تنسيق العدّاد m:ss. */
function fmtCountdown(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * شاشة تأكيد البريد برمز OTP (6 أرقام) بدل رابط التفعيل — يتجنّب مشكلة الـ deep link.
 * البريد يأتي كوسيط من شاشة التسجيل. عند إدخال 6 أرقام يُستدعى verifyOtp تلقائيًا؛
 * نجاحه يُنشئ الجلسة فتتكفّل بوابة التوجيه بنقل السائقة إلى شاشة KYC.
 */
export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { email: emailParam, justSent } = useLocalSearchParams<{ email?: string; justSent?: string }>();
  const email = (emailParam ?? '').trim();

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  // قادمة من التسجيل (رمز أُرسل للتوّ) ⇐ نبدأ العدّاد؛ قادمة من الدخول ⇐ إعادة الإرسال متاحة فورًا.
  const [cooldown, setCooldown] = useState(justSent === '1' ? RESEND_COOLDOWN : 0);

  // عدّاد تنازلي لإعادة الإرسال.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // منع تكرار التحقّق لنفس الرمز.
  const lastVerified = useRef<string>('');

  async function verify(token: string) {
    if (!email || token.length !== CODE_LENGTH || verifying) return;
    if (lastVerified.current === token) return;
    lastVerified.current = token;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    setVerifying(false);
    if (error) {
      lastVerified.current = '';
      const m = error.message.toLowerCase();
      notify.error(m.includes('expired') ? t('auth.mfaExpired') : t('auth.mfaInvalid'));
      setCode('');
      return;
    }
    // نجاح ⇐ أُنشئت الجلسة؛ onAuthStateChange في AuthProvider ينقل البوابة إلى /kyc.
    notify.success(t('auth.verifyEmailSuccess'));
  }

  function onChangeCode(text: string) {
    const digits = text.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) verify(digits); // تحقّق تلقائي عند اكتمال الرمز
  }

  async function onResend() {
    if (!email || cooldown > 0 || resending) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) {
      notify.error(error.message);
      return;
    }
    notify.success(t('auth.mfaSent'));
    setCode('');
    lastVerified.current = '';
    setCooldown(RESEND_COOLDOWN);
  }

  const canVerify = code.length === CODE_LENGTH && !verifying;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <KeyboardAvoidingView
        className="flex-1 items-center justify-center gap-5 px-8"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-brand-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <MaterialIcons name="mark-email-unread" size={48} color={driverNavy[700]} />
        </View>

        <Text className="text-center font-plex-bold text-2xl text-brand-700 dark:text-brand-200">
          {t('auth.verifyEmailTitle')}
        </Text>
        <Text className="text-center font-plex text-base leading-7 text-neutral-500 dark:text-neutral-400">
          {t('auth.verifyEmailBody')}
        </Text>
        {email ? (
          <Text className="-mt-2 text-center font-plex-semibold text-sm text-brand-700 dark:text-brand-300">
            {email}
          </Text>
        ) : null}

        {/* حقل الرمز (6 أرقام) */}
        <TextInput
          className="h-16 w-full rounded-xl border border-neutral-200 bg-white text-center font-plex-bold text-3xl text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          style={{ letterSpacing: 8 }}
          placeholder="000000"
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          value={code}
          onChangeText={onChangeCode}
          autoFocus
          textAlign="center"
        />

        {/* زر التحقّق */}
        <Pressable
          onPress={() => verify(code)}
          disabled={!canVerify}
          className={`h-14 w-full flex-row items-center justify-center gap-2 rounded-xl ${
            canVerify ? 'bg-brand-700 active:scale-[0.98] dark:bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
          }`}
        >
          {verifying ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text
              className={`font-plex-semibold text-lg ${
                canVerify ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {t('auth.mfaVerify')}
            </Text>
          )}
        </Pressable>

        {/* إعادة إرسال الرمز — الزر معطّل مع عدّاد تنازلي حتى انقضاء دقيقتين */}
        <Pressable
          onPress={onResend}
          disabled={cooldown > 0 || resending}
          className="mt-1 flex-row items-center gap-1.5"
        >
          <MaterialIcons
            name="refresh"
            size={16}
            color={cooldown > 0 ? '#9ca3af' : driverNavy[600]}
          />
          <Text
            className={`font-plex-bold text-sm ${
              cooldown > 0
                ? 'text-neutral-400 dark:text-neutral-500'
                : 'text-brand-700 dark:text-brand-300'
            }`}
          >
            {resending
              ? '…'
              : cooldown > 0
                ? `${t('auth.mfaResend')}  ${fmtCountdown(cooldown)}`
                : t('auth.mfaResend')}
          </Text>
        </Pressable>

        <Link href="/(auth)/sign-in" className="mt-1 font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
          {t('auth.backToSignIn')}
        </Link>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
