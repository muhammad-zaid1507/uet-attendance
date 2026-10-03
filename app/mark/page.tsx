'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, ArrowLeft, Hash, BookOpen } from 'lucide-react'
import Link from 'next/link'

type Step = 'enter' | 'confirm' | 'done'

interface CodeInfo {
  id: string
  subject_name: string
  subject_code: string
  date: string
  expires_at: string
}

export default function MarkPage() {
  const [step, setStep] = useState<Step>('enter')
  const [studentNum, setStudentNum] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeInfo, setCodeInfo] = useState<CodeInfo | null>(null)
  const [studentName, setStudentName] = useState('')
  const [studentId, setStudentId] = useState('')

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!studentNum.trim() || !code.trim()) return
    setLoading(true)
    setError('')
    const supabase = createClient()

    // Validate code
    const { data: codeRow, error: cErr } = await supabase
      .from('attendance_codes')
      .select('id, subject_id, date, expires_at, is_active, subjects(name, code)')
      .eq('code', code.trim())
      .single()

    if (cErr || !codeRow) {
      setError('Invalid code. Check and try again.')
      setLoading(false)
      return
    }

    if (!codeRow.is_active) {
      setError('This code has been deactivated.')
      setLoading(false)
      return
    }

    if (new Date(codeRow.expires_at) < new Date()) {
      setError('This code has expired. Ask your CR for a new one.')
      setLoading(false)
      return
    }

    // Find student by number suffix
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('id, name, roll_no')
      .ilike('roll_no', `%-${studentNum.trim()}`)
      .single()

    if (sErr || !student) {
      setError(`Student number "${studentNum}" not found. Enter only your last digits (e.g. 121).`)
      setLoading(false)
      return
    }

    // Check if already marked for this subject+date
    const { data: existing } = await supabase
      .from('attendance')
      .select('id, status')
      .eq('student_id', student.id)
      .eq('subject_id', codeRow.subject_id)
      .eq('date', codeRow.date)
      .single()

    if (existing) {
      setError(`Already marked as ${existing.status} for this class.`)
      setLoading(false)
      return
    }

    const sub = Array.isArray(codeRow.subjects) ? codeRow.subjects[0] : codeRow.subjects as { name: string; code: string } | null

    setCodeInfo({
      id: codeRow.id,
      subject_name: sub?.name ?? '',
      subject_code: sub?.code ?? '',
      date: codeRow.date,
      expires_at: codeRow.expires_at,
    })
    setStudentName(student.name)
    setStudentId(student.id)
    setStep('confirm')
    setLoading(false)
  }

  async function handleConfirm() {
    if (!codeInfo || !studentId) return
    setLoading(true)
    const supabase = createClient()

    // Re-validate expiry at confirm time
    const { data: codeRow } = await supabase
      .from('attendance_codes')
      .select('is_active, expires_at, subject_id')
      .eq('id', codeInfo.id)
      .single()

    if (!codeRow || !codeRow.is_active || new Date(codeRow.expires_at) < new Date()) {
      setError('Code expired or deactivated while you were confirming. Ask your CR for a new one.')
      setStep('enter')
      setLoading(false)
      return
    }

    const { error: insErr } = await supabase.from('attendance').upsert({
      student_id: studentId,
      subject_id: codeRow.subject_id,
      date: codeInfo.date,
      status: 'present',
      marked_by: studentId,
    }, { onConflict: 'student_id,subject_id,date' })

    if (insErr) {
      setError('Something went wrong. Try again.')
      setLoading(false)
      return
    }

    setStep('done')
    setLoading(false)
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const formatExpiry = (d: string) => new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your number and class code</p>
        </div>

        {/* STEP 1: Enter */}
        {step === 'enter' && (
          <form onSubmit={handleVerify} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Student Number</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={studentNum}
                  onChange={e => setStudentNum(e.target.value)}
                  placeholder="e.g. 121"
                  required
                  className="w-full pl-9 pr-4 py-3.5 border-2 border-gray-200 rounded-xl text-lg font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-gray-50"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Last part of your roll no — e.g. <span className="font-mono">2025-CYS-<strong>121</strong></span> → enter <strong>121</strong></p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Class Code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                maxLength={6}
                required
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-2xl font-bold text-center tracking-[0.4em] text-gray-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-gray-50"
              />
              <p className="text-xs text-gray-400 mt-1 text-center">Ask your CR for the code</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || code.length !== 6 || !studentNum.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-base transition-colors disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify →'}
            </button>
          </form>
        )}

        {/* STEP 2: Confirm */}
        {step === 'confirm' && codeInfo && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-gray-500 text-sm">Marking present for</p>
            </div>

            <div className="bg-green-50 rounded-xl p-4 mb-4 text-center">
              <p className="text-xs text-green-600 font-mono mb-0.5">{codeInfo.subject_code}</p>
              <p className="text-lg font-bold text-gray-900">{codeInfo.subject_name}</p>
              <p className="text-sm text-gray-500 mt-1">{formatDate(codeInfo.date)}</p>
            </div>

            <div className="bg-blue-50 rounded-xl px-4 py-3 mb-5">
              <p className="text-sm text-gray-700">Student: <span className="font-bold">{studentName}</span></p>
              <p className="text-xs text-gray-400 mt-0.5">Code expires at {formatExpiry(codeInfo.expires_at)}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            <button onClick={handleConfirm} disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-base transition-colors disabled:opacity-50 mb-3">
              {loading ? 'Marking...' : '✓ Confirm Present'}
            </button>
            <button onClick={() => { setStep('enter'); setError('') }}
              className="w-full text-gray-400 hover:text-gray-600 py-2 text-sm transition-colors">
              ← Go back
            </button>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === 'done' && codeInfo && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Marked Present!</h2>
            <p className="text-gray-500 text-sm mb-1">{studentName}</p>
            <p className="text-green-700 font-semibold mb-1">{codeInfo.subject_name}</p>
            <p className="text-gray-400 text-sm mb-6">{formatDate(codeInfo.date)}</p>
            <Link href="/"
              className="block w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors">
              Done
            </Link>
          </div>
        )}

        <p className="text-center text-gray-300 text-xs mt-6 tracking-widest">✦ ARWA TRAVELS ✦</p>
      </div>
    </div>
  )
}
