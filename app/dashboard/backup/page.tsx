'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, Upload, CheckCircle2, AlertTriangle, Database } from 'lucide-react'

export default function BackupPage() {
  const [downloading, setDownloading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restoreMsg, setRestoreMsg] = useState('')
  const [restoreError, setRestoreError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function downloadBackup() {
    setDownloading(true)
    const supabase = createClient()

    const [{ data: students }, { data: subjects }, { data: attendance }, { data: locks }] = await Promise.all([
      supabase.from('students').select('*').order('roll_no'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('attendance').select('*').order('date'),
      supabase.from('attendance_locks').select('*'),
    ])

    const backup = {
      version: 1,
      exported_at: new Date().toISOString(),
      students: students ?? [],
      subjects: subjects ?? [],
      attendance: attendance ?? [],
      attendance_locks: locks ?? [],
    }

    const studentList = students ?? []
    const subjectList = subjects ?? []
    const attList: { student_id: string; subject_id: string; date: string; status: string }[] = attendance ?? []

    // Build per-subject Excel sheets
    const XLSX = await import('xlsx')
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    // Raw data backup
    zip.file('backup.json', JSON.stringify(backup, null, 2))

    // One Excel file per subject inside an "excel/" folder
    const excelFolder = zip.folder('excel')!
    for (const sub of subjectList) {
      const subAtt = attList.filter(r => r.subject_id === sub.id)
      const dates = Array.from(new Set(subAtt.map(r => r.date))).sort()

      const rows = studentList.map((s, i) => {
        const row: Record<string, string | number> = {
          '#': i + 1,
          'Roll No': s.roll_no,
          'Name': s.name,
        }
        for (const d of dates) {
          const rec = subAtt.find(r => r.student_id === s.id && r.date === d)
          const label = new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })
          row[label] = rec ? (rec.status === 'present' ? 'P' : rec.status === 'leave' ? 'L' : 'A') : 'A'
        }
        const present = dates.filter(d => subAtt.find(r => r.student_id === s.id && r.date === d && r.status === 'present')).length
        row['P'] = present
        row['A'] = dates.length - present
        row['Total'] = dates.length
        row['%'] = dates.length > 0 ? `${Math.round((present / dates.length) * 100)}%` : '—'
        return row
      })

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, sub.code)
      const xlsxBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      excelFolder.file(`${sub.code} - ${sub.name}.xlsx`, xlsxBuf)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uet-attendance-backup-${new Date().toISOString().split('T')[0]}.zip`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoring(true)
    setRestoreMsg('')
    setRestoreError('')

    try {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(file)
      const jsonFile = zip.file('backup.json')
      if (!jsonFile) throw new Error('Invalid backup file — backup.json not found inside ZIP.')

      const text = await jsonFile.async('string')
      const data = JSON.parse(text)

      if (!data.students || !data.subjects || !data.attendance) {
        throw new Error('Backup file is missing required data.')
      }

      const supabase = createClient()

      // Restore students
      if (data.students.length > 0) {
        const { error } = await supabase.from('students').upsert(data.students, { onConflict: 'id' })
        if (error) throw new Error(`Students restore failed: ${error.message}`)
      }

      // Restore subjects
      if (data.subjects.length > 0) {
        const { error } = await supabase.from('subjects').upsert(data.subjects, { onConflict: 'id' })
        if (error) throw new Error(`Subjects restore failed: ${error.message}`)
      }

      // Restore attendance
      if (data.attendance.length > 0) {
        // Batch in chunks of 500
        for (let i = 0; i < data.attendance.length; i += 500) {
          const chunk = data.attendance.slice(i, i + 500)
          const { error } = await supabase.from('attendance').upsert(chunk, { onConflict: 'student_id,subject_id,date' })
          if (error) throw new Error(`Attendance restore failed: ${error.message}`)
        }
      }

      // Restore locks if present
      if (data.attendance_locks?.length > 0) {
        await supabase.from('attendance_locks').upsert(data.attendance_locks, { onConflict: 'subject_id,date' })
      }

      setRestoreMsg(`Restored: ${data.students.length} students, ${data.subjects.length} subjects, ${data.attendance.length} attendance records.`)
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Restore failed.')
    }

    setRestoring(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-purple-600" /> Backup & Restore
        </h1>
        <p className="text-gray-500 text-sm mt-1">Download a ZIP of all your data. Upload it anytime to restore.</p>
      </div>

      {/* Download */}
      <div className="bg-white rounded-2xl shadow p-6 mb-5">
        <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><Download className="w-5 h-5 text-purple-600" /> Download Backup</h2>
        <p className="text-sm text-gray-500 mb-4">Creates a <strong>.zip</strong> with all data (for restore) + an <strong>Excel sheet for every subject</strong> — no need to download subject by subject.</p>
        <button
          onClick={downloadBackup}
          disabled={downloading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          {downloading ? 'Preparing ZIP...' : 'Download Backup ZIP'}
        </button>
      </div>

      {/* Restore */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><Upload className="w-5 h-5 text-blue-600" /> Restore from Backup</h2>
        <p className="text-sm text-gray-500 mb-4">Upload a previously downloaded <strong>.zip</strong> backup file. Existing records will be updated, nothing will be deleted.</p>

        <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors ${restoring ? 'border-gray-200 bg-gray-50' : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'}`}>
          <Upload className="w-8 h-8 text-blue-400 mb-2" />
          <span className="text-sm font-semibold text-blue-600">{restoring ? 'Restoring...' : 'Click to select backup ZIP'}</span>
          <span className="text-xs text-gray-400 mt-1">Only .zip files from this system</span>
          <input
            ref={fileRef}
            type="file"
            accept=".zip"
            onChange={handleRestore}
            disabled={restoring}
            className="hidden"
          />
        </label>

        {restoreMsg && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mt-4 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{restoreMsg}</span>
          </div>
        )}
        {restoreError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mt-4 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{restoreError}</span>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Tip: Download a backup after every few classes. Store it in Google Drive or WhatsApp Saved Messages.
      </p>
    </div>
  )
}
