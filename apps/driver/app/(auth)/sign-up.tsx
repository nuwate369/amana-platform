import { MaterialIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUpSchema, type SignUpInput, translateError } from '@amana/shared-ui/validation';
import { driverNavy } from '@amana/shared-ui/tokens';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/toast';

const FIELDS: {
  name: keyof SignUpInput;
  labelKey: string;
  secure?: boolean;
  email?: boolean;
}[] = [
  { name: 'fullName', labelKey: 'auth.fullName' },
  { name: 'email', labelKey: 'auth.email', email: true },
  { name: 'password', labelKey: 'auth.password', secure: true },
  { name: 'confirmPassword', labelKey: 'auth.confirmPassword', secure: true },
];

export default function SignUpScreen() {
  const { t } = useTranslation();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: SignUpInput) {
    const { error } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      // user_type=driver ⇐ يُنشئ الـtrigger صفَّي profiles + drivers (status=pending).
      options: { data: { full_name: values.fullName, user_type: 'driver' } },
    });
    if (error) {
      notify.error(error.message || t('common.error'));
      return;
    }
    notify.success(t('auth.verifyEmailBody'));
    router.replace('/(auth)/verify-email');
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8 items-center gap-3">
          <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-brand-100 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="shield" size={40} color={driverNavy[700]} />
          </View>
          <Text className="font-plex-bold text-3xl text-neutral-900 dark:text-neutral-50">أمانة</Text>
          <Text className="font-plex-medium text-sm text-neutral-500 dark:text-neutral-400">
            انضمّي كشريكة سائقة
          </Text>
        </View>

        <Text className="mb-6 font-plex-bold text-2xl text-brand-700 dark:text-brand-200">
          {t('auth.signUpTitle')}
        </Text>

        {FIELDS.map((f) => (
          <View key={f.name} className="mb-4 gap-1">
            <Controller
              control={control}
              name={f.name}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="h-14 rounded-xl border border-neutral-200 bg-white px-4 font-plex text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                  placeholder={t(f.labelKey)}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={f.secure}
                  autoCapitalize={f.email ? 'none' : 'sentences'}
                  keyboardType={f.email ? 'email-address' : 'default'}
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                />
              )}
            />
            {errors[f.name] ? (
              <Text className="font-plex text-sm text-red-500">
                {translateError(t, errors[f.name]?.message)}
              </Text>
            ) : null}
          </View>
        ))}

        <Pressable
          className="mt-2 h-14 items-center justify-center rounded-xl bg-brand-700 active:scale-[0.98] dark:bg-brand-600"
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-plex-semibold text-lg text-white">{t('auth.signUpButton')}</Text>
          )}
        </Pressable>

        <View className="mt-6 flex-row justify-center gap-1">
          <Text className="font-plex text-neutral-500 dark:text-neutral-400">
            {t('auth.haveAccount')}
          </Text>
          <Link href="/(auth)/sign-in" className="font-plex-bold text-brand-700 dark:text-brand-300">
            {t('auth.signInButton')}
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
