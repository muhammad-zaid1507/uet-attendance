'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subject, Student } from '@/lib/types'
import { CheckCircle2, XCircle, Save, ChevronRight, Calendar, BookOpen, Users } from 'lucide-react'

type Status = 'present' | 'absent'

type Step = 'date' | 'subject' | 'mark'

export default function TrackPage() {
  const [step, setStep] = useState<Step>('date')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [marks, setMarks] = useState<Record<string, Status>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [existingDates, setExistingDates] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('subjects').select('*').order('name').then(({ data }: { data: Subject[] | null }) => setSubjects(data ?? []))
    supabase.from('students').select('*').order('roll_no').then(({ data }: { data: Student[] | null }) => {
      const studs = data ?? []
      setStudents(studs)
      const init: Record<string, Status> = {}
      studs.forEach((s: Student) => { init[s.id] = 'absent' })
      setMarks(init)
    })
  }, [])

  async function confirmDate() {
    setStep('subject')
  }

  async function selectSubject(sub: Subject) {
    setSelectedSubject(sub)
    // Check if this date already has attendance for this subject
    const supabase = createClient()
    const { data } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('subject_id', sub.id)
      .eq('date', date)

    if (data && data.length > 0) {
      // Load existing marks
      const existing: Record<string, Status> = {}
      students.forEach(s => { existing[s.id] = 'absent' })
      data.forEach((r: { student_id: string; status: string }) => {
        existing[r.student_id] = r.status as Status
      })
      setMarks(existing)
    } else {
      // Default all absent
      const init: Record<string, Status> = {}
      students.forEach(s => { init[s.id] = 'absent' })
      setMarks(init)
    }
    setStep('mark')
  }

  function toggle(studentId: string) {
    setMarks(prev => ({ ...prev, [studentId]: prev[studentId] === 'present' ? 'absent' : 'present' }))
  }

  function markAll(status: Status) {
    const all: Record<string, Status> = {}
    students.forEach(s => { all[s.id] = status })
    setMarks(all)
  }

  async function save() {
    if (!selectedSubject) return
    setSaving(true)
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
  }

  function reset() {
    setStep('date')
    setSelectedSubject(null)
    setSaved(false)
    const init: Record<string, Status> = {}
    students.forEach(s => { init[s.id] = 'absent' })
    setMarks(init)
  }

  const presentCount = Object.values(marks).filter(s => s === 'present').length
  const absentCount = students.length - presentCount

  const formatDateDisplay = (d: string) => new Date(d).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quick Track</h1>
        <p className="text-gray-500 text-sm">Mark today's attendance fast</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-6">
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
            <div className="bg-green-100 rounded-xl p-2.5">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Confirm Date</h2>
              <p className="text-gray-400 text-sm">Today's date is pre-filled</p>
            </div>
          </div>

          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-base font-medium focus:outline-none focus:border-green-400 mb-3 text-gray-800"
          />

          <div className="bg-green-50 rounded-xl px-4 py-3 mb-5">
            <p className="text-green-700 font-semibold text-sm">{formatDateDisplay(date)}</p>
          </div>

          <button
            onClick={confirmDate}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors"
          >
            Confirm Date <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── STEP 2: SUBJECT ── */}
      {step === 'subject' && (
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-blue-100 rounded-xl p-2.5">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Select Subject</h2>
              <p className="text-gray-400 text-sm">{formatDateDisplay(date)}</p>
            </div>
          </div>

          <div className="space-y-2">
            {subjects.map(sub => (
              <button
                key={sub.id}
                onClick={() => selectSubject(sub)}
                className="w-full flex items-center justify-between bg-gray-50 hover:bg-green-50 border-2 border-transparent hover:border-green-400 rounded-xl px-4 py-4 transition-all group"
              >
                <div className="text-left">
                  <p className="font-bold text-gray-900 group-hover:text-green-700">{sub.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{sub.code}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-500" />
              </button>
            ))}
          </div>

          <button onClick={() => setStep('date')} className="mt-4 text-sm text-gray-400 hover:text-gray-600 w-full text-center">
            ← Change date
          </button>
        </div>
      )}

      {/* ── STEP 3: MARK ── */}
      {step === 'mark' && (
        <div>
          {/* Header info */}
          <div className="bg-green-600 text-white rounded-2xl p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-bold text-lg">{selectedSubject?.name}</p>
              <p className="text-green-200 text-sm">{formatDateDisplay(date)}</p>
            </div>
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-xl font-bold">{presentCount}</p>
                <p className="text-green-200 text-xs">Present</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{absentCount}</p>
                <p className="text-green-200 text-xs">Absent</p>
              </div>
            </div>
          </div>

          {/* Mark all buttons */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => markAll('present')} className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 font-semibold py-2.5 rounded-xl text-sm transition-colors">
              ✓ All Present
            </button>
            <button onClick={() => markAll('absent')} className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 font-semibold py-2.5 rounded-xl text-sm transition-colors">
              ✗ All Absent
            </button>
          </div>

          {/* Student list */}
          <div className="bg-white rounded-2xl shadow overflow-hidden mb-4">
            {students.map((student, i) => {
              const isPresent = marks[student.id] === 'present'
              return (
                <button
                  key={student.id}
                  onClick={() => toggle(student.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors border-b last:border-0 ${isPresent ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-red-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs w-5 text-right shrink-0">{i + 1}</span>
                    <div className="text-left">
                      <p className={`font-semibold text-sm ${isPresent ? 'text-gray-900' : 'text-gray-500'}`}>{student.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{student.roll_no}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${isPresent ? 'bg-green-600 text-white' : 'bg-red-100 text-red-600'}`}>
                    {isPresent
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Present</>
                      : <><XCircle className="w-3.5 h-3.5" /> Absent</>}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Save */}
          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-lg"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : `Save Attendance (${presentCount}P / ${absentCount}A)`}
          </button>

          <button onClick={() => setStep('subject')} className="mt-3 text-sm text-gray-400 hover:text-gray-600 w-full text-center">
            ← Change subject
          </button>
        </div>
      )}
    </div>
  )
}
