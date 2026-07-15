import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverNavy } from '@amana/shared-ui/tokens';
import { listMyTickets, MAX_OPEN_TICKETS, type Ticket, type TicketStatus } from '@/lib/support';

/** الحالات التي تُحتسب ضمن حدّ التذاكر المفتوحة. */
const OPEN_STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved'];

/** ألوان وتسميات حالات التذكرة الخمس. */
function statusMeta(status: TicketStatus, t: TFunction) {
  const map: Record<TicketStatus, { label: string; className: string }> = {
    open: { label: t('support.status.new', 'جديد'), className: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' },
    in_progress: { label: t('support.status.inProgress', 'قيد العمل'), className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    resolved: { label: t('support.status.resolved', 'بانتظار ردّك'), className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
    closed: { label: t('support.status.closed', 'منتهية'), className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    cancelled: { label: t('support.status.cancelled', 'ملغاة'), className: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' },
  };
  return map[status];
}

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** شاشة «الدعم الفني» — قائمة تذاكري + زر إنشاء تذكرة. */
export default function SupportListScreen() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // إعادة الجلب كلّما عادت الشاشة للواجهة (بعد إنشاء تذكرة مثلًا).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      listMyTickets().then((data) => {
        if (!active) return;
        setTickets(data);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  // بلوغ حدّ التذاكر المفتوحة ⇒ نعطّل زرّ الإنشاء (لا ننقلها للنموذج ثم نفشل).
  const openCount = tickets.filter((tk) => OPEN_STATUSES.includes(tk.status)).length;
  const atLimit = openCount >= MAX_OPEN_TICKETS;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={driverNavy[600]} />
        </Pressable>
        <Text className="font-plex-bold text-xl text-neutral-900 dark:text-neutral-50">
          {t('support.title', 'الدعم الفني')}
        </Text>
        <View className="h-10 w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={driverNavy[500]} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {tickets.length === 0 ? (
            <View className="mt-24 items-center gap-3">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-50 dark:bg-neutral-800">
                <MaterialIcons name="support-agent" size={44} color={driverNavy[400]} />
              </View>
              <Text className="font-plex-medium text-base text-neutral-500 dark:text-neutral-400">
                {t('support.empty', 'لا توجد تذاكر دعم فني حالياً.')}
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {tickets.map((tk) => {
                const meta = statusMeta(tk.status, t);
                return (
                  <Pressable
                    key={tk.id}
                    onPress={() => router.push({ pathname: '/support/[id]', params: { id: tk.id } })}
                    className="rounded-xl border border-neutral-200 bg-white p-4 active:scale-[0.99] dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    <View className="flex-row items-center justify-between gap-2">
                      <Text
                        numberOfLines={1}
                        className="flex-1 font-plex-semibold text-base text-neutral-900 dark:text-neutral-50"
                      >
                        {tk.subject}
                      </Text>
                      <View className={`rounded-full px-2.5 py-0.5 ${meta.className}`}>
                        <Text className="font-plex-medium text-[11px]">{meta.label}</Text>
                      </View>
                    </View>
                    {tk.ticketNumber ? (
                      <Text className="mt-0.5 font-plex-medium text-xs uppercase tracking-wider text-brand-600 dark:text-brand-400">
                        {tk.ticketNumber}
                      </Text>
                    ) : null}
                    <Text
                      numberOfLines={2}
                      className="mt-1 font-plex text-sm leading-6 text-neutral-500 dark:text-neutral-400"
                    >
                      {tk.description}
                    </Text>
                    <Text className="mt-2 font-plex text-xs text-neutral-400 dark:text-neutral-500">
                      {fmtDate(tk.createdAt)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* زر إنشاء تذكرة ثابت أسفل الشاشة — يُعطّل عند بلوغ الحدّ */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-neutral-50 px-5 pb-8 pt-3 dark:border-neutral-800 dark:bg-neutral-900">
        {atLimit ? (
          <Text className="mb-2 text-center font-plex text-xs leading-5 text-amber-600 dark:text-amber-400">
            {t('support.limitReached', { count: MAX_OPEN_TICKETS, defaultValue: 'بلغتِ الحدّ الأقصى ({{count}} تذاكر مفتوحة). أغلقي أو ألغِ تذكرة للمتابعة.' })}
          </Text>
        ) : null}
        <Pressable
          onPress={() => router.push('/support/new')}
          disabled={atLimit}
          className={`h-14 flex-row items-center justify-center gap-2 rounded-xl active:scale-[0.98] ${
            atLimit ? 'bg-neutral-300 dark:bg-neutral-700' : 'bg-brand-700 dark:bg-brand-600'
          }`}
        >
          <MaterialIcons name="add" size={22} color={atLimit ? '#9ca3af' : '#ffffff'} />
          <Text
            className={`font-plex-semibold text-base ${
              atLimit ? 'text-neutral-500 dark:text-neutral-400' : 'text-white'
            }`}
          >
            {t('support.createTicket', 'إنشاء تذكرة جديدة')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
