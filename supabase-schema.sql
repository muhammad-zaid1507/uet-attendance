-- =====================================================
-- UET Attendance System - Supabase Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Students table
create table public.students (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  roll_no text not null unique,
  gender text not null default 'male' check (gender in ('male', 'female')),
  created_at timestamptz default now()
);

-- Subjects table
create table public.subjects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text not null unique,
  created_at timestamptz default now()
);

-- Attendance table
create table public.attendance (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.students(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  date date not null,
  status text not null default 'absent' check (status in ('present', 'absent', 'late')),
  marked_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(student_id, subject_id, date)
);

-- User profiles table (for CR/GR/Teacher names and roles)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  role text not null default 'cr' check (role in ('admin', 'cr', 'gr')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'cr')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.attendance enable row level security;
alter table public.profiles enable row level security;

-- Students: anyone can read (for student roll-no lookup), only logged-in staff can write
create policy "Anyone can view students" on public.students for select using (true);
create policy "Auth users can manage students" on public.students for all using (auth.role() = 'authenticated');

-- Subjects: anyone can read
create policy "Anyone can view subjects" on public.subjects for select using (true);
create policy "Auth users can manage subjects" on public.subjects for all using (auth.role() = 'authenticated');

-- Attendance: anyone can read
create policy "Anyone can view attendance" on public.attendance for select using (true);
create policy "Auth users can manage attendance" on public.attendance for all using (auth.role() = 'authenticated');

-- Profiles: only authenticated users
create policy "Auth users can view profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Indexes for performance
create index on public.attendance(student_id);
create index on public.attendance(subject_id);
create index on public.attendance(date);
create index on public.students(roll_no);
