'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subject, Student } from '@/lib/types'
import { formatDateShort } from '@/lib/utils'
import { CheckCircle2, XCircle, Clock, Lock, FileDown, FileSpreadsheet } from 'lucide-react'

type Status = 'present' | 'absent' | 'late'

interface SheetData {
  subject: Subject
  dates: string[]
  students: Student[]
  records: Record<string, Record<string, Status>>
  lockedDates: Set<string>
}

export default function AttendanceSheetPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [sheet, setSheet] = useState<SheetData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('subjects').select('*').order('name').then(({ data }: { data: Subject[] | null }) => setSubjects(data ?? []))
  }, [])

  useEffect(() => { if (selectedSubject) loadSheet() }, [selectedSubject])

  async function loadSheet() {
    setLoading(true)
    const supabase = createClient()
    const subject = subjects.find(s => s.id === selectedSubject)
    if (!subject) return

    const [{ data: studs }, { data: att }, { data: locks }] = await Promise.all([
      supabase.from('students').select('*').order('roll_no'),
      supabase.from('attendance').select('student_id, date, status').eq('subject_id', selectedSubject).order('date'),
      supabase.from('attendance_locks').select('date').eq('subject_id', selectedSubject),
    ])

    const records: Record<string, Record<string, Status>> = {}
    const dateSet = new Set<string>()
    for (const r of att ?? []) {
      if (!records[r.student_id]) records[r.student_id] = {}
      records[r.student_id][r.date] = r.status as Status
      dateSet.add(r.date)
    }

    setSheet({
      subject,
      dates: Array.from(dateSet).sort(),
      students: studs ?? [],
      records,
      lockedDates: new Set((locks ?? []).map((l: { date: string }) => l.date)),
    })
    setLoading(false)
  }

  async function exportExcel() {
    if (!sheet) return
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    // Header rows
    const headerRows: (string | number)[][] = [
      ['UET Lahore – Cybersecurity (CYS) Section C – 2025 Fall Morning'],
      [`Subject: ${sheet.subject.name} (${sheet.subject.code})`],
      [`Total Classes: ${sheet.dates.length}   |   Powered by ARWA Travel`],
      [],
      ['#', 'Roll No', 'Student Name', ...sheet.dates.map(d => formatDateShort(d)), 'Present', 'Late', 'Absent', 'Total', '%'],
    ]

    const dataRows = sheet.students.map((student, i) => {
      const present = sheet.dates.filter(d => sheet.records[student.id]?.[d] === 'present').length
      const late = sheet.dates.filter(d => sheet.records[student.id]?.[d] === 'late').length
      const absent = sheet.dates.length - present - late
      const pct = sheet.dates.length > 0 ? Math.round(((present + late) / sheet.dates.length) * 100) : 0

      return [
        i + 1,
        student.roll_no,
        student.name,
        ...sheet.dates.map(d => {
          const s = sheet.records[student.id]?.[d] ?? 'absent'
          return s === 'present' ? 'P' : s === 'late' ? 'L' : 'A'
        }),
        present,
        late,
        absent,
        sheet.dates.length,
        `${pct}%`,
      ]
    })

    // Summary row
    const summaryRow = [
      '', '', 'TOTAL PRESENT',
      ...sheet.dates.map(d => {
        const count = sheet.students.filter(s => sheet.records[s.id]?.[d] === 'present' || sheet.records[s.id]?.[d] === 'late').length
        return count
      }),
      '', '', '', '', '',
    ]

    const allRows = [...headerRows, ...dataRows, [], summaryRow]
    const ws = XLSX.utils.aoa_to_sheet(allRows)

    // Column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 14 }, { wch: 24 },
      ...sheet.dates.map(() => ({ wch: 8 })),
      { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 7 }, { wch: 6 },
    ]

    // Merge header title
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 + sheet.dates.length } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 + sheet.dates.length } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 + sheet.dates.length } },
    ]

    XLSX.utils.book_append_sheet(wb, ws, sheet.subject.code.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 31))
    XLSX.writeFile(wb, `UET-CYS-${sheet.subject.code}-Attendance-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  async function exportPDF() {
    if (!sheet) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: sheet.dates.length > 8 ? 'landscape' : 'portrait' })
    doc.setFontSize(14)
    doc.setTextColor(22, 101, 52)
    doc.text('UET Lahore – CYS Section C – 2025 Fall Morning', 14, 16)
    doc.setFontSize(10)
    doc.setTextColor(50)
    doc.text(`Subject: ${sheet.subject.name} (${sheet.subject.code})  |  Total Classes: ${sheet.dates.length}`, 14, 23)
    doc.setFontSize(6)
    doc.setTextColor(150)
    doc.text('Powered by ARWA Travel', 14, 28)

    const head = [['#', 'Roll No', 'Name', ...sheet.dates.map(d => formatDateShort(d)), 'P', 'L', 'A', '%']]
    const body = sheet.students.map((student, i) => {
      const present = sheet.dates.filter(d => sheet.records[student.id]?.[d] === 'present').length
      const late = sheet.dates.filter(d => sheet.records[student.id]?.[d] === 'late').length
      const absent = sheet.dates.length - present - late
      const pct = sheet.dates.length > 0 ? Math.round(((present + late) / sheet.dates.length) * 100) : 0
      return [
        i + 1, student.roll_no, student.name,
        ...sheet.dates.map(d => {
          const s = sheet.records[student.id]?.[d] ?? 'absent'
          return s === 'present' ? 'P' : s === 'late' ? 'L' : 'A'
        }),
        present, late, absent, `${pct}%`,
      ]
    })

    autoTable(doc, {
      startY: 33,
      head,
      body,
      styles: { fontSize: sheet.dates.length > 10 ? 6 : 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: [22, 101, 52], fontSize: sheet.dates.length > 10 ? 6 : 7.5 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 36 },
      },
      didParseCell: (data: { section: string; row: { index: number }; column: { index: number }; cell: { styles: { fillColor: unknown; textColor: unknown } } }) => {
        if (data.section === 'body') {
          const colIdx = data.column.index - 3
          if (colIdx >= 0 && colIdx < sheet.dates.length) {
            const raw = body[data.row.index]?.[data.column.index]
            if (raw === 'P') { data.cell.styles.fillColor = [220, 252, 231]; data.cell.styles.textColor = [22, 101, 52] }
            else if (raw === 'L') { data.cell.styles.fillColor = [254, 249, 195]; data.cell.styles.textColor = [133, 77, 14] }
            else if (raw === 'A') { data.cell.styles.fillColor = [254, 226, 226]; data.cell.styles.textColor = [185, 28, 28] }
          }
        }
      },
      margin: { left: 10, right: 10 },
    })

    doc.save(`UET-CYS-${sheet.subject.code}-Sheet-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const statusIcon = (s: Status) => {
    if (s === 'present') return <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
    if (s === 'late') return <Clock className="w-4 h-4 text-yellow-500 mx-auto" />
    return <XCircle className="w-4 h-4 text-red-400 mx-auto" />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Sheet</h1>
          <p className="text-gray-500 text-sm">Date-wise register view per subject</p>
        </div>
        {sheet && (
          <div className="flex gap-2">
            <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow">
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
            <button onClick={exportPDF} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow">
              <FileDown className="w-4 h-4" /> Export PDF
            </button>
          </div>
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

      {loading && <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">Loading...</div>}

      {sheet && !loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              ['Students', sheet.students.length, 'bg-blue-50 text-blue-700'],
              ['Classes', sheet.dates.length, 'bg-green-50 text-green-700'],
              ['Locked', sheet.lockedDates.size, 'bg-orange-50 text-orange-700'],
              ['Unlocked', sheet.dates.length - sheet.lockedDates.size, 'bg-gray-50 text-gray-700'],
            ].map(([label, val, cls]) => (
              <div key={label as string} className={`rounded-2xl p-4 text-center ${cls}`}>
                <p className="text-2xl font-bold">{val}</p>
                <p className="text-sm font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Sheet header info */}
          <div className="bg-green-700 text-white rounded-t-2xl px-5 py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{sheet.subject.name}</p>
              <p className="text-green-200 text-sm">{sheet.subject.code} · {sheet.dates.length} classes · {sheet.students.length} students</p>
            </div>
            <p className="text-green-200 text-xs text-right">UET CYS Section C<br />2025 Fall Morning</p>
          </div>

          {/* Grid */}
          <div className="bg-white rounded-b-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse min-w-full">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="sticky left-0 bg-gray-100 px-2 py-3 text-left font-bold text-gray-700 border-r min-w-[36px]">#</th>
                    <th className="sticky left-[36px] bg-gray-100 px-3 py-3 text-left font-bold text-gray-700 border-r min-w-[110px]">Roll No</th>
                    <th className="sticky left-[146px] bg-gray-100 px-3 py-3 text-left font-bold text-gray-700 border-r min-w-[150px]">Name</th>
                    {sheet.dates.map(date => (
                      <th key={date} className={`px-1 py-2 text-center font-semibold text-gray-600 border-r min-w-[52px] ${sheet.lockedDates.has(date) ? 'bg-orange-50' : ''}`}>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="whitespace-nowrap leading-tight">{formatDateShort(date)}</span>
                          {sheet.lockedDates.has(date) && <Lock className="w-2.5 h-2.5 text-orange-400" />}
                        </div>
                      </th>
                    ))}
                    <th className="px-2 py-3 text-center font-bold text-green-700 border-r min-w-[36px]">P</th>
                    <th className="px-2 py-3 text-center font-bold text-yellow-600 border-r min-w-[36px]">L</th>
                    <th className="px-2 py-3 text-center font-bold text-red-500 border-r min-w-[36px]">A</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-600 border-r min-w-[40px]">Total</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-700 min-w-[44px]">%</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.students.map((student, i) => {
                    const present = sheet.dates.filter(d => sheet.records[student.id]?.[d] === 'present').length
                    const late = sheet.dates.filter(d => sheet.records[student.id]?.[d] === 'late').length
                    const absent = sheet.dates.length - present - late
                    const pct = sheet.dates.length > 0 ? Math.round(((present + late) / sheet.dates.length) * 100) : 0

                    return (
                      <tr key={student.id} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="sticky left-0 bg-inherit px-2 py-2 text-gray-400 border-r text-center">{i + 1}</td>
                        <td className="sticky left-[36px] bg-inherit px-3 py-2 font-mono font-semibold text-gray-800 border-r whitespace-nowrap">{student.roll_no}</td>
                        <td className="sticky left-[146px] bg-inherit px-3 py-2 font-medium text-gray-900 border-r whitespace-nowrap">{student.name}</td>
                        {sheet.dates.map(date => {
                          const status = sheet.records[student.id]?.[date] ?? 'absent'
                          return (
                            <td key={date} className={`px-1 py-2 border-r text-center ${status === 'present' ? 'bg-green-50' : status === 'late' ? 'bg-yellow-50' : 'bg-red-50/60'}`}>
                              {statusIcon(status)}
                            </td>
                          )
                        })}
                        <td className="px-2 py-2 text-center font-bold text-green-700 border-r">{present}</td>
                        <td className="px-2 py-2 text-center font-bold text-yellow-600 border-r">{late}</td>
                        <td className="px-2 py-2 text-center font-bold text-red-500 border-r">{absent}</td>
                        <td className="px-2 py-2 text-center text-gray-600 border-r">{sheet.dates.length}</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`font-bold px-1.5 py-0.5 rounded-full text-xs ${pct >= 75 ? 'bg-green-100 text-green-700' : pct >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Summary footer */}
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                    <td colSpan={3} className="sticky left-0 bg-gray-100 px-3 py-2 text-gray-700 border-r text-xs">PRESENT/LATE COUNT</td>
                    {sheet.dates.map(date => {
                      const count = sheet.students.filter(s => ['present', 'late'].includes(sheet.records[s.id]?.[date] ?? '')).length
                      return (
                        <td key={date} className="px-1 py-2 text-center text-gray-700 border-r text-xs">{count}</td>
                      )
                    })}
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t flex gap-4 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> P = Present</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-yellow-500" /> L = Late (counts toward %)</span>
              <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> A = Absent</span>
              <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-orange-400" /> 🔒 = Locked date</span>
            </div>
          </div>
        </>
      )}

      {!sheet && !loading && selectedSubject && (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">No attendance data yet for this subject.</div>
      )}
    </div>
  )
}
