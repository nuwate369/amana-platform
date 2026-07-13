import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | المجموعات - Groups',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
