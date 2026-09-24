'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, LayoutDashboard, Users, BookOpen, BarChart2, LogOut, Menu, X, TableProperties, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/students', label: 'Students', icon: Users },
  { href: '/dashboard/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/dashboard/track', label: 'Track', icon: Zap },
  { href: '/dashboard/reports/sheet', label: 'Sheet', icon: TableProperties },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart2 },
]

export default function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      {/* Top bar */}
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-7 h-7" />
          <div>
            <span className="font-bold text-base leading-tight block">UET Attendance</span>
            <span className="text-blue-200 text-xs">CYS Section C · 2025 Fall</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="hidden md:flex items-center gap-2 bg-blue-800 hover:bg-blue-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 hover:bg-blue-800 rounded-lg">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Desktop side nav — or horizontal nav bar */}
      <nav className="bg-white border-b shadow-sm overflow-x-auto">
        <div className="max-w-6xl mx-auto flex">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                pathname === href
                  ? 'border-blue-600 text-blue-700 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <button
            onClick={logout}
            className="md:hidden ml-auto flex items-center gap-2 px-5 py-3 text-sm font-medium text-red-500 hover:bg-red-50 whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </nav>
    </>
  )
}
