/**
 * Preset مشترك لـ Tailwind / nativewind.
 *
 * الاستخدام في كل تطبيق (tailwind.config):
 *   presets: [require('@amana/shared-ui/tailwind-preset').createPreset('passenger')]
 *
 * كل تطبيق يمرّر اسمه فيحصل على `brand` (واللون `accent` للإدارة) كألوان
 * Tailwind، مع تفعيل الوضع الداكن عبر الصنف (class).
 *
 * ── الهوية الأصلية لأمانة ──
 * Brand (admin)  = Anthracite grey (رمادي أنثراسايت — خلفيات + نصوص)
 * Accent (admin) = Gold (ذهبي — أزرار + عناصر نشطة فقط)
 * Layout density = مستوحى من Voice (كثافة البطاقات + المسافات)
 */

const passengerPurple = {
  50: '#f6f2fd',
  100: '#ece2fb',
  200: '#d8c6f7',
  300: '#bfa0f0',
  400: '#a273e6',
  500: '#8b4fd8',
  600: '#7838bf',
  700: '#632c9c',
  800: '#4f2580',
  900: '#3f2065',
};

const driverNavy = {
  50: '#eef3fb',
  100: '#d6e2f5',
  200: '#adc4ea',
  300: '#7e9edd',
  400: '#4f74cf',
  500: '#2f56b5',
  600: '#254594',
  700: '#1d3873',
  800: '#162b58',
  900: '#0f1e3d',
};

const adminAnthracite = {
  50: '#f4f5f6',
  100: '#e3e5e8',
  200: '#c6cbd0',
  300: '#a0a8b0',
  400: '#6f7883',
  500: '#4b535d',
  600: '#3a4149',
  700: '#2c3138',
  800: '#1f232a',
  900: '#14171c',
};

const adminGold = {
  50: '#fdf9ec',
  100: '#f9efc9',
  200: '#f2dc8f',
  300: '#e9c454',
  400: '#e0ad2b',
  500: '#c8951b',
  600: '#a67516',
  700: '#835916',
  800: '#6c4917',
  900: '#5c3e18',
};

const brandByApp = {
  passenger: { brand: passengerPurple },
  driver: { brand: driverNavy },
  admin: { brand: adminAnthracite, accent: adminGold },
};

/**
 * @param {'passenger'|'driver'|'admin'} app
 */
function createPreset(app) {
  const colors = brandByApp[app];
  if (!colors) {
    throw new Error(`[tailwind-preset] تطبيق غير معروف: ${app}`);
  }

  // ملاحظة: لا نحدّد darkMode هنا — كل تطبيق يضبطه بنفسه
  // (الويب: 'class' مع next-themes، الموبايل: 'media' ليتبع نظام الجهاز).
  return {
    theme: {
      extend: {
        colors,
        borderRadius: {
          sm: '6px',
          md: '10px',
          lg: '16px',
          xl: '22px',
        },
        boxShadow: {
          xs: '0 1px 0 rgba(20,23,28,0.04)',
          sm: '0 1px 2px rgba(20,23,28,0.06), 0 1px 1px rgba(20,23,28,0.04)',
          DEFAULT: '0 1px 2px rgba(20,23,28,0.06), 0 4px 12px rgba(20,23,28,0.06)',
          lg: '0 8px 24px rgba(20,23,28,0.08), 0 2px 6px rgba(20,23,28,0.06)',
          pop: '0 24px 48px rgba(20,23,28,0.12), 0 4px 12px rgba(20,23,28,0.08)',
        },
      },
    },
  };
}

module.exports = { createPreset, brandByApp };
