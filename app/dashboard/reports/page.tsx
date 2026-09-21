'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Student, Subject } from '@/lib/types'
import { calcPercentage, statusBg } from '@/lib/utils'
import { Users, BookOpen, TrendingDown, FileDown } from 'lucide-react'

interface StudentReport {
  student: Student
  subjects: { subject: Subject; present: number; late: number; total: number; pct: number }[]
  overall: number
}

interface SubjectReport {
  subject: Subject
  students: { student: Student; present: number; late: number; total: number; pct: number }[]
  avgPct: number
  totalDates: number
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'students' | 'subjects' | 'low'>('students')
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [studentReports, setStudentReports] = useState<StudentReport[]>([])
  const [subjectReports, setSubjectReports] = useState<SubjectReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const supabase = createClient()
    const [{ data: studs }, { data: subs }, { data: att }] = await Promise.all([
      supabase.from('students').select('*').order('roll_no'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('attendance').select('student_id, subject_id, date, status'),
    ])

    const studList: Student[] = studs ?? []
    const subList: Subject[] = subs ?? []
    const attList: { student_id: string; subject_id: string; date: string; status: string }[] = att ?? []

    // Build student reports
    const sReports: StudentReport[] = studList.map(student => {
      const subjectData = subList.map(subject => {
        const rows = attList.filter(r => r.student_id === student.id && r.subject_id === subject.id)
        const present = rows.filter(r => r.status === 'present').length
        const late = rows.filter(r => r.status === 'late').length
        const total = rows.length
        return { subject, present, late, total, pct: calcPercentage(present + late, total) }
      }).filter(s => s.total > 0)

      const totalP = subjectData.reduce((a, b) => a + b.present + b.late, 0)
      const totalT = subjectData.reduce((a, b) => a + b.total, 0)
      return { student, subjects: subjectData, overall: calcPercentage(totalP, totalT) }
    })

    // Build subject reports
    const subReports: SubjectReport[] = subList.map(subject => {
      const rows = attList.filter(r => r.subject_id === subject.id)
      const totalDates = new Set(rows.map(r => r.date)).size
      const studentData = studList.map(student => {
        const srows = rows.filter(r => r.student_id === student.id)
        const present = srows.filter(r => r.status === 'present').length
        const late = srows.filter(r => r.status === 'late').length
        const total = srows.length
        return { student, present, late, total, pct: calcPercentage(present + late, total) }
      }).filter(s => s.total > 0)

      const avg = studentData.length > 0
        ? Math.round(studentData.reduce((a, b) => a + b.pct, 0) / studentData.length)
        : 0

      return { subject, students: studentData, avgPct: avg, totalDates }
    }).filter(r => r.students.length > 0)

    setStudents(studList)
    setSubjects(subList)
    setStudentReports(sReports)
    setSubjectReports(subReports)
    setLoading(false)
  }

  async function exportPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.setTextColor(22, 101, 52)
    doc.text('UET Lahore – CS Section C', 14, 18)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text('Attendance Report  |  2025 Fall Morning  |  Generated: ' + new Date().toLocaleDateString('en-PK'), 14, 26)
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(7)
    doc.text('Powered by ARWA Travel', 14, 32)

    let y = 40

    if (tab === 'students') {
      for (const sr of studentReports.filter(r => r.subjects.length > 0)) {
        doc.setFontSize(11)
        doc.setTextColor(30, 30, 30)
        doc.text(`${sr.student.name}  (${sr.student.roll_no})  —  Overall: ${sr.overall}%`, 14, y)
        y += 4
        autoTable(doc, {
          startY: y,
          head: [['Subject', 'Code', 'Present', 'Late', 'Absent', 'Total', '%']],
          body: sr.subjects.map(s => [s.subject.name, s.subject.code, s.present, s.late, s.total - s.present - s.late, s.total, `${s.pct}%`]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [22, 101, 52] },
          margin: { left: 14, right: 14 },
        })
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
        if (y > 260) { doc.addPage(); y = 20 }
      }
    } else if (tab === 'subjects') {
      for (const sr of subjectReports) {
        doc.setFontSize(11)
        doc.setTextColor(30, 30, 30)
        doc.text(`${sr.subject.name}  (${sr.subject.code})  —  Avg: ${sr.avgPct}%  |  ${sr.totalDates} classes`, 14, y)
        y += 4
        autoTable(doc, {
          startY: y,
          head: [['Roll No', 'Name', 'Present', 'Late', 'Absent', 'Total', '%']],
          body: sr.students.sort((a, b) => a.pct - b.pct).map(s => [s.student.roll_no, s.student.name, s.present, s.late, s.total - s.present - s.late, s.total, `${s.pct}%`]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [29, 78, 216] },
          margin: { left: 14, right: 14 },
        })
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
        if (y > 260) { doc.addPage(); y = 20 }
      }
    } else {
      autoTable(doc, {
        startY: y,
        head: [['Student', 'Roll No', 'Subject', 'Present/Total', '%', 'Short By']],
        body: lowAttendance.map(r => [r.student.name, r.student.roll_no, r.subject.name, `${r.present}/${r.total}`, `${r.pct}%`, `${Math.ceil(r.total * 0.75) - r.present} classes`]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [185, 28, 28] },
        margin: { left: 14, right: 14 },
      })
    }

