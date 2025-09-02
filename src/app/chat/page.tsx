import ChatPage from '@/components/ChatComponent';
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access-token');
  return <ChatPage access_token={token?.value} />;
}
