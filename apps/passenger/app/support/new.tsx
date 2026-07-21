import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeyboardPush } from '@amana/shared-ui/layout';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/toast';
import { createTicket, type TicketCategory } from '@/lib/support';

/** شاشة «تذكرة جديدة» — الموضوع + النوع + الوصف. */
export default function NewTicketScreen() {
  const keyboardPush = useKeyboardPush();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('question');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories: { value: TicketCategory; label: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
    { value: 'complaint', label: t('support.categories.complaint', 'شكوى'), icon: 'report-problem' },
    { value: 'question', label: t('support.categories.question', 'استفسار'), icon: 'help-outline' },
    { value: 'suggestion', label: t('support.categories.suggestion', 'اقتراح'), icon: 'lightbulb' },
    { value: 'technical', label: t('support.categories.technical', 'مشكلة تقنية'), icon: 'build' },
  ];

  const canSubmit = subject.trim().length >= 3 && description.trim().length >= 10 && !submitting;

  async function onSubmit() {
    if (!user || !canSubmit) return;
    setSubmitting(true);
    const res = await createTicket(user.id, { subject, category, description });
    setSubmitting(false);
    if (!res.ok) {
      notify.error(res.message ?? t('common.error', 'حدث خطأ'));
      return;
    }
    notify.success(t('support.ticketCreated', 'تم إنشاء التذكرة بنجاح'));
    router.back();
  }

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
      edges={['top']}
      style={keyboardPush}
    >
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={passengerPurple[600]} />
        </Pressable>
        <Text className="font-plex-bold text-xl text-neutral-900 dark:text-neutral-50">
          {t('support.createTicket', 'إنشاء تذكرة جديدة')}
        </Text>
        <View className="h-10 w-10" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* الموضوع */}
          <Text className="mb-1.5 font-plex-medium text-sm text-neutral-700 dark:text-neutral-300">
            {t('support.form.subject', 'الموضوع')}
          </Text>
          <View className="mb-5 h-14 flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 dark:border-neutral-700 dark:bg-neutral-800">
            <MaterialIcons name="title" size={20} color={passengerPurple[400]} />
            <TextInput
              className="h-full flex-1 font-plex text-base text-neutral-900 dark:text-neutral-50"
              placeholder={t('support.form.subjectPlaceholder', 'مثال: مشكلة في تحديد الوجهة')}
              placeholderTextColor="#9ca3af"
              value={subject}
              onChangeText={setSubject}
              textAlign="right"
            />
          </View>

          {/* النوع */}
          <Text className="mb-2 font-plex-medium text-sm text-neutral-700 dark:text-neutral-300">
            {t('support.form.category', 'النوع')}
          </Text>
          <View className="mb-5 flex-row flex-wrap gap-2">
            {categories.map((c) => {
              const active = c.value === category;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  className={`h-11 flex-row items-center gap-1.5 rounded-xl border px-4 ${
                    active
                      ? 'border-brand-600 bg-brand-700 dark:bg-brand-600'
                      : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'
                  }`}
                >
                  <MaterialIcons name={c.icon} size={16} color={active ? '#ffffff' : passengerPurple[400]} />
                  <Text
                    className={`font-plex-medium text-sm ${
                      active ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* الوصف */}
          <Text className="mb-1.5 font-plex-medium text-sm text-neutral-700 dark:text-neutral-300">
            {t('support.form.description', 'الوصف')}
          </Text>
          <View className="mb-6 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
            <TextInput
              className="min-h-[120px] font-plex text-base text-neutral-900 dark:text-neutral-50"
              placeholder={t('support.form.descriptionPlaceholder', 'اشرحي المشكلة بالتفصيل...')}
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              textAlign="right"
            />
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            className={`h-14 flex-row items-center justify-center gap-2 rounded-xl active:scale-[0.98] ${
              canSubmit ? 'bg-brand-700 dark:bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color={canSubmit ? '#ffffff' : '#9ca3af'} />
                <Text
                  className={`font-plex-semibold text-base ${
                    canSubmit ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {t('support.form.submit', 'إنشاء التذكرة')}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
