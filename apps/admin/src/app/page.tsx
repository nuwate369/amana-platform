import { redirect } from 'next/navigation';

// نقطة الدخول تُحوّل إلى اللوحة؛ حارس RequireAuth يعيد غير المسجّل إلى /sign-in.
export default function Home() {
  redirect('/dashboard');
}
