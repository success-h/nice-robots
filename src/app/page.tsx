import HomePageComponent from '@/components/HomePageComponent';
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access-token');

  return <HomePageComponent access_token={token?.value} />;
}
