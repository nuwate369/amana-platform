import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | الرحلات - Rides',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
