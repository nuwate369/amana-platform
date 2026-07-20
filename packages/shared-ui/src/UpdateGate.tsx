import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * بوّابة التحديث — تُعرض فوق التطبيق عند وجود نسخة أصلية (APK) أحدث.
 *
 * لا علاقة لها بتحديثات EAS Update (OTA): تلك تصل صامتة ولا تحتاج تدخّل
 * المستخدمة. هذه النافذة للحالة النادرة التي يتغيّر فيها الكود الأصلي
 * (مكتبة native جديدة، أذونات، أيقونة، ترقية SDK) فيلزم تنزيل ملفّ جديد.
 *
 * المصدر: الدالّة `latest_app_version` في Supabase — استعلام واحد عند الإقلاع.
 * الفشل صامت تمامًا: انقطاع الشبكة أو غياب الصفّ لا يمنع استخدام التطبيق.
 */

export interface LatestAppVersion {
  version_code: number;
  version_name: string;
  download_url: string;
  notes: string | null;
  mandatory: boolean;
}

export interface UpdateGateProps {
  /** أيّ تطبيق نحن فيه — يطابق العمود `app` في الجدول. */
  app: 'passenger' | 'driver';
  /** عميل Supabase الخاص بالتطبيق. */
  supabase: SupabaseClient;
  /** اللون الأساسي للتطبيق (أرجواني للراكبة، كحلي للسائقة). */
  accent: string;
}

/** رقم البناء الحالي كما ثُبِّت في الجهاز. */
function currentVersionCode(): number {
  const raw = Constants.expoConfig?.android?.versionCode;
  return typeof raw === 'number' ? raw : 1;
}

export function UpdateGate({ app, supabase, accent }: UpdateGateProps) {
  const [latest, setLatest] = useState<LatestAppVersion | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase.rpc('latest_app_version', {
          p_app: app,
          p_platform: 'android',
        });
        if (!alive || error) return;

        const row = (Array.isArray(data) ? data[0] : data) as LatestAppVersion | undefined;
        if (row && row.version_code > currentVersionCode()) setLatest(row);
      } catch {
        // تجاهل صامت — التحديث ليس شرطًا لتشغيل التطبيق.
      }
    })();

    return () => {
      alive = false;
    };
  }, [app, supabase]);

  if (!latest || (dismissed && !latest.mandatory)) return null;

  const notes = (latest.notes ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  async function download() {
    if (!latest) return;
    setOpening(true);

    // نمرّ عبر مسار لوحة الإدارة كي تُحتسب الضغطة «تحديثًا» لا تثبيتًا أوّل،
    // ونسقط إلى الرابط المباشر إن لم يكن عنوان اللوحة مضبوطًا.
    const adminUrl = process.env.EXPO_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '');
    const target = adminUrl ? `${adminUrl}/api/download/${app}?k=update` : latest.download_url;

    try {
      await Linking.openURL(target);
    } catch {
      // المتصفّح غير متاح — نترك النافذة مفتوحة لتعيد المحاولة.
    }
    setOpening(false);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setDismissed(true)}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full max-w-sm rounded-3xl bg-white p-6 dark:bg-neutral-800">
          <Text className="text-center text-4xl">🎉</Text>

          <Text className="mt-3 text-center font-plex-bold text-xl text-neutral-900 dark:text-neutral-50">
            نسخة جديدة من أمانة
          </Text>
          <Text className="mt-1 text-center font-plex text-sm" style={{ color: accent }}>
            الإصدار {latest.version_name} متاح الآن
          </Text>

          {notes.length > 0 && (
            <ScrollView className="mt-4 max-h-40" showsVerticalScrollIndicator={false}>
              {notes.map((line, i) => (
                <View key={i} className="mb-1.5 flex-row items-start gap-2">
                  <Text style={{ color: accent }} className="font-plex text-sm">
                    •
                  </Text>
                  <Text className="flex-1 font-plex text-sm text-neutral-600 dark:text-neutral-300">
                    {line}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable
            onPress={download}
            disabled={opening}
            style={{ backgroundColor: accent }}
            className="mt-5 h-13 flex-row items-center justify-center rounded-2xl py-4 active:opacity-90"
          >
            {opening ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-plex-semibold text-base text-white">تحميل التحديث</Text>
            )}
          </Pressable>

          {latest.mandatory ? (
            <Text className="mt-3 text-center font-plex text-xs text-neutral-400">
              هذا التحديث إلزامي لمواصلة استخدام التطبيق
            </Text>
          ) : (
            <Pressable
              onPress={() => setDismissed(true)}
              className="mt-2 items-center justify-center py-3"
            >
              <Text className="font-plex text-sm text-neutral-400">لاحقًا</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
