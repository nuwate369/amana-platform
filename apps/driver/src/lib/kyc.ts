import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

/**
 * منطق رفع مستندات التحقق (KYC) — متصل فعليًا بـ Supabase Storage
 * (bucket خاص `kyc-documents`، مجلد باسم معرّف المستخدمة) وجدول `drivers`.
 */

/** المستندات الثلاثة المطلوبة، وربط كلٍّ منها بعمود الرابط في جدول drivers. */
export const KYC_DOCS = [
  { key: 'national_id', column: 'national_id_url', label: 'صورة الهوية الوطنية', hint: 'يجب أن تكون سارية المفعول', icon: 'badge' },
  { key: 'license', column: 'license_url', label: 'رخصة القيادة', hint: 'واضحة وسارية المفعول', icon: 'directions-car' },
  { key: 'vehicle_registration', column: 'vehicle_registration_url', label: 'استمارة السيارة', hint: 'نسخة واضحة من الأمام', icon: 'assignment' },
] as const;

export type KycDocKey = (typeof KYC_DOCS)[number]['key'];
export type KycDocColumn = (typeof KYC_DOCS)[number]['column'];

const BUCKET = 'kyc-documents';

/** نتيجة محاولة الرفع. */
export type UploadResult =
  | { status: 'uploaded'; path: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/**
 * يطلب صلاحية الوصول للمعرض، يفتح المنتقي، يرفع الصورة المختارة إلى
 * `kyc-documents/{userId}/{docKey}.{ext}`، ثم يحدّث عمود الرابط في صف السائقة.
 * يعيد كائنًا يصف النتيجة (لا يرمي) ليتحكّم النموذج في عرض التنبيه.
 */
export async function pickAndUploadKycDocument(
  userId: string,
  doc: { key: KycDocKey; column: KycDocColumn },
): Promise<UploadResult> {
  // 1) صلاحية المعرض.
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { status: 'error', message: 'نحتاج إذن الوصول للصور لرفع المستند.' };
  }

  // 2) اختيار الصورة (مع base64 للرفع المباشر إلى Supabase).
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    base64: true,
  });
  if (result.canceled) return { status: 'cancelled' };

  const asset = result.assets[0];
  if (!asset?.base64) {
    return { status: 'error', message: 'تعذّر قراءة الصورة، حاول مرة أخرى.' };
  }

  // 3) الرفع إلى التخزين (اسم ثابت لكل مستند حتى تُستبدل النسخة القديمة عند إعادة الرفع).
  const contentType = asset.mimeType ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/${doc.key}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(asset.base64), { contentType, upsert: true });
  if (uploadError) {
    return { status: 'error', message: uploadError.message };
  }

  // 4) حفظ مسار المستند في صف السائقة (upsert: يُحدّث الصف القائم أو يُنشئه).
  const { error: dbError } = await supabase
    .from('drivers')
    .upsert({ id: userId, [doc.column]: path }, { onConflict: 'id' });
  if (dbError) {
    return { status: 'error', message: dbError.message };
  }

  return { status: 'uploaded', path };
}

/**
 * إرسال الطلب للتدقيق: يضبط حالة السائقة إلى `pending`
 * (يفيد أيضًا في إعادة الرفع بعد رفض سابق فيعود الطلب للطابور).
 */
export async function submitKycForReview(userId: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from('drivers').update({ status: 'pending' }).eq('id', userId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
