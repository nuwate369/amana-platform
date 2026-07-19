import { MaterialIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { askSupportAi } from '@/lib/support';

/**
 * شاشة «الدعم الفني» للراكبة — محادثة مع مساعِدة الدعم الذكيّة (Groq عبر مسار
 * الإدارة /api/ai/support). تحاول حلّ المشكلة، وإن تعذّر تُصعّدها بإنشاء تذكرة فعلية
 * (من جهة الخادم) وتُظهر رقمها. التذاكر المُنشأة تظهر في «تذاكري».
 */

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: ChatMsg = {
  id: 'greeting',
  role: 'assistant',
  content: 'مرحبًا بكِ في دعم أمانة 💜 أنا مساعِدتكِ الذكيّة. اكتبي مشكلتكِ أو سؤالكِ وسأساعدكِ فورًا، وإن احتجتِ موظفًا بشريًّا سأفتح لكِ تذكرة.',
};

export default function SupportAiScreen() {
  const [chat, setChat] = useState<ChatMsg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const counter = useRef(0);
  const insets = useSafeAreaInsets();

  const nextId = () => `m${counter.current++}`;
  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMsg = { id: nextId(), role: 'user', content: text };
    const withUser = [...chat, userMsg];
    setChat(withUser);
    setInput('');
    setSending(true);
    scrollDown();

    // نُرسل المحادثة (دون رسالة الترحيب) كسياق للنموذج.
    const payload = withUser
      .filter((m) => m.id !== 'greeting')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await askSupportAi(payload);
    setSending(false);

    if (!res.ok || !res.data) {
      setChat((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', content: res.error ?? 'تعذّر الوصول للمساعِدة، حاولي لاحقًا.' },
      ]);
      scrollDown();
      return;
    }

    setChat((prev) => [...prev, { id: nextId(), role: 'assistant', content: res.data!.reply }]);
    if (res.data.escalated && res.data.ticketNumber) {
      setTicketNumber(res.data.ticketNumber);
    }
    scrollDown();
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-900">
      {/* الشريط العلوي بالتدرج الأرجواني المنحني */}
      <LinearGradient
        colors={[passengerPurple[800], passengerPurple[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }}
        className="overflow-hidden pb-6 shadow-lg"
      >
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
          >
            <MaterialIcons name="arrow-forward" size={24} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/support/tickets' as Href)}
            className="h-9 items-center justify-center rounded-full bg-white/20 px-4 active:bg-white/30"
          >
            <Text className="font-plex-medium text-sm text-white">تذاكري</Text>
          </Pressable>
        </View>

        <View className="mt-4 items-center gap-2">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
            <MaterialIcons name="support-agent" size={32} color={passengerPurple[600]} />
          </View>
          <Text className="font-plex-bold text-xl text-white">مساعدة أمانة الذكية</Text>
          <View className="flex-row items-center gap-1.5 rounded-full bg-white/20 px-3 py-1">
            <View className="h-2 w-2 rounded-full bg-green-400" />
            <Text className="font-plex-medium text-xs text-white">متصلة الآن</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollDown}
        >
          <View className="gap-4">
            {chat.map((m) => {
              const isUser = m.role === 'user';
              return (
                <View
                  key={m.id}
                  className={`max-w-[85%] rounded-3xl px-5 py-3.5 shadow-sm ${
                    isUser
                      ? 'self-start rounded-tr-sm bg-brand-600 dark:bg-brand-700'
                      : 'self-end rounded-tl-sm bg-white dark:bg-neutral-800'
                  }`}
                >
                  {!isUser && m.id === 'greeting' && (
                    <View className="mb-2 flex-row items-center gap-1.5 opacity-70">
                      <MaterialIcons name="auto-awesome" size={14} color={passengerPurple[600]} />
                      <Text className="font-plex-medium text-[10px] text-brand-700 dark:text-brand-300">
                        أمانة AI
                      </Text>
                    </View>
                  )}
                  <Text
                    className={`font-plex text-sm leading-7 ${
                      isUser ? 'text-white' : 'text-neutral-700 dark:text-neutral-200'
                    }`}
                  >
                    {m.content}
                  </Text>
                </View>
              );
            })}

            {sending ? (
              <View className="self-end rounded-2xl bg-white px-4 py-3 dark:bg-neutral-800">
                <ActivityIndicator color={passengerPurple[500]} />
              </View>
            ) : null}
          </View>

          {/* شارة التصعيد لتذكرة */}
          {ticketNumber ? (
            <Pressable
              onPress={() => router.push('/support/tickets' as Href)}
              className="mt-4 flex-row items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 active:scale-[0.99] dark:border-brand-800 dark:bg-brand-900/20"
            >
              <MaterialIcons name="confirmation-number" size={22} color={passengerPurple[600]} />
              <View className="flex-1">
                <Text className="font-plex-semibold text-sm text-brand-800 dark:text-brand-200">
                  تم فتح تذكرة دعم برقم {ticketNumber}
                </Text>
                <Text className="font-plex text-xs text-neutral-500 dark:text-neutral-400">
                  اضغطي لمتابعتها في «تذاكري»
                </Text>
              </View>
              <MaterialIcons name="chevron-left" size={22} color={passengerPurple[400]} />
            </Pressable>
          ) : null}
        </ScrollView>

        {/* حقل الإدخال */}
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="flex-row items-end gap-3 bg-white px-5 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] dark:bg-neutral-900"
        >
          <View className="max-h-28 flex-1 flex-row items-end rounded-3xl bg-neutral-100 px-2 py-1 dark:bg-neutral-800">
            <TextInput
              className="max-h-24 flex-1 px-4 py-3 font-plex text-sm text-neutral-900 dark:text-neutral-50"
              placeholder="اكتبي سؤالكِ..."
              placeholderTextColor="#9ca3af"
              value={input}
              onChangeText={setInput}
              multiline
              textAlign="right"
              editable={!sending}
            />
          </View>
          <Pressable
            onPress={onSend}
            disabled={!input.trim() || sending}
            className={`mb-1 h-12 w-12 items-center justify-center rounded-full active:scale-95 ${
              input.trim() && !sending ? 'bg-brand-600 shadow-md shadow-brand-500/30' : 'bg-neutral-200 dark:bg-neutral-800'
            }`}
          >
            <MaterialIcons name="send" size={20} color={input.trim() && !sending ? '#ffffff' : '#9ca3af'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
