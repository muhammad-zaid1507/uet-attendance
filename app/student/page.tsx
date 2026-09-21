'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateShort, calcPercentage, statusBg } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Search, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface SubjectSummary {
  subject_id: string
  subject_name: string
  subject_code: string
  dates: string[]
  statuses: ('present' | 'absent' | 'late')[]
  present: number
  late: number
  total: number
}

export default function StudentPage() {
  const [rollNo, setRollNo] = useState('')
  const [studentName, setStudentName] = useState('')
  const [subjects, setSubjects] = useState<SubjectSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!rollNo.trim()) return
    setLoading(true)
    setError('')
    setSearched(false)
    const supabase = createClient()

    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('id, name, roll_no')
      .ilike('roll_no', rollNo.trim())
      .single()

    if (sErr || !student) {
      setError('Roll number not found. Check your roll number and try again.')
      setLoading(false)
      return
    }

    setStudentName(student.name)

    const { data: records } = await supabase
      .from('attendance')
      .select('subject_id, date, status, subjects(name, code)')
      .eq('student_id', student.id)
      .order('date', { ascending: true })

    const map: Record<string, SubjectSummary> = {}

    for (const r of records ?? []) {
      const sub = Array.isArray(r.subjects) ? r.subjects[0] as { name: string; code: string } | undefined : r.subjects as { name: string; code: string } | null
      if (!sub) continue
      if (!map[r.subject_id]) {
        map[r.subject_id] = {
          subject_id: r.subject_id,
          subject_name: sub.name,
          subject_code: sub.code,
          dates: [],
          statuses: [],
          present: 0,
          late: 0,
          total: 0,
        }
      }
      map[r.subject_id].dates.push(r.date)
      map[r.subject_id].statuses.push(r.status)
      map[r.subject_id].total++
      if (r.status === 'present') map[r.subject_id].present++
      if (r.status === 'late') map[r.subject_id].late++
    }

    setSubjects(Object.values(map))
    setSearched(true)
    setLoading(false)
  }

  const statusIcon = (s: string) => {
    if (s === 'present') return <CheckCircle2 className="w-4 h-4 text-green-600" />
    if (s === 'late') return <Clock className="w-4 h-4 text-yellow-500" />
    return <XCircle className="w-4 h-4 text-red-500" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="bg-green-600 text-white px-4 py-3 flex items-center gap-3">
        <Link href="/" className="hover:bg-green-700 rounded-lg p-1 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-bold text-lg leading-tight">My Attendance</h1>
          <p className="text-green-200 text-xs">UET · CS Section C · 2025 Fall</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Search */}
        <form onSubmit={search} className="bg-white rounded-2xl shadow p-6 mb-6 mt-4">
          <h2 className="font-semibold text-gray-700 mb-4">Enter Your Roll Number</h2>
          <div className="flex gap-3">
            <input
              value={rollNo}
              onChange={e => setRollNo(e.target.value)}
              placeholder="e.g. 2023-CS-001"
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </form>

        {/* Results */}
        {searched && (
          <div>
            <div className="bg-green-600 text-white rounded-2xl p-4 mb-4 shadow">
              <p className="text-green-200 text-xs uppercase tracking-wider">Student</p>
              <p className="text-xl font-bold mt-1">{studentName}</p>
              <p className="text-green-200 text-sm">{rollNo.toUpperCase()}</p>
            </div>

            {subjects.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">
                No attendance records found yet.
              </div>
            ) : (
              <div className="space-y-4">
                {subjects.map(sub => {
                  const pct = calcPercentage(sub.present + sub.late, sub.total)
                  return (
                    <div key={sub.subject_id} className="bg-white rounded-2xl shadow overflow-hidden">
                      {/* Subject header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b">
                        <div>
                          <span className="text-xs text-gray-400 font-mono">{sub.subject_code}</span>
                          <h3 className="font-bold text-gray-900 text-base">{sub.subject_name}</h3>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${statusBg(pct)}`}>
                            {pct}%
                          </span>
                          <p className="text-xs text-gray-400 mt-1">{sub.present + sub.late}/{sub.total} classes</p>
                        </div>
                      </div>

                      {/* Attendance row */}
                      <div className="p-4 overflow-x-auto">
                        <div className="flex gap-2 min-w-max">
                          {sub.dates.map((date, i) => (
                            <div key={date} className="flex flex-col items-center gap-1">
                              <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateShort(date)}</span>
                              {statusIcon(sub.statuses[i])}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="px-4 pb-3 flex gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Present ({sub.present})</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-yellow-500" /> Late ({sub.late})</span>
                        <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> Absent ({sub.total - sub.present - sub.late})</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
