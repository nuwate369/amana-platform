import Toast from 'react-native-toast-message';

/**
 * مُنبّه موحّد لتطبيق السائقة (يغلّف react-native-toast-message).
 * مرّر النص مُترجمًا مسبقًا: notify.success(t('common.saveSuccess')).
 * يتطلّب تركيب <Toast /> مرة واحدة في app/_layout.tsx.
 */
export const notify = {
  success: (message: string) => Toast.show({ type: 'success', text1: message, position: 'top' }),
  error: (message: string) => Toast.show({ type: 'error', text1: message, position: 'top' }),
  warning: (message: string) => Toast.show({ type: 'info', text1: message, position: 'top' }),
};
