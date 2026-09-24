'use client'
import DashboardNav from '@/components/DashboardNav'
import ArwaFooter from '@/components/ArwaFooter'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

const SESSION_HOURS = 8

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const loginTime = localStorage.getItem('staff_login_time')
    if (!loginTime) {
      router.replace('/')
      return
    }
    const elapsed = Date.now() - parseInt(loginTime)
    if (elapsed > SESSION_HOURS * 60 * 60 * 1000) {
      localStorage.removeItem('staff_login_time')
      import('@/lib/supabase/client').then(({ createClient }) => createClient().auth.signOut())
      router.replace('/')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="max-w-6xl mx-auto p-4 pt-6">
        {children}
      </main>
      <ArwaFooter />
    </div>
  )
}
