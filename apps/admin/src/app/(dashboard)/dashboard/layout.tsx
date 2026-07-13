import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | الرئيسية - Dashboard',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
