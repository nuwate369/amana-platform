const { withGradleProperties } = require('expo/config-plugins');

/**
 * يقصر البناء على معماريّات الأجهزة الحقيقية (ARM) ويُسقط x86 و x86_64.
 *
 * القيمة الافتراضية في قالب Expo تشمل معماريّتَي المحاكي، وهما تضيفان نحو
 * 89 ميغابايت إلى ملفّ APK لا يستفيد منها أيّ جوال — نصف حجم التطبيق تقريبًا.
 * إسقاطهما يصغّر الملفّ إلى ما دون النصف دون أن يفقد أيّ جهاز حقيقي الدعم.
 *
 * ملاحظة: بعد تطبيق هذه الإضافة لن يعمل التطبيق على محاكي x86 — استخدم
 * محاكي arm64 أو جهازًا حقيقيًّا (وهو ما نفعله أصلًا).
 */
module.exports = function withDeviceAbisOnly(config) {
  return withGradleProperties(config, (cfg) => {
    const key = 'reactNativeArchitectures';
    const value = 'armeabi-v7a,arm64-v8a';

    const existing = cfg.modResults.find(
      (item) => item.type === 'property' && item.key === key,
    );

    if (existing) {
      existing.value = value;
    } else {
      cfg.modResults.push({ type: 'property', key, value });
    }

    return cfg;
  });
};
