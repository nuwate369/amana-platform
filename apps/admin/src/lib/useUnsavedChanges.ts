'use client';

import { useEffect } from 'react';

/**
 * حارس التغييرات غير المحفوظة.
 *
 * ملاحظة معمارية: App Router في Next.js لا يوفّر واجهة رسمية لإلغاء التنقّل
 * (لا يوجد router event قابل للإلغاء كما في Pages Router). لذا نعتمد مقاربة
 * عملية من طبقتين:
 *   (أ) مستمع 'beforeunload' على النافذة يفعّل نافذة المتصفح الأصلية عند
 *       إغلاق التبويب أو تحديث الصفحة أثناء وجود تغييرات.
 *   (ب) مستمع نقر في طور الالتقاط (capture phase) على المستند يعترض النقر
 *       على أي رابط <a>/<Link> داخلي؛ فإن كانت هناك تغييرات نسأل المستخدم عبر
 *       window.confirm، وإن ألغى نمنع التنقّل (preventDefault + stopPropagation).
 *
 * تُنظَّف المستمعات عند إلغاء التركيب أو حين تصبح الحالة غير «متسخة».
 *
 * @param isDirty هل توجد تغييرات لم تُحفظ.
 * @param message رسالة التأكيد (مُترجمة مسبقًا، مثل t('common.unsavedChanges')).
 */
export function useUnsavedChanges(isDirty: boolean, message: string): void {
  useEffect(() => {
    if (!isDirty) return;

    // (أ) إغلاق التبويب / التحديث
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // المتصفحات الحديثة تتجاهل النص المخصّص وتعرض رسالتها القياسية.
      e.returnValue = message;
      return message;
    };

    // (ب) اعتراض التنقّل الداخلي عبر الروابط
    const handleClickCapture = (e: MouseEvent) => {
      // نتجاهل النقرات المعدّلة (فتح في تبويب جديد) وأزرار غير اليسرى.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;

      // روابط خارجية / تنزيل / فتح في تبويب جديد لا تُعترض.
      const href = anchor.getAttribute('href');
      if (!href || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    // طور الالتقاط (true) كي نسبق مُوجّه Next.js.
    document.addEventListener('click', handleClickCapture, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClickCapture, true);
    };
  }, [isDirty, message]);
}
