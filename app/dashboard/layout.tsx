import DashboardNav from '@/components/DashboardNav'
import ArwaFooter from '@/components/ArwaFooter'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
