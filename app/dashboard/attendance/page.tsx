'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subject, Student, AttendanceRecord } from '@/lib/types'
import { formatDateShort, formatDate } from '@/lib/utils'
import { CheckCircle2, XCircle, Clock, Save, Plus, Trash2, CalendarCheck } from 'lucide-react'

type Status = 'present' | 'absent' | 'late'

const statusCycle: Status[] = ['present', 'absent', 'late']

export default function AttendancePage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [records, setRecords] = useState<Record<string, Record<string, Status>>>({}) // studentId -> date -> status
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    loadInit()
  }, [])

  useEffect(() => {
    if (selectedSubject) loadAttendance()
  }, [selectedSubject])

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
    const { data } = await supabase
      .from('attendance')
      .select('student_id, date, status')
      .eq('subject_id', selectedSubject)
      .order('date')

    const newRecords: Record<string, Record<string, Status>> = {}
    const dateSet = new Set<string>()

    for (const r of data ?? []) {
      if (!newRecords[r.student_id]) newRecords[r.student_id] = {}
      newRecords[r.student_id][r.date] = r.status as Status
      dateSet.add(r.date)
    }

    setRecords(newRecords)
    setDates(Array.from(dateSet).sort())
    setDirty(false)
    setLoading(false)
  }

  function toggleStatus(studentId: string, date: string) {
    const current = records[studentId]?.[date] ?? 'absent'
    const next = statusCycle[(statusCycle.indexOf(current) + 1) % statusCycle.length]
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [date]: next },
    }))
    setDirty(true)
  }

  function addDate() {
    if (!newDate || dates.includes(newDate)) return
    setDates(prev => [...prev, newDate].sort())
    // default everyone to absent
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
    if (!confirm(`Remove date ${formatDate(date)}? All records for this date will be deleted.`)) return
    const supabase = createClient()
    await supabase.from('attendance').delete().eq('subject_id', selectedSubject).eq('date', date)
    setDates(prev => prev.filter(d => d !== date))
    setRecords(prev => {
      const next = { ...prev }
      for (const sid of Object.keys(next)) {
        delete next[sid][date]
      }
      return next
    })
  }

  async function saveAll() {
    if (!selectedSubject) return
    setSaving(true)
    const supabase = createClient()

    const upserts: { student_id: string; subject_id: string; date: string; status: Status; marked_by: string }[] = []
    const { data: { user } } = await supabase.auth.getUser()

    for (const student of students) {
      for (const date of dates) {
        upserts.push({
          student_id: student.id,
          subject_id: selectedSubject,
          date,
          status: records[student.id]?.[date] ?? 'absent',
          marked_by: user?.id ?? '',
        })
      }
    }

    await supabase.from('attendance').upsert(upserts, {
      onConflict: 'student_id,subject_id,date',
    })

    setDirty(false)
    setSaving(false)
    alert('Attendance saved!')
  }

  function markAllForDate(date: string, status: Status) {
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

  const statusIcon = (s: Status) => {
    if (s === 'present') return <CheckCircle2 className="w-5 h-5 text-green-600" />
    if (s === 'late') return <Clock className="w-5 h-5 text-yellow-500" />
    return <XCircle className="w-5 h-5 text-red-400" />
  }

  const statusCell = (s: Status) => {
    if (s === 'present') return 'bg-green-50 hover:bg-green-100'
    if (s === 'late') return 'bg-yellow-50 hover:bg-yellow-100'
    return 'bg-red-50 hover:bg-red-100'
  }

  const subjectName = subjects.find(s => s.id === selectedSubject)?.name ?? ''

  return (
    <div>
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
        <select
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 bg-white"
        >
          <option value="">— Choose a subject —</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
        </select>
      </div>

      {selectedSubject && !loading && (
        <>
          {/* Add date */}
          <div className="bg-white rounded-2xl shadow p-4 mb-4 flex items-center gap-3 flex-wrap">
            <CalendarCheck className="w-5 h-5 text-green-600 shrink-0" />
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-400"
            />
            <button onClick={addDate} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Date
            </button>
            <span className="text-xs text-gray-400">Tip: Click a cell to toggle Present → Absent → Late</span>
          </div>

          {dates.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">
              <p>No dates added yet. Add a date above to start marking attendance.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-sm border-collapse min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 border-b border-r min-w-[60px]">#</th>
                      <th className="sticky left-[60px] bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 border-b border-r min-w-[120px]">Roll No</th>
                      <th className="sticky left-[180px] bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 border-b border-r min-w-[160px]">Name</th>
                      {dates.map(date => (
                        <th key={date} className="px-2 py-3 text-center font-semibold text-gray-600 border-b border-r min-w-[80px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className="whitespace-nowrap text-xs">{formatDateShort(date)}</span>
                            <div className="flex gap-1">
                              <button onClick={() => markAllForDate(date, 'present')} title="Mark all present" className="text-green-600 hover:bg-green-100 rounded p-0.5 text-xs">P</button>
                              <button onClick={() => markAllForDate(date, 'absent')} title="Mark all absent" className="text-red-500 hover:bg-red-100 rounded p-0.5 text-xs">A</button>
                              <button onClick={() => deleteDate(date)} title="Delete date" className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded p-0.5">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 border-b min-w-[80px]">Present</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, i) => {
                      const presentCount = dates.filter(d => records[student.id]?.[d] === 'present').length
                      const lateCount = dates.filter(d => records[student.id]?.[d] === 'late').length
                      const pct = dates.length > 0 ? Math.round(((presentCount + lateCount) / dates.length) * 100) : 0

                      return (
                        <tr key={student.id} className="hover:bg-gray-50 border-b last:border-0">
                          <td className="sticky left-0 bg-white hover:bg-gray-50 px-4 py-2.5 text-gray-400 border-r">{i + 1}</td>
                          <td className="sticky left-[60px] bg-white hover:bg-gray-50 px-4 py-2.5 font-mono text-xs font-medium text-gray-800 border-r">{student.roll_no}</td>
                          <td className="sticky left-[180px] bg-white hover:bg-gray-50 px-4 py-2.5 font-medium text-gray-900 border-r whitespace-nowrap">{student.name}</td>
                          {dates.map(date => {
                            const status = records[student.id]?.[date] ?? 'absent'
                            return (
                              <td
                                key={date}
                                onClick={() => toggleStatus(student.id, date)}
                                className={`px-2 py-2.5 text-center cursor-pointer transition-colors border-r ${statusCell(status)}`}
                                title={`Click to change: ${status}`}
                              >
                                <div className="flex justify-center">{statusIcon(status)}</div>
                              </td>
                            )
                          })}
                          <td className="px-4 py-2.5 text-center">
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

              {/* Legend */}
              <div className="px-4 py-3 bg-gray-50 border-t flex gap-4 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Present (P)</span>
                <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-400" /> Absent (A)</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-yellow-500" /> Late (L)</span>
                <span className="text-gray-400">· Click any cell to toggle status · P/A buttons in header marks all</span>
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

      {loading && (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">
          Loading attendance...
        </div>
      )}
    </div>
  )
}
