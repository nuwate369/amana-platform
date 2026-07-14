'use client';

import React from 'react';
import { useTranslation } from '@amana/i18n';
import { Button, ButtonProps } from './Button';

/**
 * A standard Cancel button, uses 'muted' variant by default.
 */
export function CancelButton({ children, ...props }: ButtonProps) {
  const { t } = useTranslation();
  return (
    <Button variant="muted" {...props}>
      {children || t('common.cancel', 'إلغاء')}
    </Button>
  );
}

/**
 * A standard Save button, uses 'primary' variant by default.
 */
export function SaveButton({ children, ...props }: ButtonProps) {
  const { t } = useTranslation();
  return (
    <Button variant="primary" {...props}>
      {children || t('common.save', 'حفظ التعديلات')}
    </Button>
  );
}

/**
 * A standard Primary Action button, uses 'primary' variant by default.
 */
export function PrimaryButton({ children, ...props }: ButtonProps) {
  return (
    <Button variant="primary" {...props}>
      {children}
    </Button>
  );
}

/**
 * A standard Danger/Delete button, uses 'danger' variant by default.
 */
export function DangerButton({ children, ...props }: ButtonProps) {
  const { t } = useTranslation();
  return (
    <Button variant="danger" {...props}>
      {children || t('common.delete', 'حذف')}
    </Button>
  );
}
