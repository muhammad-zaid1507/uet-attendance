import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UET Attendance – CYS Section C',
  description: 'Attendance System for UET Lahore Cybersecurity (CYS) Section C 2025 Fall Morning',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}
