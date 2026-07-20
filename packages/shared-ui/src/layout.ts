import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * أدوات تخطيط مشتركة تعالج شريط تنقّل النظام ولوحة المفاتيح في التطبيقين.
 *
 * لماذا هنا لا في كل شاشة؟ لأنّ الحشوة السفلية كانت تُكتب يدويًّا في كل شاشة
 * (`pb-8` تارةً و`py-3` تارةً)، وهي أرقام ثابتة لا تعرف ارتفاع شريط النظام:
 * فتختفي الأزرار تحته على أجهزة الأزرار الثلاثة، وتزيد الفراغ على أجهزة الإيماءات.
 * القياس الوحيد الصحيح يأتي من النظام عبر `useSafeAreaInsets`.
 */

/**
 * حشوة سفلية آمنة لأيّ عنصر ملاصق لأسفل الشاشة (شريط إجراءات، حقل رسالة).
 *
 * تُستعمل مع `SafeAreaView edges={['top']}`: نترك الحافة السفلية للنظام ثم
 * نضيفها هنا على الحاوية السفلية وحدها، فيبقى محتوى الشاشة ممتدًّا خلفها.
 *
 * @param gap مسافة تنفّس فوق حافة النظام (افتراضيًّا 12).
 */
export function useBottomInset(gap = 12): { paddingBottom: number } {
  const insets = useSafeAreaInsets();
  return useMemo(() => ({ paddingBottom: insets.bottom + gap }), [insets.bottom, gap]);
}

/**
 * حشوة سفلية لمحتوى قابل للتمرير أسفله شريط إجراءات عائم — كي لا يختفي آخر
 * عنصر خلف الشريط.
 *
 * @param barHeight ارتفاع الشريط العائم التقريبي.
 */
export function useScrollBottomPadding(barHeight: number): { paddingBottom: number } {
  const insets = useSafeAreaInsets();
  return useMemo(
    () => ({ paddingBottom: insets.bottom + barHeight }),
    [insets.bottom, barHeight],
  );
}

/**
 * خصائص `KeyboardAvoidingView` الصحيحة لكل منصّة.
 *
 * أندرويد يعيد تحجيم النافذة بنفسه (`softwareKeyboardLayoutMode: resize`)، فتمرير
 * `behavior="padding"` هناك يضيف حشوة فوق إزاحة النظام فيقفز الحقل مرّتين.
 * لذلك نمرّر السلوك على iOS فقط ونترك أندرويد للنظام.
 */
export const keyboardAvoiding = Platform.select({
  ios: { behavior: 'padding' as const },
  default: {},
});
