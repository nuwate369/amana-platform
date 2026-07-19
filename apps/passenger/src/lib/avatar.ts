import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

/** مصدر صورة الأفاتار. */
export type AvatarSource = 'camera' | 'library';

/**
 * اختيار ورفع صورة الراكبة إلى bucket «avatars» (عام) ثم تحديث profiles.avatar_url
 * وبيانات المصادقة. رفع مباشر (بلا base64) وبلا قصّ إجباري (الإطار الدائري يقصّ
 * الصورة بصريًّا بـ cover) — نفس نمط تطبيق السائقة الموثوق. يعيد كائنًا يصف النتيجة.
 */
export async function pickAndUploadAvatar(
  userId: string,
  source: AvatarSource = 'library',
): Promise<{ ok: boolean; url?: string; cancelled?: boolean; message?: string }> {
  // 1) الصلاحية + فتح المصدر المناسب (بلا allowsEditing — نتفادى محرّر القصّ الأصلي).
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { ok: false, message: 'نحتاج إذن الكاميرا لالتقاط الصورة.' };
    result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { ok: false, message: 'نحتاج إذن الوصول للصور لتغيير الصورة.' };
    result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
  }
  if (result.canceled) return { ok: false, cancelled: true };

  const asset = result.assets[0];
  if (!asset?.uri) return { ok: false, message: 'تعذّر قراءة الصورة، حاول مرة أخرى.' };

  // 2) قراءة الملف كـ ArrayBuffer + التحقّق أنه غير فارغ.
  let body: ArrayBuffer;
  try {
    body = await fetch(asset.uri).then((r) => r.arrayBuffer());
  } catch {
    return { ok: false, message: 'تعذّر تجهيز الصورة للرفع، حاول مرة أخرى.' };
  }
  if (!body || body.byteLength === 0) {
    return { ok: false, message: 'الصورة فارغة، حاول اختيار صورة أخرى.' };
  }

  // 3) الرفع إلى bucket «avatars» (اسم ثابت لكل مستخدم — يُستبدل عند إعادة الرفع).
  const contentType = asset.mimeType ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, body, { contentType, upsert: true });
  if (upErr) {
    const m = upErr.message.toLowerCase();
    if (m.includes('bucket') && (m.includes('not found') || m.includes('does not exist'))) {
      return { ok: false, message: 'مجلّد الصور غير مُهيّأ بعد. نفّذ هجرة 0026 في قاعدة البيانات.' };
    }
    if (m.includes('row-level security') || m.includes('policy')) {
      return { ok: false, message: 'صلاحيات رفع الصورة غير مُهيّأة. نفّذ هجرة 0026 كاملة.' };
    }
    return { ok: false, message: upErr.message };
  }

  // 4) رابط عام + كسر التخزين المؤقّت ليظهر التحديث فورًا.
  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${pub.publicUrl}?t=${Date.now()}`;

  const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (dbErr) return { ok: false, message: dbErr.message };
  await supabase.auth.updateUser({ data: { avatar_url: url } });

  return { ok: true, url };
}
