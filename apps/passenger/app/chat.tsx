import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { useBottomInset, keyboardAvoiding } from '@amana/shared-ui/layout';
import { passengerPurple } from '@amana/shared-ui/tokens';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { listRideMessages, sendRideMessage, type RideMessage } from '@/lib/ride-chat';

/** محادثة الراكبة مع سائقتها أثناء الرحلة (Realtime). */
export default function ChatScreen() {
  const { user } = useAuth();
  const { rideId, name } = useLocalSearchParams<{ rideId?: string; name?: string }>();
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

  async function refresh() {
    if (!rideId || !user) return;
    setMessages(await listRideMessages(rideId, user.id));
    setLoading(false);
    scrollDown();
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId, user?.id]);

  useEffect(() => {
    if (!rideId) return;
    const ch = supabase
      .channel(`ride-chat-${rideId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ride_messages', filter: `ride_id=eq.${rideId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  const bottomInset = useBottomInset();

  async function onSend() {
    if (!rideId || !user || !text.trim() || sending) return;
    setSending(true);
    const res = await sendRideMessage(rideId, user.id, text);
    setSending(false);
    if (res.ok) {
      setText('');
      await refresh();
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-900" edges={['top']}>
      <View className="h-16 flex-row items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-200 dark:active:bg-neutral-800"
        >
          <MaterialIcons name="arrow-forward" size={24} color={passengerPurple[600]} />
        </Pressable>
        <Text className="font-plex-bold text-lg text-neutral-900 dark:text-neutral-50">
          {name ? `محادثة ${name}` : 'محادثة السائقة'}
        </Text>
        <View className="h-10 w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={passengerPurple[500]} />
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          {...keyboardAvoiding}
        >
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-5"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollDown}
          >
            {messages.length === 0 ? (
              <View className="mt-24 items-center gap-2">
                <MaterialIcons name="chat-bubble-outline" size={44} color={passengerPurple[300]} />
                <Text className="font-plex text-sm text-neutral-400">ابدئي المحادثة مع سائقتك</Text>
              </View>
            ) : (
              <View className="gap-3">
                {messages.map((m) => (
                  <View
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      m.mine ? 'self-start bg-brand-600' : 'self-end bg-white dark:bg-neutral-800'
                    }`}
                  >
                    <Text
                      className={`font-plex text-sm leading-6 ${
                        m.mine ? 'text-white' : 'text-neutral-900 dark:text-neutral-50'
                      }`}
                    >
                      {m.message}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View
            className="flex-row items-end gap-2 border-t border-neutral-200 px-4 pt-3 dark:border-neutral-800"
            style={bottomInset}
          >
            <View className="max-h-28 flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800">
              <TextInput
                className="font-plex text-base text-neutral-900 dark:text-neutral-50"
                placeholder="اكتبي رسالتك..."
                placeholderTextColor="#9ca3af"
                value={text}
                onChangeText={setText}
                multiline
                textAlign="right"
              />
            </View>
            <Pressable
              onPress={onSend}
              disabled={!text.trim() || sending}
              className={`h-12 w-12 items-center justify-center rounded-full active:scale-95 ${
                text.trim() && !sending ? 'bg-brand-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              {sending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <MaterialIcons name="send" size={20} color="#ffffff" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
