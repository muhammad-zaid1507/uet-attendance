'use client'
import Link from 'next/link'
import { GraduationCap, BookOpen, ShieldCheck } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="bg-green-600 rounded-full p-4 shadow-lg">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">UET Lahore</h1>
          <p className="text-green-700 font-semibold mt-1">Cybersecurity – Section C</p>
          <p className="text-gray-500 text-sm mt-1">2025 Fall Morning</p>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {/* Student view */}
          <Link href="/student" className="block group">
            <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-green-400 flex items-center gap-4">
              <div className="bg-green-100 rounded-xl p-3 group-hover:bg-green-200 transition-colors">
                <BookOpen className="w-7 h-7 text-green-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">View My Attendance</h2>
                <p className="text-gray-500 text-sm">Enter your roll number to check attendance</p>
              </div>
            </div>
          </Link>

          {/* CR / GR / Teacher login */}
          <Link href="/login" className="block group">
            <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-400 flex items-center gap-4">
              <div className="bg-blue-100 rounded-xl p-3 group-hover:bg-blue-200 transition-colors">
                <ShieldCheck className="w-7 h-7 text-blue-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">CR / GR / Teacher</h2>
                <p className="text-gray-500 text-sm">Login to manage attendance & records</p>
              </div>
            </div>
          </Link>
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">
          Department of Computer Science · UET Lahore
        </p>
        <a
          href="https://arwatravel.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center mt-4 text-xs text-gray-300 hover:text-gray-400 transition-colors tracking-widest uppercase"
        >
          ✦ Crafted by ARWA Travel ✦
        </a>
      </div>
    </main>
  )
}
