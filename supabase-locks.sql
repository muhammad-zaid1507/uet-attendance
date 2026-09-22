-- Run this in Supabase SQL Editor to add the lock feature
create table public.attendance_locks (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references public.subjects(id) on delete cascade,
  date date not null,
  locked_by uuid references auth.users(id),
  locked_at timestamptz default now(),
  unique(subject_id, date)
);

alter table public.attendance_locks enable row level security;
create policy "Anyone can view locks" on public.attendance_locks for select using (true);
create policy "Auth users can manage locks" on public.attendance_locks for all using (auth.role() = 'authenticated');
