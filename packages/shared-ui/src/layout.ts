import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
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
  const keyboard = useKeyboardHeight();
  // مع ظهور لوحة المفاتيح يغطّي إطارُها شريطَ تنقّل النظام، فإضافة حافّته
  // فوقها تُنتج فراغًا مضاعفًا. الحافة تلزم حين تكون اللوحة مغلقة فقط.
  const bottom = keyboard > 0 ? 0 : insets.bottom;
  return useMemo(() => ({ paddingBottom: bottom + gap }), [bottom, gap]);
}

/**
 * ارتفاع لوحة المفاتيح الظاهرة بالبكسل (صفر حين تكون مغلقة).
 *
 * لماذا نقيسه بأنفسنا؟ لأنّ `windowSoftInputMode="adjustResize"` لم يعد يعمل
 * بعد تفعيل الرسم من حافة إلى حافة (edge-to-edge) — وهو مفعَّل افتراضيًّا في
 * Expo SDK 54. النافذة لم تعد تتقلّص عند ظهور اللوحة، فيبقى حقل الكتابة تحتها.
 * القياس المباشر يعمل بغضّ النظر عن إعدادات النافذة أو سلوك المكوّنات.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/**
 * حشوة تُرفع بها الشاشة كاملةً فوق لوحة المفاتيح.
 *
 * تُوضع على الحاوية الجذرية للشاشة، فينضغط المحتوى كلّه — القائمة وحقل
 * الكتابة معًا — بدل أن يبقى الحقل مدفونًا خلف اللوحة.
 */
export function useKeyboardPush(): { paddingBottom: number } {
  const height = useKeyboardHeight();
  return useMemo(() => ({ paddingBottom: height }), [height]);
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
 * @deprecated استعمل `useKeyboardPush` بدلها.
 *
 * `KeyboardAvoidingView` يعتمد على تقلّص النافذة، وهو ما لم يعد يحدث مع
 * الرسم من حافة إلى حافة. تُركت للتوافق ولا يُبنى عليها جديد.
 */
export const keyboardAvoiding = Platform.select({
  ios: { behavior: 'padding' as const },
  default: {},
});
