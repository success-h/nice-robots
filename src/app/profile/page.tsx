import ProfilePage from '@/components/ProfileComponent';
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access-token');
  return <ProfilePage access_token={token?.value} />;
}
