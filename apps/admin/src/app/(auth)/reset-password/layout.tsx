import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أمانة | إعادة تعيين كلمة المرور - Reset Password',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
