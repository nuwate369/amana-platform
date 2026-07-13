import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | قبول الدعوة - Accept Invite',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
