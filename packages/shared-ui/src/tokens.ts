/**
 * رموز التصميم (Design Tokens) المشتركة لمنصة أمانة.
 * الهوية الأصلية:
 *   - Brand (admin) = Anthracite grey (رمادي أنثراسايت — خلفيات + نصوص)
 *   - Accent (admin) = Gold (ذهبي — أزرار + عناصر نشطة فقط)
 *
 * كل لوحة تعرّف تدرّجات 50..900 لتوليد ألوان متسقة في الوضعين الفاتح/الداكن.
 */

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

/** الراكبة: أرجواني. */
export const passengerPurple: ColorScale = {
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

/** السائقة: أزرق داكن. */
export const driverNavy: ColorScale = {
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

/** الإدارة: رمادي أنثراسايت (أساسي) + ذهبي (تمييز). */
export const adminAnthracite: ColorScale = {
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

export const adminGold: ColorScale = {
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

export const palettes = {
  passenger: { brand: passengerPurple },
  driver: { brand: driverNavy },
  admin: { brand: adminAnthracite, accent: adminGold },
} as const;

export type AppName = keyof typeof palettes;

/** رموز الحواف والمسافات المشتركة (Voice Design System). */
export const radii = { sm: 8, md: 12, lg: 20, xl: 28, '2xl': 36, '3xl': 48, full: 9999 } as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
