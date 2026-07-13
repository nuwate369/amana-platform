import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | الإشعارات - Announcements',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
