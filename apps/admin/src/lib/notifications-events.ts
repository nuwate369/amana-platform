/**
 * حدث متصفّح خفيف لمزامنة حالة الإشعارات بين المكوّنات المنفصلة
 * (شاشة /system-notifications وجرس الإشعارات في الشريط العلوي) دون الاعتماد
 * على Realtime. يُطلَق بعد أي تغيير (قراءة/حذف)، ويستمع له الجرس فيُحدّث عدّاده.
 */
export const NOTIFICATIONS_CHANGED = 'amana:notifications-changed';

/** يُطلق حدث «تغيّرت الإشعارات» ليُحدّث بقية المكوّنات عدّادها/قائمتها. */
export function emitNotificationsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  }
}
