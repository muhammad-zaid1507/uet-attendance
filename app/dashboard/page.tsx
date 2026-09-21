import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, BookOpen, CalendarCheck, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ count: studentCount }, { count: subjectCount }, { count: attendanceCount }] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('subjects').select('*', { count: 'exact', head: true }),
    supabase.from('attendance').select('*', { count: 'exact', head: true }),
  ])

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const stats = [
    { label: 'Total Students', value: studentCount ?? 0, icon: Users, color: 'bg-green-100 text-green-700', href: '/dashboard/students' },
    { label: 'Subjects', value: subjectCount ?? 0, icon: BookOpen, color: 'bg-blue-100 text-blue-700', href: '/dashboard/subjects' },
    { label: 'Attendance Records', value: attendanceCount ?? 0, icon: CalendarCheck, color: 'bg-purple-100 text-purple-700', href: '/dashboard/attendance' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back, <span className="font-semibold text-blue-700">{profile?.name ?? user.email}</span>
          {profile?.role && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">{profile.role}</span>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="bg-white rounded-2xl shadow p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
            <div className={`rounded-xl p-3 ${color} group-hover:scale-110 transition-transform`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="font-semibold text-gray-700 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/attendance" className="bg-green-600 hover:bg-green-700 text-white rounded-2xl p-5 flex items-center gap-4 transition-colors shadow">
          <CalendarCheck className="w-8 h-8" />
          <div>
            <p className="font-bold text-lg">Mark Attendance</p>
            <p className="text-green-200 text-sm">Select subject & date, mark students</p>
          </div>
        </Link>
        <Link href="/dashboard/reports" className="bg-blue-700 hover:bg-blue-800 text-white rounded-2xl p-5 flex items-center gap-4 transition-colors shadow">
          <TrendingUp className="w-8 h-8" />
          <div>
            <p className="font-bold text-lg">View Reports</p>
            <p className="text-blue-200 text-sm">Student & subject-wise reports</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
