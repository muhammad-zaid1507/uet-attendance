# UET Attendance System – Setup Guide

## Step 1: Create Supabase Project (Free)

1. Go to **https://supabase.com** → Sign Up (free)
2. Click **New Project**
   - Name: `uet-attendance`
   - Password: choose any strong password
   - Region: pick closest (Singapore or any)
3. Wait ~2 minutes for project to be ready

## Step 2: Set Up the Database

1. In your Supabase project, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase-schema.sql` from this folder
4. Copy all the SQL and paste it into the editor
5. Click **Run**

## Step 3: Get Your Supabase Keys

1. In Supabase, go to **Project Settings → API**
2. Copy:
   - **Project URL** → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 4: Create CR/GR/Teacher Accounts

1. In Supabase, go to **Authentication → Users**
2. Click **Add User → Create New User**
3. Enter email and password for:
   - CR (Class Representative)
   - GR (Girls Representative)  
   - Any teachers
4. That's it — they can now login at your site

## Step 5: Deploy to Vercel (Free)

1. Go to **https://github.com** → Create new repository → `uet-attendance`
2. Push your code:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/uet-attendance.git
   git push -u origin main
   ```
3. Go to **https://vercel.com** → Sign Up with GitHub
4. Click **New Project** → Import your `uet-attendance` repo
5. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click **Deploy**
7. Done! You'll get a link like `uet-attendance.vercel.app`

## How to Use

### For CR/GR/Teacher:
- Go to your Vercel URL → Click **CR/GR/Teacher** → Login
- **Students page**: Add students one by one, or use Bulk Import (paste roll no, name, gender)
- **Subjects page**: Add your subjects (e.g. CS-301, Data Structures)
- **Mark Attendance**: Select subject → Add date → Click cells to toggle Present/Absent/Late → Save
- **Reports**: View by student or subject, or see who has low attendance

### For Students:
- Go to your Vercel URL → Click **View My Attendance**
- Enter roll number → See all subjects with attendance %

## Color Code
- 🟢 Green = 75%+ (Safe)
- 🟡 Yellow = 60–74% (Warning)
- 🔴 Red = Below 60% (Danger)
