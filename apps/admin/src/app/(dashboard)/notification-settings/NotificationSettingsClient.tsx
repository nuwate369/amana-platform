'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Settings, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
import {
  updateNotificationSetting,
  type NotificationSetting,
} from '@/app/actions/notifications';
import { notify } from '@/lib/toast';

const TYPE_LABELS: Record<string, string> = {
  new_passenger_registered: 'راكب جديد سجّل',
  new_driver_registered: 'سائقة جديدة سجّلت',
  new_staff_joined: 'موظف جديد انضم',
  new_ride_created: 'رحلة جديدة',
  driver_document_expiring: 'مستندات سائقة تنتهي صلاحيتها',
  user_status_changed: 'تغيير حالة مستخدم',
};

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      } disabled:opacity-50`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

export default function NotificationSettingsClient({
  initialSettings,
}: {
  initialSettings: NotificationSetting[];
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

  const [settings, setSettings] = useState(initialSettings);
  const [canManage, setCanManage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error?.code === '42703') { setCanManage(true); return; }
        setCanManage((data?.user_type as string) === 'super_admin');
      });
  }, [user]);

  useEffect(() => { setSettings(initialSettings); }, [initialSettings]);

  function updateField(id: string, field: keyof NotificationSetting, value: any) {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    setHasChanges(true);
  }

  async function saveAll() {
    setSaving(true);
    let ok = true;
    for (const s of settings) {
      const res = await updateNotificationSetting(s.id, {
        is_enabled: s.is_enabled,
        show_in_app: s.show_in_app,
        send_email: s.send_email,
        target_roles: s.target_roles,
      });
      if (!res.ok) { ok = false; notify.error(res.error || t('common.error')); break; }
    }
    setSaving(false);
    if (ok) { notify.success(t('common.saveSuccess')); setHasChanges(false); router.refresh(); }
  }

  const ROLE_LABELS: Record<string, string> = {
    super_admin: lang === 'ar' ? 'مدير عام' : 'Super Admin',
    admin: lang === 'ar' ? 'مدير' : 'Admin',
    support: lang === 'ar' ? 'دعم فني' : 'Support',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary shrink-0" />
            <span>{t('notificationSettings.title', 'إعدادات الإشعارات')}</span>
          </h1>
          <span className="text-muted-foreground font-light">/</span>
          <p className="text-sm text-muted-foreground pt-1">
            {t('notificationSettings.subtitle', 'تخصيص كيفية وصول الإشعارات للموظفين')}
          </p>
        </div>
        {canManage && hasChanges && (
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition-colors w-full sm:w-auto shrink-0 disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common.saveAll', lang === 'ar' ? 'حفظ الكل' : 'Save All')}
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-5 py-4 font-semibold text-muted-foreground">{t('notificationSettings.columns.type', 'النوع')}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground text-center">{t('notificationSettings.columns.enabled', 'مفعل')}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground text-center">{t('notificationSettings.columns.inApp', 'داخل التطبيق')}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground text-center">{t('notificationSettings.columns.email', 'البريد')}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground">{t('notificationSettings.columns.target', 'الوجهة')}</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">
                    {t(`notificationSettings.types.${s.notification_type}`, TYPE_LABELS[s.notification_type] ?? s.notification_type)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Toggle checked={s.is_enabled} onChange={() => updateField(s.id, 'is_enabled', !s.is_enabled)} disabled={!canManage} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Toggle checked={s.show_in_app} onChange={() => updateField(s.id, 'show_in_app', !s.show_in_app)} disabled={!canManage} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Toggle checked={s.send_email} onChange={() => updateField(s.id, 'send_email', !s.send_email)} disabled={!canManage} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {['super_admin', 'admin', 'support'].map((role) => {
                        const active = s.target_roles.includes(role);
                        return (
                          <button
                            key={role}
                            onClick={() => {
                              if (!canManage) return;
                              const roles = active
                                ? s.target_roles.filter(r => r !== role)
                                : [...s.target_roles, role];
                              updateField(s.id, 'target_roles', roles);
                            }}
                            disabled={!canManage}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                              active
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            } disabled:opacity-50`}
                          >
                            {ROLE_LABELS[role]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
              {settings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    {t('notificationSettings.empty', lang === 'ar' ? 'لا توجد إعدادات تنبيهات.' : 'No notification settings found.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
