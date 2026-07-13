import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | إشعارات النظام - System Notifications',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
