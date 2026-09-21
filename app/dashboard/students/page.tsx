'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Student } from '@/lib/types'
import { Plus, Trash2, Upload, Save, X, Users } from 'lucide-react'

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [saving, setSaving] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [showBulk, setShowBulk] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('students').select('*').order('roll_no')
    setStudents(data ?? [])
    setLoading(false)
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('students').insert({ name: name.trim(), roll_no: rollNo.trim(), gender })
    setName(''); setRollNo(''); setGender('male'); setShowForm(false)
    await load()
    setSaving(false)
  }

  async function deleteStudent(id: string) {
    if (!confirm('Delete this student? All their attendance will also be removed.')) return
    const supabase = createClient()
    await supabase.from('attendance').delete().eq('student_id', id)
    await supabase.from('students').delete().eq('id', id)
    await load()
  }

  async function bulkImport() {
    const lines = bulkText.trim().split('\n').filter(Boolean)
    const rows: { name: string; roll_no: string; gender: 'male' | 'female' }[] = []
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim())
      if (parts.length >= 2) {
        rows.push({
          roll_no: parts[0],
          name: parts[1],
          gender: parts[2]?.toLowerCase() === 'female' ? 'female' : 'male',
        })
      }
    }
    if (rows.length === 0) return alert('No valid rows found. Format: RollNo, Name, Gender')
    setSaving(true)
    const supabase = createClient()
    await supabase.from('students').insert(rows)
    setBulkText(''); setShowBulk(false)
    await load()
    setSaving(false)
  }

  const males = students.filter(s => s.gender === 'male')
  const females = students.filter(s => s.gender === 'female')

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm">{students.length} students enrolled</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(!showBulk)} className="flex items-center gap-2 border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Upload className="w-4 h-4" /> Bulk Import
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addStudent} className="bg-white rounded-2xl shadow p-5 mb-5 border-2 border-green-200">
          <h3 className="font-semibold text-gray-700 mb-4">Add New Student</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input required value={rollNo} onChange={e => setRollNo(e.target.value)} placeholder="Roll Number" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
            <select value={gender} onChange={e => setGender(e.target.value as 'male' | 'female')} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 bg-white">
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
              <Save className="w-4 h-4" /> Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="flex items-center gap-2 border border-gray-300 hover:bg-gray-100 px-5 py-2 rounded-xl text-sm font-medium">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </form>
      )}

      {/* Bulk import */}
      {showBulk && (
        <div className="bg-white rounded-2xl shadow p-5 mb-5 border-2 border-blue-200">
          <h3 className="font-semibold text-gray-700 mb-2">Bulk Import</h3>
          <p className="text-xs text-gray-500 mb-3">One student per line. Format: <code className="bg-gray-100 px-1 rounded">RollNo, Name, Gender</code> (Gender optional, default Male)</p>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={6}
            placeholder={'2023-CS-001, Muhammad Ali, Male\n2023-CS-002, Fatima Khan, Female\n2023-CS-003, Ahmed Raza'}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 font-mono"
          />
          <div className="flex gap-2 mt-3">
            <button onClick={bulkImport} disabled={saving} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
              <Upload className="w-4 h-4" /> Import
            </button>
            <button onClick={() => setShowBulk(false)} className="flex items-center gap-2 border border-gray-300 hover:bg-gray-100 px-5 py-2 rounded-xl text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[['Total', students.length, 'bg-gray-100 text-gray-700'], ['Male', males.length, 'bg-blue-100 text-blue-700'], ['Female', females.length, 'bg-pink-100 text-pink-700']].map(([label, count, cls]) => (
          <div key={label as string} className={`rounded-2xl p-4 text-center ${cls}`}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No students yet. Add your first student above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Roll No</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Gender</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-800">{s.roll_no}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                        {s.gender === 'female' ? 'Female' : 'Male'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => deleteStudent(s.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
