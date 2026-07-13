import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | نسيت كلمة المرور - Forgot Password',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
