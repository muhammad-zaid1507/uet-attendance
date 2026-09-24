'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subject, Student } from '@/lib/types'
import { formatDateShort } from '@/lib/utils'
import { CheckCircle2, XCircle, Lock, FileDown, FileSpreadsheet } from 'lucide-react'

type Status = 'present' | 'absent'

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

    // Format date as DD-MMM (e.g. 23-Sep)
    const fmtDate = (d: string) => {
      const dt = new Date(d)
      return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    }

    const wb = XLSX.utils.book_new()

    // Build rows
    const title = `UET Lahore – Cybersecurity (CYS) Section C – 2025 Fall Morning`
    const subTitle = `Subject: ${sheet.subject.name}  (${sheet.subject.code})     Total Classes: ${sheet.dates.length}     Students: ${sheet.students.length}`
    const watermark = `Powered by ARWA TRAVELS`

    const headerRow = ['#', 'Roll No', 'Student Name', ...sheet.dates.map(fmtDate), 'P', 'A', 'Total', '%']

    const dataRows = sheet.students.map((student, i) => {
      const present = sheet.dates.filter(d => sheet.records[student.id]?.[d] === 'present').length
      const absent = sheet.dates.length - present
      const pct = sheet.dates.length > 0 ? Math.round((present / sheet.dates.length) * 100) : 0
      return [
        i + 1,
        student.roll_no,
        student.name,
        ...sheet.dates.map(d => (sheet.records[student.id]?.[d] === 'present' ? 'P' : 'A')),
        present,
        absent,
        sheet.dates.length,
        `${pct}%`,
      ]
    })

    const summaryRow = [
      '', '', 'PRESENT COUNT',
      ...sheet.dates.map(d => sheet.students.filter(s => sheet.records[s.id]?.[d] === 'present').length),
      '', '', '', '',
    ]

    const allRows = [
      [title],
      [subTitle],
      [watermark],
      [],
      headerRow,
      ...dataRows,
      [],
      summaryRow,
    ]

    const ws = XLSX.utils.aoa_to_sheet(allRows)

    // Column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 15 }, { wch: 26 },
      ...sheet.dates.map(() => ({ wch: 7 })),
      { wch: 6 }, { wch: 6 }, { wch: 7 }, { wch: 6 },
    ]

    // Merge title rows across all columns
    const totalCols = 3 + sheet.dates.length + 4 - 1
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols } },
    ]

    const sheetName = sheet.subject.code.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `UET-CYS-${sheet.subject.code}-Register-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  async function exportPDF() {
    if (!sheet) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const isLandscape = sheet.dates.length > 6
    const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait' })

    // Header
    doc.setFontSize(13)
    doc.setTextColor(22, 101, 52)
    doc.text('UET Lahore – Cybersecurity (CYS) Section C – 2025 Fall Morning', 14, 15)
    doc.setFontSize(9)
    doc.setTextColor(50)
    doc.text(`Subject: ${sheet.subject.name}  (${sheet.subject.code})   |   Total Classes: ${sheet.dates.length}   |   Students: ${sheet.students.length}`, 14, 22)
    doc.setFontSize(6)
    doc.setTextColor(160)
    doc.text('Powered by ARWA TRAVELS', 14, 27)

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

    const head = [['#', 'Roll No', 'Name', ...sheet.dates.map(fmtDate), 'P', 'A', '%']]
    const body = sheet.students.map((student, i) => {
      const present = sheet.dates.filter(d => sheet.records[student.id]?.[d] === 'present').length
      const absent = sheet.dates.length - present
      const pct = sheet.dates.length > 0 ? Math.round((present / sheet.dates.length) * 100) : 0
      return [
        i + 1, student.roll_no, student.name,
        ...sheet.dates.map(d => (sheet.records[student.id]?.[d] === 'present' ? 'P' : 'A')),
        present, absent, `${pct}%`,
      ]
    })

    const fontSize = sheet.dates.length > 12 ? 5.5 : sheet.dates.length > 8 ? 6.5 : 7.5

    autoTable(doc, {
      startY: 31,
      head,
      body,
      styles: { fontSize, cellPadding: 1.2, lineColor: [200, 200, 200], lineWidth: 0.2 },
      headStyles: { fillColor: [22, 101, 52], textColor: 255, fontSize, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 248] },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: isLandscape ? 25 : 22 },
        2: { cellWidth: isLandscape ? 38 : 34 },
      },
      didParseCell: (data: { section: string; row: { index: number }; column: { index: number }; cell: { styles: { fillColor: unknown; textColor: unknown; fontStyle: unknown; halign: unknown } } }) => {
        if (data.section === 'body') {
          const colIdx = data.column.index - 3
          if (colIdx >= 0 && colIdx < sheet.dates.length) {
            const raw = body[data.row.index]?.[data.column.index]
            data.cell.styles.halign = 'center'
            if (raw === 'P') { data.cell.styles.fillColor = [220, 252, 231]; data.cell.styles.textColor = [22, 101, 52]; data.cell.styles.fontStyle = 'bold' }
            else { data.cell.styles.fillColor = [254, 226, 226]; data.cell.styles.textColor = [185, 28, 28] }
          }
          // % column — color by threshold
          const lastCol = 3 + sheet.dates.length + 2
          if (data.column.index === lastCol) {
            const val = parseInt(String(body[data.row.index]?.[data.column.index]) ?? '0')
            data.cell.styles.fontStyle = 'bold'
            if (val >= 75) { data.cell.styles.textColor = [22, 101, 52] }
            else { data.cell.styles.textColor = [185, 28, 28] }
          }
        }
      },
      margin: { left: 10, right: 10 },
    })

    // Summary row at bottom
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
    doc.setFontSize(7)
    doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleString('en-PK')}   |   ARWA TRAVELS`, 14, finalY)

    doc.save(`UET-CYS-${sheet.subject.code}-Register-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Sheet</h1>
          <p className="text-gray-500 text-sm">Date-wise register — export Excel or PDF for teacher</p>
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
        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 bg-white">
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

          {/* Sheet header */}
          <div className="bg-green-700 text-white rounded-t-2xl px-5 py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{sheet.subject.name}</p>
              <p className="text-green-200 text-sm">{sheet.subject.code} · {sheet.dates.length} classes · {sheet.students.length} students</p>
            </div>
            <p className="text-green-200 text-xs text-right">UET CYS Section C<br />2025 Fall Morning</p>
          </div>

          {sheet.dates.length === 0 ? (
            <div className="bg-white rounded-b-2xl shadow p-10 text-center text-gray-400">
              No attendance marked yet for this subject.
            </div>
          ) : (
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
                      <th className="px-2 py-3 text-center font-bold text-red-500 border-r min-w-[36px]">A</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-600 border-r min-w-[40px]">Total</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 min-w-[44px]">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.students.map((student, i) => {
                      const present = sheet.dates.filter(d => sheet.records[student.id]?.[d] === 'present').length
                      const absent = sheet.dates.length - present
                      const pct = sheet.dates.length > 0 ? Math.round((present / sheet.dates.length) * 100) : 0

                      return (
                        <tr key={student.id} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="sticky left-0 bg-inherit px-2 py-2 text-gray-400 border-r text-center">{i + 1}</td>
                          <td className="sticky left-[36px] bg-inherit px-3 py-2 font-mono font-semibold text-gray-800 border-r whitespace-nowrap">{student.roll_no}</td>
                          <td className="sticky left-[146px] bg-inherit px-3 py-2 font-medium text-gray-900 border-r whitespace-nowrap">{student.name}</td>
                          {sheet.dates.map(date => {
                            const status = sheet.records[student.id]?.[date] ?? 'absent'
                            return (
                              <td key={date} className={`px-1 py-2 border-r text-center font-bold text-xs ${status === 'present' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                                {status === 'present' ? 'P' : 'A'}
                              </td>
                            )
                          })}
                          <td className="px-2 py-2 text-center font-bold text-green-700 border-r">{present}</td>
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
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                      <td colSpan={3} className="sticky left-0 bg-gray-100 px-3 py-2 text-gray-700 border-r text-xs uppercase tracking-wide">Present Count</td>
                      {sheet.dates.map(date => {
                        const count = sheet.students.filter(s => sheet.records[s.id]?.[date] === 'present').length
                        return <td key={date} className="px-1 py-2 text-center text-green-700 border-r text-xs font-bold">{count}</td>
                      })}
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t flex gap-4 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1 text-green-700 font-bold">P = Present</span>
                <span className="flex items-center gap-1 text-red-500 font-bold">A = Absent</span>
                <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-orange-400" /> = Locked date</span>
                <span className="ml-auto text-gray-300">ARWA TRAVELS</span>
              </div>
            </div>
          )}
        </>
      )}

      {!sheet && !loading && selectedSubject && (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">No attendance data yet for this subject.</div>
      )}
    </div>
  )
}
