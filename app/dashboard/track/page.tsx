'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subject, Student } from '@/lib/types'
import { CheckCircle2, XCircle, Save, ChevronRight, Calendar, BookOpen, ChevronLeft, RotateCcw, WifiOff, RefreshCw } from 'lucide-react'

type Status = 'present' | 'absent'
type Step = 'date' | 'subject' | 'mark'

export default function TrackPage() {
  const [step, setStep] = useState<Step>('date')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [marks, setMarks] = useState<Record<string, Status>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedOffline, setSavedOffline] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSync, setPendingSync] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('subjects').select('*').order('name').then(({ data }: { data: Subject[] | null }) => setSubjects(data ?? []))
    supabase.from('students').select('*').order('roll_no').then(({ data }: { data: Student[] | null }) => {
      setStudents(data ?? [])
    })
    setIsOnline(navigator.onLine)
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    // Check for pending offline data
    if (localStorage.getItem('offline_attendance')) setPendingSync(true)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  const formatDateDisplay = (d: string) => new Date(d).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  async function selectSubject(sub: Subject) {
    setSelectedSubject(sub)
    const supabase = createClient()
    const { data } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('subject_id', sub.id)
      .eq('date', date)

    const init: Record<string, Status> = {}
    students.forEach(s => { init[s.id] = 'absent' })
    if (data && data.length > 0) {
      data.forEach((r: { student_id: string; status: string }) => {
        init[r.student_id] = r.status as Status
      })
    }
    setMarks(init)
    setCurrentIndex(0)
    setStep('mark')
  }

  function markCurrent(status: Status) {
    const student = students[currentIndex]
    if (!student) return
    setMarks(prev => ({ ...prev, [student.id]: status }))
    if (currentIndex < students.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  function goBack() {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1)
  }

  async function save() {
    if (!selectedSubject) return
    setSaving(true)
    const payload = {
      subject_id: selectedSubject.id,
      subject_name: selectedSubject.name,
      date,
      marks: Object.fromEntries(students.map(s => [s.id, marks[s.id] ?? 'absent'])),
    }

    if (!navigator.onLine) {
      // Save offline
      const existing = JSON.parse(localStorage.getItem('offline_attendance') ?? '[]')
      const idx = existing.findIndex((r: typeof payload) => r.subject_id === payload.subject_id && r.date === payload.date)
      if (idx >= 0) existing[idx] = payload; else existing.push(payload)
      localStorage.setItem('offline_attendance', JSON.stringify(existing))
      setSaving(false)
      setSavedOffline(true)
      setPendingSync(true)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const upserts = students.map(s => ({
        student_id: s.id,
        subject_id: selectedSubject.id,
        date,
        status: marks[s.id] ?? 'absent',
        marked_by: user?.id ?? '',
      }))
      await supabase.from('attendance').upsert(upserts, { onConflict: 'student_id,subject_id,date' })
      setSaving(false)
      setSaved(true)
    } catch {
      // Network failed mid-save — save offline
      const existing = JSON.parse(localStorage.getItem('offline_attendance') ?? '[]')
      existing.push(payload)
      localStorage.setItem('offline_attendance', JSON.stringify(existing))
      setSaving(false)
      setSavedOffline(true)
      setPendingSync(true)
    }
  }

  async function syncOffline() {
    const raw = localStorage.getItem('offline_attendance')
    if (!raw) return
    const pending: { subject_id: string; subject_name: string; date: string; marks: Record<string, string> }[] = JSON.parse(raw)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    for (const entry of pending) {
      const upserts = students.map(s => ({
        student_id: s.id,
        subject_id: entry.subject_id,
        date: entry.date,
        status: entry.marks[s.id] ?? 'absent',
        marked_by: user?.id ?? '',
      }))
      await supabase.from('attendance').upsert(upserts, { onConflict: 'student_id,subject_id,date' })
    }
    localStorage.removeItem('offline_attendance')
    setPendingSync(false)
    alert(`✅ Synced ${pending.length} session(s) to server!`)
  }

  function reset() {
    setStep('date')
    setSelectedSubject(null)
    setSaved(false)
    setSavedOffline(false)
    setCurrentIndex(0)
    setMarks({})
  }

  const presentCount = Object.values(marks).filter(s => s === 'present').length
  const absentCount = Object.values(marks).filter(s => s === 'absent').length
  const markedCount = Object.keys(marks).filter(id => marks[id] !== undefined).length
  const isLast = currentIndex === students.length - 1
  const currentStudent = students[currentIndex]
  const progress = students.length > 0 ? ((currentIndex) / students.length) * 100 : 0

  // ── SAVED OFFLINE ──
  if (savedOffline) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center mt-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-9 h-9 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Saved Offline</h2>
          <p className="text-gray-500 text-sm mb-1">{selectedSubject?.name}</p>
          <p className="text-gray-400 text-sm mb-3">{formatDateDisplay(date)}</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-5 text-sm text-orange-700">
            No internet detected. Attendance saved on this device.<br />
            <strong>Sync when you&apos;re back online.</strong>
          </div>
          <div className="flex gap-3 justify-center mb-6">
            <div className="bg-green-50 rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              <p className="text-xs text-green-600 font-medium">Present</p>
            </div>
            <div className="bg-red-50 rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-bold text-red-500">{absentCount}</p>
              <p className="text-xs text-red-500 font-medium">Absent</p>
            </div>
          </div>
          <button onClick={reset} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-colors">
            Mark Another Class
          </button>
        </div>
      </div>
    )
  }

  // ── SAVED ──
  if (saved) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center mt-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Saved!</h2>
          <p className="text-gray-500 text-sm mb-1">{selectedSubject?.name}</p>
          <p className="text-gray-400 text-sm mb-5">{formatDateDisplay(date)}</p>
          <div className="flex gap-3 justify-center mb-6">
            <div className="bg-green-50 rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              <p className="text-xs text-green-600 font-medium">Present</p>
            </div>
            <div className="bg-red-50 rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-bold text-red-500">{absentCount}</p>
              <p className="text-xs text-red-500 font-medium">Absent</p>
            </div>
            <div className="bg-blue-50 rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{students.length}</p>
              <p className="text-xs text-blue-600 font-medium">Total</p>
            </div>
          </div>
          <button onClick={reset} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors">
            Mark Another Class
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Offline warning banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl px-4 py-3 mb-4 text-sm font-medium">
          <WifiOff className="w-4 h-4 shrink-0" />
          No internet — attendance will be saved offline on this device
        </div>
      )}
      {/* Pending sync banner */}
      {pendingSync && isOnline && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 mb-4 text-sm">
          <span className="font-medium">📶 You&apos;re back online! Offline data waiting to sync.</span>
          <button onClick={syncOffline} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shrink-0 ml-3">
            <RefreshCw className="w-3.5 h-3.5" /> Sync Now
          </button>
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Quick Track</h1>
        <p className="text-gray-500 text-sm">One by one — fast in-class marking</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-5">
        {(['date', 'subject', 'mark'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${step === s ? 'bg-green-600 text-white' : i < ['date','subject','mark'].indexOf(step) ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
              {i < ['date','subject','mark'].indexOf(step) ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step === s ? 'text-green-700' : 'text-gray-400'}`}>
              {s === 'date' ? 'Date' : s === 'subject' ? 'Subject' : 'Mark'}
            </span>
            {i < 2 && <div className={`flex-1 h-0.5 ${i < ['date','subject','mark'].indexOf(step) ? 'bg-green-300' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: DATE ── */}
      {step === 'date' && (
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-green-100 rounded-xl p-2.5"><Calendar className="w-6 h-6 text-green-600" /></div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Confirm Date</h2>
              <p className="text-gray-400 text-sm">Today's date is pre-filled</p>
            </div>
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-base font-medium focus:outline-none focus:border-green-400 mb-3 text-gray-800" />
          <div className="bg-green-50 rounded-xl px-4 py-3 mb-5">
            <p className="text-green-700 font-semibold text-sm">{formatDateDisplay(date)}</p>
          </div>
          <button onClick={() => setStep('subject')}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors">
            Confirm Date <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── STEP 2: SUBJECT ── */}
      {step === 'subject' && (
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-blue-100 rounded-xl p-2.5"><BookOpen className="w-6 h-6 text-blue-600" /></div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Select Subject</h2>
              <p className="text-gray-400 text-sm">{formatDateDisplay(date)}</p>
            </div>
          </div>
          <div className="space-y-2">
            {subjects.map(sub => (
              <button key={sub.id} onClick={() => selectSubject(sub)}
                className="w-full flex items-center justify-between bg-gray-50 hover:bg-green-50 border-2 border-transparent hover:border-green-400 rounded-xl px-4 py-4 transition-all group">
                <div className="text-left">
                  <p className="font-bold text-gray-900 group-hover:text-green-700">{sub.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{sub.code}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-500" />
              </button>
            ))}
          </div>
          <button onClick={() => setStep('date')} className="mt-4 text-sm text-gray-400 hover:text-gray-600 w-full text-center">← Change date</button>
        </div>
      )}

      {/* ── STEP 3: ONE-BY-ONE MARK ── */}
      {step === 'mark' && currentStudent && (
        <div>
          {/* Header */}
          <div className="bg-green-600 text-white rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold">{selectedSubject?.name}</p>
                <p className="text-green-200 text-xs">{formatDateDisplay(date)}</p>
              </div>
              <div className="flex gap-3 text-center">
                <div><p className="text-lg font-bold">{presentCount}</p><p className="text-green-200 text-xs">P</p></div>
                <div><p className="text-lg font-bold">{absentCount}</p><p className="text-red-200 text-xs">A</p></div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="bg-green-700 rounded-full h-2">
              <div className="bg-white rounded-full h-2 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-green-200 text-xs mt-1">{currentIndex} of {students.length} marked</p>
          </div>

          {/* Student card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-4 text-center min-h-[200px] flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-blue-600">{currentStudent.name.charAt(0).toUpperCase()}</span>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">{currentStudent.name}</p>
            <p className="text-gray-400 font-mono text-sm mb-3">{currentStudent.roll_no}</p>

            {/* Show current mark if already marked */}
            {marks[currentStudent.id] && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${marks[currentStudent.id] === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {marks[currentStudent.id] === 'present' ? '✓ Present' : '✗ Absent'}
              </span>
            )}
          </div>

          {/* P / A buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => markCurrent('absent')}
              className="flex-1 bg-red-500 hover:bg-red-600 active:scale-95 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <XCircle className="w-6 h-6" /> Absent
            </button>
            <button
              onClick={() => markCurrent('present')}
              className="flex-1 bg-green-500 hover:bg-green-600 active:scale-95 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <CheckCircle2 className="w-6 h-6" /> Present
            </button>
          </div>

          {/* Navigation row */}
          <div className="flex gap-2 mb-4">
            <button onClick={goBack} disabled={currentIndex === 0}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-sm font-medium transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => setCurrentIndex(prev => Math.min(prev + 1, students.length - 1))} disabled={isLast}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-sm font-medium transition-colors">
              Skip <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setStep('subject')}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium transition-colors ml-auto">
              <RotateCcw className="w-4 h-4" /> Subject
            </button>
          </div>

          {/* Marked list preview */}
          {markedCount > 0 && (
            <div className="bg-white rounded-xl shadow p-3 mb-4 max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Marked so far</p>
              <div className="space-y-1">
                {students.slice(0, currentIndex).map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setCurrentIndex(i)}>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs w-4">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{s.roll_no}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${marks[s.id] === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {marks[s.id] === 'present' ? 'P' : 'A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button — show when on last student */}
          {isLast && (
            <button onClick={save} disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-lg">
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : `Save Attendance (${presentCount}P / ${absentCount}A)`}
            </button>
          )}
        </div>
      )}

      {/* All done — show save after going through all */}
      {step === 'mark' && !currentStudent && students.length > 0 && (
        <button onClick={save} disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-lg">
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : `Save Attendance (${presentCount}P / ${absentCount}A)`}
        </button>
      )}
    </div>
  )
}
