'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subject } from '@/lib/types'
import { CheckCircle2, XCircle, Trash2, FileText, Save } from 'lucide-react'

interface MatchedStudent {
  id: string
  name: string
  roll_no: string
  num: string
}

export default function PaperPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selSubject, setSelSubject] = useState('')
  const [selDate, setSelDate] = useState(new Date().toISOString().split('T')[0])
  const [input, setInput] = useState('')
  const [matched, setMatched] = useState<MatchedStudent[]>([])
  const [notFound, setNotFound] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('subjects').select('*').order('name').then(({ data }) => {
      setSubjects(data ?? [])
      if (data && data.length > 0) setSelSubject(data[0].id)
    })
  }, [])

  async function handleAdd() {
    const num = input.trim().replace(/\D/g, '')
    if (!num) return
    setInput('')
    inputRef.current?.focus()

    // Don't add duplicates
    if (matched.some(m => m.num === num)) return

    const supabase = createClient()
    const { data: student } = await supabase
      .from('students')
      .select('id, name, roll_no')
      .ilike('roll_no', `%-${num}`)
      .single()

    if (!student) {
      setNotFound(prev => prev.includes(num) ? prev : [...prev, num])
    } else {
      setMatched(prev => prev.some(m => m.id === student.id) ? prev : [...prev, { ...student, num }])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd()
  }

  function removeStudent(id: string) {
    setMatched(prev => prev.filter(m => m.id !== id))
  }

  async function handleFinish() {
    if (!selSubject || matched.length === 0) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const upserts = matched.map(m => ({
      student_id: m.id,
      subject_id: selSubject,
      date: selDate,
      status: 'present' as const,
      marked_by: user?.id ?? null,
    }))

    await supabase.from('attendance').upsert(upserts, { onConflict: 'student_id,subject_id,date' })

    setSaving(false)
    setSaved(true)
    setMatched([])
    setNotFound([])
    setTimeout(() => setSaved(false), 3000)
  }

  function reset() {
    setMatched([])
    setNotFound([])
    setInput('')
    inputRef.current?.focus()
  }

  const subjectName = subjects.find(s => s.id === selSubject)?.name ?? ''

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" /> Paper Attendance
        </h1>
        <p className="text-gray-500 text-sm mt-1">Type student numbers one by one, then press Finish</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 font-semibold text-sm">
          <CheckCircle2 className="w-5 h-5" /> Attendance saved!
        </div>
      )}

      {/* Subject & Date */}
      <div className="bg-white rounded-2xl shadow p-5 mb-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1.5">Subject</label>
          <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-400 bg-white">
            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1.5">Date</label>
          <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-400" />
        </div>
      </div>

      {/* Number input */}
      <div className="bg-white rounded-2xl shadow p-5 mb-4">
        <label className="block text-sm font-semibold text-gray-600 mb-2">
          Enter student number <span className="text-gray-400 font-normal">(just the last digits, e.g. 121 from 2025-CYS-121)</span>
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="number"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 121"
            autoFocus
            className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-gray-900 focus:outline-none focus:border-blue-400 bg-gray-50"
          />
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Press Enter or tap Add after each number</p>
      </div>

      {/* Present list */}
      {matched.length > 0 && (
        <div className="bg-white rounded-2xl shadow overflow-hidden mb-4">
          <div className="flex items-center justify-between px-5 py-3 border-b bg-green-50">
            <p className="font-bold text-green-800 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Present — {matched.length} student{matched.length > 1 ? 's' : ''}
            </p>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {matched.map(m => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{m.roll_no}</p>
                </div>
                <button onClick={() => removeStudent(m.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not found */}
      {notFound.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 mb-4">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4" /> Not found
          </p>
          <div className="flex flex-wrap gap-2">
            {notFound.map(n => (
              <span key={n} className="bg-red-100 text-red-700 font-mono text-xs px-2 py-1 rounded-lg">{n}</span>
            ))}
          </div>
          <p className="text-xs text-red-500 mt-2">Check the roll numbers — these suffixes didn&apos;t match any student.</p>
        </div>
      )}

      {/* Finish */}
      <button
        onClick={handleFinish}
        disabled={saving || matched.length === 0 || !selSubject}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold text-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-3 shadow-md"
      >
        <Save className="w-6 h-6" />
        {saving ? 'Saving...' : `Finish — Mark ${matched.length} Present`}
      </button>
      {matched.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-2">
          {subjectName} · {new Date(selDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}
