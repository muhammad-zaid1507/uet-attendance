'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subject, Student } from '@/lib/types'
import { formatDateShort, formatDate } from '@/lib/utils'
import { CheckCircle2, XCircle, Save, Plus, Trash2, CalendarCheck, Lock, Unlock, Eye, EyeOff } from 'lucide-react'

type Status = 'present' | 'absent'
const statusCycle: Status[] = ['present', 'absent']

export default function AttendancePage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [records, setRecords] = useState<Record<string, Record<string, Status>>>({})
  const [lockedDates, setLockedDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [dirty, setDirty] = useState(false)

  // Lock/unlock modal state
  const [lockModal, setLockModal] = useState<{ date: string; action: 'lock' | 'unlock' } | null>(null)
  const [lockPass, setLockPass] = useState('')
  const [lockPassShow, setLockPassShow] = useState(false)
  const [lockLoading, setLockLoading] = useState(false)
  const [lockError, setLockError] = useState('')

  useEffect(() => { loadInit() }, [])
  useEffect(() => { if (selectedSubject) loadAttendance() }, [selectedSubject])

  async function loadInit() {
    const supabase = createClient()
    const [{ data: subs }, { data: studs }] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('students').select('*').order('roll_no'),
    ])
    setSubjects(subs ?? [])
    setStudents(studs ?? [])
  }

  async function loadAttendance() {
    setLoading(true)
    const supabase = createClient()
    const [{ data: att }, { data: locks }] = await Promise.all([
      supabase.from('attendance').select('student_id, date, status').eq('subject_id', selectedSubject).order('date'),
      supabase.from('attendance_locks').select('date').eq('subject_id', selectedSubject),
    ])

    const newRecords: Record<string, Record<string, Status>> = {}
    const dateSet = new Set<string>()
    for (const r of att ?? []) {
      if (!newRecords[r.student_id]) newRecords[r.student_id] = {}
      newRecords[r.student_id][r.date] = r.status as Status
      dateSet.add(r.date)
    }

    setRecords(newRecords)
    setDates(Array.from(dateSet).sort())
    setLockedDates(new Set((locks ?? []).map((l: { date: string }) => l.date)))
    setDirty(false)
    setLoading(false)
  }

  function toggleStatus(studentId: string, date: string) {
    if (lockedDates.has(date)) return
    const current = records[studentId]?.[date] ?? 'absent'
    const next = statusCycle[(statusCycle.indexOf(current) + 1) % statusCycle.length]
    setRecords(prev => ({ ...prev, [studentId]: { ...(prev[studentId] ?? {}), [date]: next } }))
    setDirty(true)
  }

  function addDate() {
    if (!newDate || dates.includes(newDate)) return
    setDates(prev => [...prev, newDate].sort())
    setRecords(prev => {
      const next = { ...prev }
      for (const s of students) {
        if (!next[s.id]) next[s.id] = {}
        if (!next[s.id][newDate]) next[s.id][newDate] = 'absent'
      }
      return next
    })
    setNewDate('')
    setDirty(true)
  }

  async function deleteDate(date: string) {
    if (lockedDates.has(date)) return alert('This date is locked. Unlock it first.')
    if (!confirm(`Remove ${formatDate(date)}? All records for this date will be deleted.`)) return
    const supabase = createClient()
    await supabase.from('attendance').delete().eq('subject_id', selectedSubject).eq('date', date)
    setDates(prev => prev.filter(d => d !== date))
    setRecords(prev => {
      const next = { ...prev }
      for (const sid of Object.keys(next)) delete next[sid][date]
      return next
    })
  }

  async function saveAll() {
    if (!selectedSubject) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const upserts: { student_id: string; subject_id: string; date: string; status: Status; marked_by: string }[] = []

    for (const student of students) {
      for (const date of dates) {
        if (!lockedDates.has(date)) {
          upserts.push({ student_id: student.id, subject_id: selectedSubject, date, status: records[student.id]?.[date] ?? 'absent', marked_by: user?.id ?? '' })
        }
      }
    }
    if (upserts.length > 0) {
      await supabase.from('attendance').upsert(upserts, { onConflict: 'student_id,subject_id,date' })
    }
    setDirty(false)
    setSaving(false)
    alert('Attendance saved!')
  }

  function markAllForDate(date: string, status: Status) {
    if (lockedDates.has(date)) return
    setRecords(prev => {
      const next = { ...prev }
      for (const s of students) {
        if (!next[s.id]) next[s.id] = {}
        next[s.id][date] = status
      }
      return next
    })
    setDirty(true)
  }

  function openLockModal(date: string, action: 'lock' | 'unlock') {
    setLockModal({ date, action })
    setLockPass('')
    setLockError('')
    setLockPassShow(false)
  }

  async function handleLockAction() {
    if (!lockModal || !lockPass) return
    setLockLoading(true)
    setLockError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setLockError('Not logged in'); setLockLoading(false); return }

    // Re-verify password
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: lockPass })
    if (authErr) { setLockError('Wrong password. Try again.'); setLockLoading(false); return }

    if (lockModal.action === 'lock') {
      await supabase.from('attendance_locks').upsert({ subject_id: selectedSubject, date: lockModal.date, locked_by: user.id })
      setLockedDates(prev => new Set([...prev, lockModal.date]))
    } else {
      await supabase.from('attendance_locks').delete().eq('subject_id', selectedSubject).eq('date', lockModal.date)
      setLockedDates(prev => { const n = new Set(prev); n.delete(lockModal.date); return n })
    }

    setLockModal(null)
    setLockPass('')
    setLockLoading(false)
  }

  const statusIcon = (s: Status, locked: boolean) => {
    const cls = locked ? 'opacity-50' : ''
    if (s === 'present') return <CheckCircle2 className={`w-5 h-5 text-green-600 ${cls}`} />
    return <XCircle className={`w-5 h-5 text-red-400 ${cls}`} />
  }

  const statusCell = (s: Status, locked: boolean) => {
    const base = locked ? 'opacity-60 cursor-not-allowed ' : 'cursor-pointer '
    if (s === 'present') return base + 'bg-green-50 hover:bg-green-100'
    return base + 'bg-red-50 hover:bg-red-100'
  }

  const subjectName = subjects.find(s => s.id === selectedSubject)?.name ?? ''

  return (
    <div>
      {/* Lock/Unlock Modal */}
      {lockModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              {lockModal.action === 'lock'
                ? <Lock className="w-6 h-6 text-orange-500" />
                : <Unlock className="w-6 h-6 text-blue-500" />}
              <h3 className="font-bold text-gray-900 text-lg">
                {lockModal.action === 'lock' ? 'Lock' : 'Unlock'} Attendance
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {lockModal.action === 'lock' ? 'Locking' : 'Unlocking'} <strong>{formatDate(lockModal.date)}</strong>.
              Enter your login password to confirm.
            </p>
            <div className="relative mb-3">
              <input
                type={lockPassShow ? 'text' : 'password'}
                value={lockPass}
                onChange={e => setLockPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLockAction()}
                placeholder="Your password"
                autoFocus
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 pr-12"
              />
              <button type="button" onClick={() => setLockPassShow(!lockPassShow)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {lockPassShow ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {lockError && <p className="text-red-500 text-sm mb-3">{lockError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleLockAction}
                disabled={lockLoading || !lockPass}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors disabled:opacity-50 ${lockModal.action === 'lock' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {lockLoading ? 'Verifying...' : lockModal.action === 'lock' ? '🔒 Lock' : '🔓 Unlock'}
              </button>
              <button onClick={() => setLockModal(null)} className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-gray-300 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
          {subjectName && <p className="text-gray-500 text-sm">{subjectName}</p>}
        </div>
        {dirty && (
          <button onClick={saveAll} disabled={saving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 shadow-md animate-pulse">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Subject selector */}
      <div className="bg-white rounded-2xl shadow p-5 mb-5">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Subject</label>
        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 bg-white">
          <option value="">— Choose a subject —</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
        </select>
      </div>

      {selectedSubject && !loading && (
        <>
          {/* Add date */}
          <div className="bg-white rounded-2xl shadow p-4 mb-4 flex items-center gap-3 flex-wrap">
            <CalendarCheck className="w-5 h-5 text-green-600 shrink-0" />
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-400" />
            <button onClick={addDate} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Date
            </button>
            <span className="text-xs text-gray-400">Click cell to toggle P→A→L · Lock icon to lock a date</span>
          </div>

          {dates.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">No dates yet. Add a date above.</div>
          ) : (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-sm border-collapse min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 px-3 py-3 text-left font-semibold text-gray-600 border-b border-r min-w-[50px]">#</th>
                      <th className="sticky left-[50px] bg-gray-50 px-3 py-3 text-left font-semibold text-gray-600 border-b border-r min-w-[110px]">Roll No</th>
                      <th className="sticky left-[160px] bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 border-b border-r min-w-[160px]">Name</th>
                      {dates.map(date => {
                        const isLocked = lockedDates.has(date)
                        return (
                          <th key={date} className={`px-2 py-2 text-center font-semibold text-gray-600 border-b border-r min-w-[76px] ${isLocked ? 'bg-orange-50' : ''}`}>
                            <div className="flex flex-col items-center gap-1">
                              <span className="whitespace-nowrap text-xs">{formatDateShort(date)}</span>
                              <div className="flex gap-0.5 items-center">
                                {!isLocked && <>
                                  <button onClick={() => markAllForDate(date, 'present')} title="All present" className="text-green-600 hover:bg-green-100 rounded px-1 text-xs font-bold">P</button>
                                  <button onClick={() => markAllForDate(date, 'absent')} title="All absent" className="text-red-500 hover:bg-red-100 rounded px-1 text-xs font-bold">A</button>
                                  <button onClick={() => deleteDate(date)} title="Delete" className="text-gray-400 hover:text-red-500 rounded p-0.5"><Trash2 className="w-3 h-3" /></button>
                                </>}
                                <button
                                  onClick={() => openLockModal(date, isLocked ? 'unlock' : 'lock')}
                                  title={isLocked ? 'Unlock this date' : 'Lock this date'}
                                  className={`rounded p-0.5 ${isLocked ? 'text-orange-500 hover:bg-orange-100' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
                                >
                                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </th>
                        )
                      })}
                      <th className="px-3 py-3 text-center font-semibold text-gray-600 border-b min-w-[72px]">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, i) => {
                      const presentCount = dates.filter(d => records[student.id]?.[d] === 'present').length
                      const pct = dates.length > 0 ? Math.round((presentCount / dates.length) * 100) : 0
                      return (
                        <tr key={student.id} className="hover:bg-gray-50 border-b last:border-0">
                          <td className="sticky left-0 bg-white px-3 py-2.5 text-gray-400 border-r text-xs">{i + 1}</td>
                          <td className="sticky left-[50px] bg-white px-3 py-2.5 font-mono text-xs font-medium text-gray-800 border-r">{student.roll_no}</td>
                          <td className="sticky left-[160px] bg-white px-4 py-2.5 font-medium text-gray-900 border-r whitespace-nowrap text-sm">{student.name}</td>
                          {dates.map(date => {
                            const status = records[student.id]?.[date] ?? 'absent'
                            const locked = lockedDates.has(date)
                            return (
                              <td
                                key={date}
                                onClick={() => toggleStatus(student.id, date)}
                                className={`px-2 py-2.5 text-center transition-colors border-r ${statusCell(status, locked)}`}
                                title={locked ? `Locked · ${status}` : `Click to change · ${status}`}
                              >
                                <div className="flex justify-center">{statusIcon(status, locked)}</div>
                              </td>
                            )
                          })}
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${pct >= 75 ? 'bg-green-100 text-green-700' : pct >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t flex gap-4 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Present</span>
                <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-400" /> Absent</span>
                <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-orange-500" /> Locked date</span>
              </div>
            </div>
          )}
          {dirty && (
            <div className="mt-4 flex justify-end">
              <button onClick={saveAll} disabled={saving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-60 shadow">
                <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          )}
        </>
      )}
      {loading && <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">Loading attendance...</div>}
    </div>
  )
}