    doc.save(`UET-CS-Attendance-${tab}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const lowAttendance = studentReports.flatMap(sr =>
    sr.subjects.filter(s => s.pct < 75 && s.total > 0).map(s => ({
      student: sr.student,
      subject: s.subject,
      pct: s.pct,
      present: s.present + s.late,
      total: s.total,
    }))
  ).sort((a, b) => a.pct - b.pct)

  if (loading) return <div className="p-10 text-center text-gray-400">Loading reports...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-200 rounded-2xl p-1 w-fit">
        {([['students', 'By Student', Users], ['subjects', 'By Subject', BookOpen], ['low', 'Low Attendance', TrendingDown]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === 'low' && lowAttendance.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">{lowAttendance.length}</span>
            )}
          </button>
        ))}
        </div>
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow"
        >
          <FileDown className="w-4 h-4" /> Export PDF
        </button>
      </div>

      {/* Student reports */}
      {tab === 'students' && (
        <div className="space-y-3">
          {studentReports.filter(r => r.subjects.length > 0).map(sr => (
            <div key={sr.student.id} className="bg-white rounded-2xl shadow overflow-hidden">
              <button
                onClick={() => setSelectedStudent(selectedStudent === sr.student.id ? null : sr.student.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <span className="font-bold text-gray-900">{sr.student.name}</span>
                  <span className="ml-3 text-xs font-mono text-gray-500">{sr.student.roll_no}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${statusBg(sr.overall)}`}>
                    Overall {sr.overall}%
                  </span>
                  <span className="text-gray-400">{selectedStudent === sr.student.id ? '▲' : '▼'}</span>
                </div>
              </button>
              {selectedStudent === sr.student.id && (
                <div className="border-t">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-5 py-2 text-left font-semibold text-gray-600">Subject</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-600">Present</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-600">Late</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-600">Total</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-600">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sr.subjects.map(s => (
                        <tr key={s.subject.id} className="border-t">
                          <td className="px-5 py-2.5">
                            <span className="font-mono text-xs text-blue-600">{s.subject.code}</span>
                            <span className="ml-2 text-gray-900">{s.subject.name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-green-700 font-medium">{s.present}</td>
                          <td className="px-4 py-2.5 text-center text-yellow-600 font-medium">{s.late}</td>
                          <td className="px-4 py-2.5 text-center text-gray-600">{s.total}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusBg(s.pct)}`}>{s.pct}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          {studentReports.filter(r => r.subjects.length > 0).length === 0 && (
            <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">No attendance records yet.</div>
          )}
        </div>
      )}

      {/* Subject reports */}
      {tab === 'subjects' && (
        <div className="space-y-3">
          {subjectReports.map(sr => (
            <div key={sr.subject.id} className="bg-white rounded-2xl shadow overflow-hidden">
              <button
                onClick={() => setSelectedSubject(selectedSubject === sr.subject.id ? null : sr.subject.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <span className="font-mono text-blue-600 text-sm">{sr.subject.code}</span>
                  <span className="ml-2 font-bold text-gray-900">{sr.subject.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{sr.totalDates} classes</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${statusBg(sr.avgPct)}`}>
                    Avg {sr.avgPct}%
                  </span>
                  <span className="text-gray-400">{selectedSubject === sr.subject.id ? '▲' : '▼'}</span>
                </div>
              </button>
              {selectedSubject === sr.subject.id && (
                <div className="border-t overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Roll No</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-600">Name</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-600">Present</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-600">Late</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-600">Total</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-600">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sr.students.sort((a, b) => a.pct - b.pct).map(s => (
                        <tr key={s.student.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{s.student.roll_no}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{s.student.name}</td>
                          <td className="px-4 py-2.5 text-center text-green-700 font-medium">{s.present}</td>
                          <td className="px-4 py-2.5 text-center text-yellow-600 font-medium">{s.late}</td>
                          <td className="px-4 py-2.5 text-center text-gray-600">{s.total}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusBg(s.pct)}`}>{s.pct}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          {subjectReports.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">No attendance records yet.</div>
          )}
        </div>
      )}

      {/* Low attendance */}
      {tab === 'low' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Students with attendance below 75% in any subject.</p>
          {lowAttendance.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">
              All students have attendance above 75%.
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-50 border-b">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Student</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Subject</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Classes</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">%</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Short by</th>
                  </tr>
                </thead>
                <tbody>
                  {lowAttendance.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-red-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.student.name}</p>
                        <p className="text-xs font-mono text-gray-400">{r.student.roll_no}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.subject.name}</p>
                        <p className="text-xs text-blue-600 font-mono">{r.subject.code}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.present}/{r.total}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">{r.pct}%</span>
                      </td>
                      <td className="px-4 py-3 text-center text-red-600 font-semibold text-sm">
                        {Math.ceil(r.total * 0.75) - r.present} classes
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
