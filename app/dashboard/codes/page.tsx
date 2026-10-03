'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subject } from '@/lib/types'
import { Plus, Clock, Trash2, Copy, Check, RefreshCw, ShieldOff, Users, CheckCircle2 } from 'lucide-react'

interface AttendanceCode {
  id: string
  code: string
  subject_id: string
  date: string
  expires_at: string
  is_active: boolean
  created_at: string
  subjects: { name: string; code: string } | null
}

const PRESETS = [5, 10, 15, 30]

export default function CodesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [codes, setCodes] = useState<AttendanceCode[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [selSubject, setSelSubject] = useState('')
  const [selDate, setSelDate] = useState(new Date().toISOString().split('T')[0])
  const [expiryMins, setExpiryMins] = useState(15)
  const [customMins, setCustomMins] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [watchCode, setWatchCode] = useState<AttendanceCode | null>(null)
  const [liveStudents, setLiveStudents] = useState<{ name: string; roll_no: string; marked_at: string }[]>([])
  const [liveLoading, setLiveLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('subjects').select('*').order('name').then(({ data }: { data: Subject[] | null }) => {
      setSubjects(data ?? [])
      if (data && data.length > 0) setSelSubject(data[0].id)
    })
    loadCodes()
  }, [])

  // Poll live students every 8s when watching a code
  useEffect(() => {
    if (!watchCode) return
    fetchLiveStudents(watchCode)
    const interval = setInterval(() => fetchLiveStudents(watchCode), 8000)
    return () => clearInterval(interval)
  }, [watchCode])

  async function fetchLiveStudents(code: AttendanceCode) {
    setLiveLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('attendance')
      .select('student_id, created_at, students(name, roll_no)')
      .eq('subject_id', code.subject_id)
      .eq('date', code.date)
      .eq('status', 'present')
      .gte('created_at', code.created_at)
      .order('created_at', { ascending: false })

    const list = (data ?? []).map((r: { student_id: string; created_at: string; students: unknown }) => {
      const s = Array.isArray(r.students) ? r.students[0] : r.students as { name: string; roll_no: string } | null
      return { name: s?.name ?? '—', roll_no: s?.roll_no ?? '—', marked_at: r.created_at }
    })
    setLiveStudents(list)
    setLiveLoading(false)
  }

  async function loadCodes() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('attendance_codes')
      .select('*, subjects(name, code)')
      .order('created_at', { ascending: false })
      .limit(30)
    setCodes((data ?? []) as AttendanceCode[])
    setLoading(false)
  }

  function generatePin() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  async function createCode() {
    if (!selSubject || !selDate) return
    setCreating(true)
    const supabase = createClient()
    const mins = useCustom ? parseInt(customMins) || 15 : expiryMins
    const expiresAt = new Date(Date.now() + mins * 60 * 1000).toISOString()
    const pin = generatePin()

    const { error } = await supabase.from('attendance_codes').insert({
      code: pin,
      subject_id: selSubject,
      date: selDate,
      expires_at: expiresAt,
      is_active: true,
    })

    if (!error) await loadCodes()
    setCreating(false)
  }

  async function deactivate(id: string) {
    const supabase = createClient()
    await supabase.from('attendance_codes').update({ is_active: false }).eq('id', id)
    await loadCodes()
  }

  async function deleteCode(id: string) {
    const supabase = createClient()
    await supabase.from('attendance_codes').delete().eq('id', id)
    await loadCodes()
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function isExpired(expires_at: string) {
    return new Date(expires_at) < new Date()
  }

  function timeLeft(expires_at: string) {
    const diff = new Date(expires_at).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const m = Math.floor(diff / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return m > 0 ? `${m}m ${s}s left` : `${s}s left`
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Codes</h1>
        <p className="text-gray-500 text-sm mt-1">Generate a code → share with class → students mark themselves present</p>
      </div>

      {/* Create code form */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-green-600" /> Generate New Code</h2>

        <div className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Subject</label>
            <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-400 bg-white">
              {subjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Date</label>
            <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-400" />
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Expiry Time</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {PRESETS.map(m => (
                <button key={m} type="button"
                  onClick={() => { setExpiryMins(m); setUseCustom(false) }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${!useCustom && expiryMins === m ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
                  {m} min
                </button>
              ))}
              <button type="button"
                onClick={() => setUseCustom(true)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${useCustom ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
                Custom
              </button>
            </div>
            {useCustom && (
              <input type="number" value={customMins} onChange={e => setCustomMins(e.target.value)}
                placeholder="Enter minutes (e.g. 45)"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400" />
            )}
          </div>

          <button onClick={createCode} disabled={creating || !selSubject}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            {creating ? 'Generating...' : 'Generate Code'}
          </button>
        </div>
      </div>

      {/* Codes list */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">Recent Codes</h2>
          <button onClick={loadCodes} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading && <div className="p-10 text-center text-gray-400">Loading...</div>}

        {!loading && codes.length === 0 && (
          <div className="p-10 text-center text-gray-400">No codes yet. Generate one above.</div>
        )}

        {!loading && codes.map(c => {
          const expired = isExpired(c.expires_at)
          const inactive = !c.is_active
          const dead = expired || inactive

          return (
            <div key={c.id} className={`border-b last:border-0 px-5 py-4 ${dead ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                {/* Code display */}
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-bold tracking-[0.2em] font-mono ${dead ? 'text-gray-400' : 'text-green-700'}`}>
                    {c.code}
                  </div>
                  {!dead && (
                    <button onClick={() => copyCode(c.code, c.id)}
                      className="text-gray-400 hover:text-green-600 transition-colors">
                      {copiedId === c.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                {!dead && (
                    <button onClick={() => setWatchCode(watchCode?.id === c.id ? null : c)}
                      title="Watch live"
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold transition-colors ${watchCode?.id === c.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600'}`}>
                      <Users className="w-3.5 h-3.5" /> Live
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!dead && (
                    <button onClick={() => deactivate(c.id)} title="Deactivate"
                      className="text-orange-400 hover:text-orange-600 transition-colors p-1">
                      <ShieldOff className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteCode(c.id)} title="Delete"
                    className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Meta */}
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{c.subjects?.name ?? '—'}</span>
                <span>{formatDate(c.date)}</span>
                <span className={`flex items-center gap-1 font-medium ${dead ? 'text-gray-400' : 'text-orange-600'}`}>
                  <Clock className="w-3 h-3" />
                  {inactive ? 'Deactivated' : timeLeft(c.expires_at)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Live students panel */}
      {watchCode && (
        <div className="bg-white rounded-2xl shadow mt-6 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-blue-50">
            <div>
              <p className="font-bold text-blue-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" />
                Live — {watchCode.subjects?.name}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">Code <span className="font-mono font-bold">{watchCode.code}</span> · refreshes every 8s</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">{liveStudents.length} present</span>
              <button onClick={() => setWatchCode(null)} className="text-blue-400 hover:text-blue-700 text-sm">✕</button>
            </div>
          </div>

          {liveStudents.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              {liveLoading ? 'Loading...' : 'Waiting for students to mark attendance...'}
            </div>
          ) : (
            <div className="divide-y max-h-72 overflow-y-auto">
              {liveStudents.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.roll_no}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(s.marked_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-center text-gray-400 text-xs mt-6">
        Share the 6-digit code with your class. Students go to <span className="font-mono">uet-attendance.vercel.app</span> → Mark Attendance with Code
      </p>
    </div>
  )
}
