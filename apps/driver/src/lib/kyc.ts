import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

/**
 * منطق توثيق السائقة (KYC) — متصل فعليًا بـ Supabase Storage
 * (bucket خاص `kyc-documents`، مجلد باسم معرّف المستخدمة) وجدولَي
 * `drivers` (الحقول النصية + روابط الصور) و`profiles` (رقم الجوال).
 */

/**
 * المستندات (الصور) المطلوبة، وربط كلٍّ منها بعمود الرابط في جدول drivers.
 * أُضيفت «صورة السيارة من الأمام» (car_photo_url) إلى الثلاثة السابقة.
 */
export const KYC_DOCS = [
  { key: 'national_id', column: 'national_id_url', label: 'صورة الهوية / الإقامة', hint: 'يجب أن تكون سارية المفعول', icon: 'badge' },
  { key: 'license', column: 'license_url', label: 'رخصة القيادة', hint: 'واضحة وسارية المفعول', icon: 'directions-car' },
  { key: 'vehicle_registration', column: 'vehicle_registration_url', label: 'استمارة السيارة', hint: 'نسخة واضحة وكاملة', icon: 'assignment' },
  { key: 'car_photo', column: 'car_photo_url', label: 'صورة السيارة من الأمام', hint: 'لقطة واضحة تُظهر اللوحة', icon: 'photo-camera' },
] as const;

export type KycDocKey = (typeof KYC_DOCS)[number]['key'];
export type KycDocColumn = (typeof KYC_DOCS)[number]['column'];

const BUCKET = 'kyc-documents';

/**
 * الحقول النصية للتوثيق. الجوال يُحفظ في `profiles.phone`، والبقية في `drivers`.
 * كلها إلزامية (تُتحقّق في النموذج قبل تفعيل زر الإرسال).
 */
export interface KycFieldValues {
  phone: string;
  nationalIdNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehiclePlate: string;
  vehicleRegistrationNumber: string;
}

/** مفاتيح الحقول النصية — تُستخدم في النموذج للتحقّق من الاكتمال. */
export const KYC_FIELD_KEYS: (keyof KycFieldValues)[] = [
  'phone',
  'nationalIdNumber',
  'vehicleMake',
  'vehicleModel',
  'vehicleYear',
  'vehiclePlate',
  'vehicleRegistrationNumber',
];

/** نتيجة محاولة الرفع. */
export type UploadResult =
  | { status: 'uploaded'; path: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** مصدر الصورة: الكاميرا (التقاط) أو معرض الصور. */
export type ImageSource = 'camera' | 'library';

/**
 * يطلب الصلاحية المناسبة، يفتح الكاميرا أو المعرض، يرفع الصورة المختارة إلى
 * `kyc-documents/{userId}/{docKey}.{ext}`، ثم يحدّث عمود الرابط في صف السائقة.
 * يعيد كائنًا يصف النتيجة (لا يرمي) ليتحكّم النموذج في عرض التنبيه.
 * الجودة 0.6 + رفع مباشر (بلا base64) لتقليل استهلاك الذاكرة على الأجهزة الضعيفة
 * ومنع خروج التطبيق أثناء رفع الصور — النمط الرسمي من Supabase لـ Expo.
 */
export async function pickAndUploadKycDocument(
  userId: string,
  doc: { key: KycDocKey; column: KycDocColumn },
  source: ImageSource = 'library',
): Promise<UploadResult> {
  // 1) الصلاحية + فتح المصدر المناسب (بلا base64 — نرفع الملف مباشرة لتوفير الذاكرة).
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return { status: 'error', message: 'نحتاج إذن الكاميرا لالتقاط الصورة.' };
    }
    result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return { status: 'error', message: 'نحتاج إذن الوصول للصور لرفع المستند.' };
    }
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
  }
  if (result.canceled) return { status: 'cancelled' };

  const asset = result.assets[0];
  if (!asset?.uri) {
    return { status: 'error', message: 'تعذّر قراءة الصورة، حاول مرة أخرى.' };
  }

  // 2) قراءة الملف كـ ArrayBuffer مباشرة من الـ uri (أخفّ من base64 على الذاكرة).
  let body: ArrayBuffer;
  try {
    body = await fetch(asset.uri).then((r) => r.arrayBuffer());
  } catch {
    return { status: 'error', message: 'تعذّر تجهيز الصورة للرفع، حاول مرة أخرى.' };
  }

  // 3) الرفع إلى التخزين (اسم ثابت لكل مستند حتى تُستبدل النسخة القديمة عند إعادة الرفع).
  const contentType = asset.mimeType ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/${doc.key}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType, upsert: true });
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
 * حفظ الحقول النصية: بيانات المركبة/الهوية في `drivers` ورقم الجوال في
 * `profiles`. يُستدعى عند الإرسال. يعيد كائنًا يصف النتيجة (لا يرمي).
 */
export async function saveKycFields(
  userId: string,
  values: KycFieldValues,
): Promise<{ ok: boolean; message?: string }> {
  const year = Number.parseInt(values.vehicleYear, 10);

  const { error: driverError } = await supabase.from('drivers').upsert(
    {
      id: userId,
      national_id_number: values.nationalIdNumber.trim(),
      vehicle_make: values.vehicleMake.trim(),
      vehicle_model: values.vehicleModel.trim(),
      vehicle_year: Number.isFinite(year) ? year : null,
      vehicle_plate: values.vehiclePlate.trim(),
      vehicle_registration_number: values.vehicleRegistrationNumber.trim(),
    },
    { onConflict: 'id' },
  );
  if (driverError) return { ok: false, message: driverError.message };

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ phone: values.phone.trim() })
    .eq('id', userId);
  if (profileError) return { ok: false, message: profileError.message };

  return { ok: true };
}

/**
 * إرسال الطلب للتدقيق: يحفظ الحقول النصية أولًا ثم يضبط حالة السائقة إلى
 * `pending` (يفيد أيضًا في إعادة الإرسال بعد رفض سابق فيعود الطلب للطابور).
 * الصور تُرفع لحظة اختيارها؛ هنا نحفظ النصوص ونؤكّد الإرسال معًا.
 */
export async function submitKycForReview(
  userId: string,
  values: KycFieldValues,
): Promise<{ ok: boolean; message?: string }> {
  const saved = await saveKycFields(userId, values);
  if (!saved.ok) return saved;

  // ختم وقت الإرسال (kyc_submitted_at) هو ما ينقل السائقة من «مسودّة» إلى طابور
  // المراجعة — لا مجرّد رفع الصور. وتفريغ سبب الرفض السابق عند إعادة الإرسال.
  const { error } = await supabase
    .from('drivers')
    .update({
      status: 'pending',
      rejection_reason: null,
      kyc_submitted_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
