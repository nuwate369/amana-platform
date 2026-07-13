import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | التقارير - Reports',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
