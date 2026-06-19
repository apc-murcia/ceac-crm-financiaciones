import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import InactivityGuard from '@/components/InactivityGuard'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <SessionProviderWrapper session={session}>
      <InactivityGuard />
      {children}
    </SessionProviderWrapper>
  )
}
