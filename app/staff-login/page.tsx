'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

export default function StaffLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }
    localStorage.setItem('staff_login_time', Date.now().toString())
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-gray-800 flex flex-col items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-3">
            <div className="bg-white rounded-full p-1 shadow-lg">
              <Image
                src="https://www.uet.edu.pk/gallery/logo.jpg"
                alt="UET Lahore"
                width={64}
                height={64}
                className="rounded-full object-contain"
                unoptimized
              />
            </div>
          </div>
          <h2 className="text-white text-xl font-bold">Staff Login</h2>
          <p className="text-gray-400 text-sm mt-1">CYS Section C · 2025 Fall</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-white/10 text-white border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 placeholder-gray-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/10 text-white border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 placeholder-gray-500 transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 mt-2"
          >
            <LogIn className="w-5 h-5" />
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
      <p className="text-gray-600 text-xs mt-6 tracking-widest">ARWA Travel · Internal</p>
    </div>
  )
}
