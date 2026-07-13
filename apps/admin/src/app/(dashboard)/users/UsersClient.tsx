import { redirect } from 'next/navigation';

/**
 * صفحة /users أُزيلت — الآن استخدم /staff لإدارة فريق العمل.
 */
export default function UsersRedirectPage() {
  redirect('/staff');
}
