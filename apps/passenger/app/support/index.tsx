import { MaterialIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
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
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      {/* الشريط العلوي */}
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={passengerPurple[600]} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="support-agent" size={22} color={passengerPurple[600]} />
          <Text className="font-plex-bold text-xl text-neutral-900 dark:text-neutral-50">الدعم الفني</Text>
        </View>
        <Pressable
          onPress={() => router.push('/support/tickets' as Href)}
          className="h-10 items-center justify-center rounded-full px-2"
        >
          <Text className="font-plex-medium text-sm text-brand-600 dark:text-brand-300">تذاكري</Text>
        </Pressable>
      </View>

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
          <View className="gap-3">
            {chat.map((m) => (
              <View
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  m.role === 'user'
                    ? 'self-start bg-brand-700 dark:bg-brand-600'
                    : 'self-end bg-white dark:bg-neutral-800'
                }`}
              >
                <Text
                  className={`font-plex text-sm leading-6 ${
                    m.role === 'user' ? 'text-white' : 'text-neutral-900 dark:text-neutral-50'
                  }`}
                >
                  {m.content}
                </Text>
              </View>
            ))}

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
        <View className="flex-row items-end gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <View className="max-h-28 flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800">
            <TextInput
              className="font-plex text-base text-neutral-900 dark:text-neutral-50"
              placeholder="اكتبي رسالتك للمساعِدة..."
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
            className={`h-12 w-12 items-center justify-center rounded-full active:scale-95 ${
              input.trim() && !sending ? 'bg-brand-700 dark:bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <MaterialIcons name="send" size={20} color="#ffffff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
