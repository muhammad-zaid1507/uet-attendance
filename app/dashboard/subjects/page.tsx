'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Subject } from '@/lib/types'
import { Plus, Trash2, Save, X, BookOpen } from 'lucide-react'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('subjects').select('*').order('name')
    setSubjects(data ?? [])
    setLoading(false)
  }

  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase.from('subjects').insert({ name: name.trim(), code: code.trim().toUpperCase() })
    setName(''); setCode(''); setShowForm(false)
    await load()
    setSaving(false)
  }

  async function deleteSubject(id: string) {
    if (!confirm('Delete this subject? All its attendance records will be removed.')) return
    const supabase = createClient()
    await supabase.from('attendance').delete().eq('subject_id', id)
    await supabase.from('subjects').delete().eq('id', id)
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-500 text-sm">{subjects.length} subjects</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {showForm && (
        <form onSubmit={addSubject} className="bg-white rounded-2xl shadow p-5 mb-5 border-2 border-blue-200">
          <h3 className="font-semibold text-gray-700 mb-4">Add New Subject</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required value={code} onChange={e => setCode(e.target.value)} placeholder="Subject Code (e.g. CS-301)" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Subject Name (e.g. Data Structures)" className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
              <Save className="w-4 h-4" /> Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="flex items-center gap-2 border border-gray-300 hover:bg-gray-100 px-5 py-2 rounded-xl text-sm font-medium">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : subjects.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No subjects yet. Add your subjects above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Subject Name</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, i) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700">{s.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => deleteSubject(s.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
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
