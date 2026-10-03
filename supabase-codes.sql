-- Attendance codes table for self-marking by students
create table public.attendance_codes (
  id uuid default gen_random_uuid() primary key,
  code varchar(6) not null unique,
  subject_id uuid references public.subjects(id) on delete cascade,
  date date not null,
  expires_at timestamptz not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  is_active boolean default true
);

alter table public.attendance_codes enable row level security;

-- Anyone can read codes (students need to validate)
create policy "Anyone can read codes" on public.attendance_codes
  for select using (true);

-- Only authenticated staff can create/update/delete codes
create policy "Auth users can manage codes" on public.attendance_codes
  for all using (auth.role() = 'authenticated');
