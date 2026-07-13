import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | سجل التدقيق - Audit Log',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
