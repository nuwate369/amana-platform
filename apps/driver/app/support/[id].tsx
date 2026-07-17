import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import {
  cancelTicket,
  getTicket,
  listMessages,
  sendMessage,
  submitSurvey,
  type Ticket,
  type TicketCategory,
  type TicketMessage,
  type TicketStatus,
} from '@/lib/support';

function statusLabel(status: TicketStatus, t: TFunction): string {
  const map: Record<TicketStatus, string> = {
    open: t('support.status.new', 'جديد'),
    in_progress: t('support.status.inProgress', 'قيد العمل'),
    resolved: t('support.status.resolved', 'بانتظار ردّك'),
    closed: t('support.status.closed', 'منتهية'),
    cancelled: t('support.status.cancelled', 'ملغاة'),
  };
  return map[status];
}

function categoryLabel(cat: TicketCategory, t: TFunction): string {
  return t(`support.categories.${cat}`, cat);
}

function fmtTime(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** شاشة تفاصيل التذكرة — معلومات كاملة + محادثة + إلغاء + استبيان. */
export default function TicketDetailScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);

  // حالة الاستبيان المحلّية.
  const [rating, setRating] = useState(0);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveyHidden, setSurveyHidden] = useState(false);

  const closedLike = ticket?.status === 'closed' || ticket?.status === 'cancelled';
  // الإلغاء متاح فقط قبل أن يبدأ أي موظف العمل (حالة «جديد»).
  const cancellable = ticket?.status === 'open';
  const showSurvey =
    !!ticket?.surveySentAt && !ticket?.surveyAnsweredAt && !surveyHidden;

  async function refresh() {
    if (!id || !user) return;
    const [tk, msgs] = await Promise.all([getTicket(id), listMessages(id, user.id)]);
    setTicket(tk);
    setMessages(msgs);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // بثّ لحظي: أي رسالة جديدة على هذه التذكرة (ردّ الموظف) تُحدّث المحادثة فورًا.
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`ticket-thread-${id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSend() {
    if (!id || !user || !reply.trim() || sending) return;
    setSending(true);
    const res = await sendMessage(id, user.id, reply);
    setSending(false);
    if (!res.ok) {
      notify.error(res.message ?? t('common.error', 'حدث خطأ'));
      return;
    }
    setReply('');
    await refresh();
  }

  function onCancel() {
    if (!id) return;
    Alert.alert(
      t('support.cancelTitle', 'إلغاء التذكرة'),
      t('support.cancelConfirm', 'هل تريدين إلغاء هذه التذكرة؟ لا يمكن التراجع.'),
      [
        { text: t('common.back', 'رجوع'), style: 'cancel' },
        {
          text: t('support.cancelConfirmBtn', 'تأكيد الإلغاء'),
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const res = await cancelTicket(id);
            setBusy(false);
            if (!res.ok) {
              notify.error(res.message ?? t('common.error', 'حدث خطأ'));
              return;
            }
            notify.success(t('support.cancelled', 'تم إلغاء التذكرة'));
            await refresh();
          },
        },
      ],
      { cancelable: true },
    );
  }

  async function onSubmitSurvey() {
    if (!id || rating < 1) return;
    setBusy(true);
    const res = await submitSurvey(id, rating, surveyComment);
    setBusy(false);
    if (!res.ok) {
      notify.error(res.message ?? t('common.error', 'حدث خطأ'));
      return;
    }
    notify.success(t('support.surveyThanks', 'شكرًا لتقييمك!'));
    await refresh();
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={driverNavy[600]} />
        </Pressable>
        <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">
          {t('support.details', 'تفاصيل التذكرة')}
        </Text>
        <View className="h-10 w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={driverNavy[500]} />
        </View>
      ) : !ticket ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-plex text-base text-neutral-500 dark:text-neutral-400">
            {t('common.noData', 'لا توجد بيانات')}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* بطاقة معلومات التذكرة */}
            <View className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
              <View className="mb-2 flex-row items-center justify-between gap-2">
                <Text className="flex-1 font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">
                  {ticket.subject}
                </Text>
                <View className="rounded-full bg-brand-100 px-2.5 py-0.5 dark:bg-brand-900/40">
                  <Text className="font-plex-medium text-[11px] text-brand-700 dark:text-brand-300">
                    {statusLabel(ticket.status, t)}
                  </Text>
                </View>
              </View>

              {ticket.ticketNumber ? (
                <Text className="mb-2 font-plex-bold text-sm uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  {ticket.ticketNumber}
                </Text>
              ) : null}

              <Text className="font-plex text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                {ticket.description}
              </Text>

              {/* معلومات إضافية */}
              <View className="mt-3 gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-700">
                <InfoLine icon="category" label={t('support.form.category', 'النوع')} value={categoryLabel(ticket.category, t)} />
                <InfoLine icon="event" label={t('support.createdAt', 'تاريخ الإنشاء')} value={fmtTime(ticket.createdAt)} />
                <InfoLine icon="update" label={t('support.updatedAt', 'آخر تحديث')} value={fmtTime(ticket.updatedAt)} />
              </View>

              {/* إلغاء التذكرة (متاح ما لم تُغلق/تُلغَ) */}
              {cancellable ? (
                <Pressable
                  onPress={onCancel}
                  disabled={busy}
                  className="mt-3 h-11 flex-row items-center justify-center gap-1.5 rounded-lg border border-red-200 active:scale-[0.98] dark:border-red-900"
                >
                  <MaterialIcons name="cancel" size={18} color="#dc2626" />
                  <Text className="font-plex-medium text-sm text-red-600 dark:text-red-400">
                    {t('support.cancelTitle', 'إلغاء التذكرة')}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* استبيان الرضا (بعد الإغلاق، اختياري) */}
            {showSurvey ? (
              <View className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/20">
                <Text className="font-plex-bold text-base text-brand-800 dark:text-brand-200">
                  {t('support.surveyTitle', 'كيف كانت تجربتك مع الدعم؟')}
                </Text>
                <Text className="mt-1 font-plex text-xs text-neutral-500 dark:text-neutral-400">
                  {t('support.surveyOptional', 'الإجابة اختيارية.')}
                </Text>
                <View className="mt-3 flex-row justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setRating(n)} className="active:scale-90">
                      <MaterialIcons
                        name={n <= rating ? 'star' : 'star-border'}
                        size={36}
                        color={n <= rating ? '#f59e0b' : '#9ca3af'}
                      />
                    </Pressable>
                  ))}
                </View>
                <View className="mt-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                  <TextInput
                    className="min-h-[64px] font-plex text-sm text-neutral-900 dark:text-neutral-50"
                    placeholder={t('support.surveyCommentPlaceholder', 'تعليق (اختياري)...')}
                    placeholderTextColor="#9ca3af"
                    value={surveyComment}
                    onChangeText={setSurveyComment}
                    multiline
                    textAlignVertical="top"
                    textAlign="right"
                  />
                </View>
                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    onPress={() => setSurveyHidden(true)}
                    className="h-11 flex-1 items-center justify-center rounded-lg border border-neutral-300 active:scale-[0.98] dark:border-neutral-600"
                  >
                    <Text className="font-plex-medium text-sm text-neutral-600 dark:text-neutral-300">
                      {t('support.surveySkip', 'تخطّي')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={onSubmitSurvey}
                    disabled={rating < 1 || busy}
                    className={`h-11 flex-1 items-center justify-center rounded-lg active:scale-[0.98] ${
                      rating >= 1 ? 'bg-brand-700 dark:bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    {busy ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text
                        className={`font-plex-semibold text-sm ${
                          rating >= 1 ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {t('support.surveySubmit', 'إرسال التقييم')}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* شكر بعد تعبئة الاستبيان */}
            {ticket.surveyAnsweredAt ? (
              <View className="mb-4 flex-row items-center justify-center gap-2 rounded-xl bg-green-50 py-3 dark:bg-green-900/20">
                <MaterialIcons name="favorite" size={16} color="#16a34a" />
                <Text className="font-plex-medium text-sm text-green-700 dark:text-green-400">
                  {t('support.surveyThanks', 'شكرًا لتقييمك!')} ({ticket.surveyRating}/5)
                </Text>
              </View>
            ) : null}

            {/* الرسائل */}
            <View className="gap-3">
              {messages.map((m) => (
                <View
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    m.mine ? 'self-start bg-brand-700 dark:bg-brand-600' : 'self-end bg-white dark:bg-neutral-800'
                  }`}
                >
                  <Text
                    className={`font-plex text-sm leading-6 ${
                      m.mine ? 'text-white' : 'text-neutral-900 dark:text-neutral-50'
                    }`}
                  >
                    {m.message}
                  </Text>
                  <Text className={`mt-1 font-plex text-[10px] ${m.mine ? 'text-white/70' : 'text-neutral-400'}`}>
                    {fmtTime(m.createdAt)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* حقل الرد (يُخفى إن أُغلقت/أُلغيت) */}
          {closedLike ? (
            <View className="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <Text className="text-center font-plex text-sm text-neutral-500 dark:text-neutral-400">
                {ticket.status === 'cancelled'
                  ? t('support.ticketCancelledHint', 'أُلغيت هذه التذكرة.')
                  : t('support.ticketClosedHint', 'أُغلقت هذه التذكرة. افتحي تذكرة جديدة إن احتجتِ مساعدة أخرى.')}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-end gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <View className="max-h-28 flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                <TextInput
                  className="font-plex text-base text-neutral-900 dark:text-neutral-50"
                  placeholder={t('support.replyPlaceholder', 'اكتبي ردك هنا...')}
                  placeholderTextColor="#9ca3af"
                  value={reply}
                  onChangeText={setReply}
                  multiline
                  textAlign="right"
                />
              </View>
              <Pressable
                onPress={onSend}
                disabled={!reply.trim() || sending}
                className={`h-12 w-12 items-center justify-center rounded-full active:scale-95 ${
                  reply.trim() ? 'bg-brand-700 dark:bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                {sending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <MaterialIcons name="send" size={20} color="#ffffff" />
                )}
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

/** سطر معلومة بأيقونة/تسمية/قيمة. */
function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <MaterialIcons name={icon} size={15} color={driverNavy[400]} />
      <Text className="font-plex text-xs text-neutral-400 dark:text-neutral-500">{label}:</Text>
      <Text className="flex-1 font-plex-medium text-xs text-neutral-700 dark:text-neutral-300">{value}</Text>
    </View>
  );
}
