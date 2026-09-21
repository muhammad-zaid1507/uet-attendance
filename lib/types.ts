export type Role = 'admin' | 'cr' | 'gr'

export interface Student {
  id: string
  name: string
  roll_no: string
  gender: 'male' | 'female'
  created_at: string
}

export interface Subject {
  id: string
  name: string
  code: string
  created_at: string
}

export interface AttendanceRecord {
  id: string
  student_id: string
  subject_id: string
  date: string
  status: 'present' | 'absent' | 'late'
  marked_by: string
  created_at: string
}

export interface AttendanceWithStudent extends AttendanceRecord {
  students: Pick<Student, 'name' | 'roll_no'>
}

export interface UserProfile {
  id: string
  email: string
  name: string
  role: Role
}
