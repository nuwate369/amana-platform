const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * إضافة توقيع نسخة الإصدار (release) إلى android/app/build.gradle.
 *
 * لماذا هذه الإضافة موجودة؟ مجلّد `android/` يُولَّد آليًّا عبر `expo prebuild`
 * وهو خارج git، فأيّ تعديل يدوي عليه يضيع عند إعادة التوليد. هذه الإضافة تُعيد
 * حقن إعدادات التوقيع في كل مرّة، فيبقى مفتاح التطبيق ثابتًا مدى الحياة —
 * وهو شرط تثبيت التحديثات فوق النسخة القديمة دون حذفها.
 *
 * بيانات المفتاح تُقرأ من خصائص Gradle المحلّية (‎~/.gradle/gradle.properties‎)
 * ولا تُكتب في أيّ ملفّ داخل المستودع. إن غابت، يسقط البناء إلى مفتاح debug
 * حتى لا ينكسر على جهاز لم يُعدّ بعد.
 *
 * @param {object} config
 * @param {{ prefix: string }} options بادئة خصائص Gradle، مثل `AMANA_PASSENGER`.
 */
module.exports = function withReleaseSigning(config, { prefix }) {
  if (!prefix) throw new Error('withReleaseSigning: الخيار "prefix" مطلوب');

  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // (1) إضافة signingConfigs.release — مرّة واحدة فقط.
    if (!contents.includes(`${prefix}_STORE_FILE`)) {
      const block = [
        '        release {',
        `            if (project.hasProperty('${prefix}_STORE_FILE')) {`,
        `                storeFile file(project.property('${prefix}_STORE_FILE'))`,
        `                storePassword project.property('${prefix}_STORE_PASSWORD')`,
        `                keyAlias project.property('${prefix}_KEY_ALIAS')`,
        `                keyPassword project.property('${prefix}_KEY_PASSWORD')`,
        '            } else {',
        "                storeFile file('debug.keystore')",
        "                storePassword 'android'",
        "                keyAlias 'androiddebugkey'",
        "                keyPassword 'android'",
        '            }',
        '        }',
        '',
      ].join('\n');

      contents = contents.replace(/signingConfigs \{\n/, (m) => `${m}${block}`);
    }

    // (2) توجيه buildTypes.release إلى التوقيع الجديد.
    // نعمل على ما بعد `buildTypes {` فقط، ونستبدل آخر ظهور — لأنّ كتلة debug
    // تسبق كتلة release وتستخدم نفس السطر.
    const at = contents.indexOf('buildTypes {');
    if (at !== -1) {
      const head = contents.slice(0, at);
      let tail = contents.slice(at);
      const needle = 'signingConfig signingConfigs.debug';
      const last = tail.lastIndexOf(needle);
      if (last !== -1) {
        tail =
          tail.slice(0, last) +
          'signingConfig signingConfigs.release' +
          tail.slice(last + needle.length);
      }
      contents = head + tail;
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
