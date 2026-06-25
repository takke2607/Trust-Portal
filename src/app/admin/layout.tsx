import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import AdminLayoutClient from '@/components/AdminLayoutClient';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromSession();
  
  if (!user) {
    redirect('/login');
  }
  
  return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}
