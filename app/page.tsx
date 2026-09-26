'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Home() {
  const router = useRouter()
  const [taps, setTaps] = useState(0)
  const [hint, setHint] = useState(false)

  // Always sign out when home page loads — staff must re-login every time
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.signOut()
    })
    localStorage.removeItem('staff_login_time')
  }, [])

  function handleLogoTap() {
    const next = taps + 1
    setTaps(next)
    if (next === 3) setHint(true)
    if (next >= 5) {
      setTaps(0)
      setHint(false)
      router.push('/staff-login')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <button
              onClick={handleLogoTap}
              className="rounded-full bg-white shadow-lg p-2 active:scale-95 transition-transform select-none focus:outline-none hover:shadow-xl"
              title="UET Lahore"
            >
              <img
                src="https://www.uet.edu.pk/gallery/logo.jpg"
                alt="UET Lahore"
                width={80}
                height={80}
                className="rounded-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </button>
          </div>
          {hint && (
            <p className="text-green-500 text-xs mb-2 animate-pulse">Keep tapping...</p>
          )}
          <h1 className="text-3xl font-bold text-gray-900">UET Lahore</h1>
          <p className="text-green-700 font-semibold mt-1">Cybersecurity (CYS) – Section C</p>
          <p className="text-gray-500 text-sm mt-1">2025 Fall Morning</p>
        </div>

        {/* Student card only */}
        <Link href="/student" className="block group">
          <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-green-400 flex items-center gap-4">
            <div className="bg-green-100 rounded-xl p-3 group-hover:bg-green-200 transition-colors">
              <BookOpen className="w-7 h-7 text-green-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">View My Attendance</h2>
              <p className="text-gray-500 text-sm">Enter your roll number to check attendance</p>
            </div>
          </div>
        </Link>

        <p className="text-center text-gray-400 text-xs mt-8">
          Department of Computer Science · UET Lahore
        </p>
        <a
          href="https://arwatravel.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center mt-4 text-xs text-gray-300 hover:text-gray-400 transition-colors tracking-widest uppercase"
        >
          ✦ Crafted by ARWA TRAVELS ✦
        </a>
      </div>
    </main>
  )
}
