'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'

const SECRET = 'arwa2025'

export default function ArwaAdminPage() {
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  function unlock(e: React.FormEvent) {
    e.preventDefault()
    if (pin === SECRET) setUnlocked(true)
    else { setStatus('Wrong PIN'); setPin('') }
  }

  async function resetTable(table: string, label: string) {
    if (!confirm(`Delete ALL ${label}? This cannot be undone.`)) return
    setLoading(true)
    setStatus('')
    const supabase = createClient()
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setStatus(error ? `Error: ${error.message}` : `✓ All ${label} deleted.`)
    setLoading(false)
  }

  async function resetAll() {
    if (!confirm('RESET EVERYTHING? All students, subjects, and attendance will be deleted. Cannot be undone.')) return
    setLoading(true)
    setStatus('Resetting...')
    const supabase = createClient()
    await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setStatus('✓ Complete reset done. System is clean.')
    setLoading(false)
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="bg-yellow-500 rounded-full p-3">
              <Shield className="w-8 h-8 text-gray-900" />
            </div>
          </div>
          <h1 className="text-white text-center text-xl font-bold mb-1">ARWA Admin</h1>
          <p className="text-gray-400 text-center text-sm mb-6">Restricted Access</p>
          <form onSubmit={unlock}>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:border-yellow-500 mb-3"
              autoFocus
            />
            {status && <p className="text-red-400 text-sm text-center mb-3">{status}</p>}
            <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl transition-colors">
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8 mt-4">
          <div className="bg-yellow-500 rounded-full p-2">
            <Shield className="w-6 h-6 text-gray-900" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">ARWA Admin Panel</h1>
            <p className="text-gray-400 text-xs">Super Admin · UET Attendance</p>
          </div>
        </div>

        <div className="bg-yellow-900/30 border border-yellow-700 rounded-2xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-yellow-300 text-sm">All actions here are permanent and cannot be undone. Use carefully.</p>
        </div>

        <div className="space-y-3">
          {/* Reset attendance only */}
          <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <h3 className="text-white font-semibold mb-1">Clear Attendance Records</h3>
            <p className="text-gray-400 text-sm mb-4">Keeps students & subjects. Only deletes attendance data.</p>
            <button
              onClick={() => resetTable('attendance', 'attendance records')}
              disabled={loading}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" /> Clear Attendance
            </button>
          </div>

          {/* Reset students */}
          <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <h3 className="text-white font-semibold mb-1">Delete All Students</h3>
            <p className="text-gray-400 text-sm mb-4">Removes all students and their attendance.</p>
            <button
              onClick={() => resetTable('students', 'students')}
              disabled={loading}
              className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Delete Students
            </button>
          </div>

          {/* Full reset */}
          <div className="bg-gray-800 rounded-2xl p-5 border border-red-800">
            <h3 className="text-red-400 font-bold mb-1">⚠ Full System Reset</h3>
            <p className="text-gray-400 text-sm mb-4">Deletes EVERYTHING — students, subjects, all attendance. Fresh start.</p>
            <button
              onClick={resetAll}
              disabled={loading}
              className="flex items-center gap-2 bg-red-900 hover:bg-red-800 border border-red-600 text-red-300 px-5 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> RESET EVERYTHING
            </button>
          </div>
        </div>

        {status && (
          <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${status.startsWith('✓') ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
            {status}
          </div>
        )}

        <p className="text-center text-gray-600 text-xs mt-8">ARWA Travel · Internal Tool · {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
