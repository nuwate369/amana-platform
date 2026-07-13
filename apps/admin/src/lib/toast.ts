import toast from 'react-hot-toast';

/**
 * مُنبّه موحّد للوحة الإدارة (يغلّف react-hot-toast).
 * مرّر النص مُترجمًا مسبقًا: notify.success(t('common.saveSuccess')).
 */
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast(message, { icon: '⚠️' }),
};
