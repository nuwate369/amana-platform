import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | التسعير - Pricing',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
