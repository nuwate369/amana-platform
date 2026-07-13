import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | الراكبات - Passengers',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
