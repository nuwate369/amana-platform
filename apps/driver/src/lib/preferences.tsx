import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DevSettings, I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { colorScheme } from 'nativewind';
import { DEFAULT_LOCALE, isRTL, type AppLocale } from '@amana/i18n';
import { i18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

/**
 * تفضيلات المستخدمة (المظهر + اللغة) — مصدر واحد يُقرأ عند الإقلاع ويُحفظ محليًّا:
 *  - المظهر: فاتح/داكن/تلقائي عبر nativewind (colorScheme) + AsyncStorage. فوري.
 *  - اللغة: عربي/إنجليزي عبر i18n + AsyncStorage + مزامنة profiles.locale.
 *    تبديل اللغة يقلب اتجاه الواجهة (RTL⇄LTR)، وهو تغيير أصلي يتطلّب إعادة تشغيل
 *    التطبيق مرة واحدة — نتكفّل بها هنا (نافذة التأكيد في شاشة الحساب).
 */

export type ThemePref = 'light' | 'dark' | 'system';

const THEME_KEY = 'amana.theme';
const LOCALE_KEY = 'amana.locale';

interface PreferencesValue {
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  language: AppLocale;
  /** يبدّل اللغة؛ يعيد تشغيل التطبيق تلقائيًّا إن تغيّر اتجاه الكتابة. */
  setLanguage: (l: AppLocale) => Promise<void>;
  /** جاهز بعد قراءة التفضيلات وتوفيق الاتجاه (يمنع وميض اتجاه خاطئ). */
  ready: boolean;
}

const PreferencesContext = createContext<PreferencesValue | undefined>(undefined);

/** إعادة تشغيل التطبيق: DevSettings في التطوير، expo-updates في الإصدار. */
async function reloadApp(): Promise<void> {
  try {
    if (__DEV__) {
      DevSettings.reload();
    } else {
      await Updates.reloadAsync();
    }
  } catch {
    // ملاذ أخير — يعمل في بيئة التطوير.
    DevSettings.reload();
  }
}

/** يطبّق الاتجاه المطلوب؛ يعيد true إن لزم إعادة تشغيل (تغيّر الاتجاه فعليًّا). */
function applyDirection(locale: AppLocale): boolean {
  const desiredRTL = isRTL(locale);
  if (I18nManager.isRTL === desiredRTL) return false;
  I18nManager.allowRTL(desiredRTL);
  I18nManager.forceRTL(desiredRTL);
  return true;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>('system');
  const [language, setLanguageState] = useState<AppLocale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  // قراءة التفضيلات عند الإقلاع + توفيق الاتجاه مع اللغة المحفوظة.
  useEffect(() => {
    let active = true;
    (async () => {
      const [storedTheme, storedLocale] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(LOCALE_KEY),
      ]);

      const nextTheme = (storedTheme as ThemePref | null) ?? 'system';
      colorScheme.set(nextTheme);

      const nextLocale = (storedLocale as AppLocale | null) ?? DEFAULT_LOCALE;
      // إن كان الاتجاه المحفوظ مخالفًا للحالي ⇒ نضبطه ونعيد التشغيل مرة واحدة.
      if (applyDirection(nextLocale)) {
        await reloadApp();
        return; // التطبيق سيُعاد تشغيله؛ لا نُكمل.
      }
      if (i18n.language !== nextLocale) await i18n.changeLanguage(nextLocale);

      if (!active) return;
      setThemeState(nextTheme);
      setLanguageState(nextLocale);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setTheme = (t: ThemePref) => {
    setThemeState(t);
    colorScheme.set(t);
    void AsyncStorage.setItem(THEME_KEY, t);
  };

  const setLanguage = async (l: AppLocale) => {
    if (l === language) return;
    await AsyncStorage.setItem(LOCALE_KEY, l);
    // مزامنة التفضيل مع الملف (أفضل جهد — لا نُفشل التبديل إن تعذّرت).
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) await supabase.from('profiles').update({ locale: l }).eq('id', data.user.id);
    } catch {
      /* تجاهل */
    }
    await i18n.changeLanguage(l);
    if (applyDirection(l)) {
      await reloadApp(); // تغيّر الاتجاه ⇒ إعادة تشغيل لتطبيقه.
    } else {
      setLanguageState(l);
    }
  };

  return (
    <PreferencesContext.Provider value={{ theme, setTheme, language, setLanguage, ready }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (ctx === undefined) {
    throw new Error('usePreferences يجب أن يُستخدم داخل <PreferencesProvider>.');
  }
  return ctx;
}
