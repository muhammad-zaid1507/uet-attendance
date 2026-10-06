# UET Attendance — demo / tutorial video plan

**What it is:** A code-based attendance system for UET Lahore CYS Section C (2025 Fall). The CR generates a 6-digit code, students mark themselves present from their phones, the CR watches the list fill live, and students can check their own % any time.
**For:** CRs/GRs who take attendance, and students who need to know where they stand.
**Sets it apart:** No roll call. A code that expires (5/10/15/30 min or custom), roll-number lookup by last digits ("121"), double-mark protection, live check-in panel.
**Hook:** six digit tiles drop in → "One code. Whole class present."
**Share caption:** see share-copy.txt

## Angle
A short, guided tutorial ("4 steps") in the app's own green/emerald identity, **presented by Zaid from ARWA TRAVELS**: presenter lockup on the intro, a quiet "Presented by Zaid · ARWA TRAVELS" watermark throughout, and a full brand outro (the app's own "✦ Crafted by ARWA TRAVELS ✦" mark).

## Tone
`polished` leaning `app-store`: calm, clean, numbered steps, soft dips between scenes, real UI doing its job.

## Visual identity (from the code)
- Background: `from-green-50 to-emerald-100` gradient (home + mark pages)
- Primary: green-600 `#16a34a` buttons, green-700 text; staff side blue-700 `#1d4ed8` header
- Cards: white, rounded-2xl, shadow; App font: Arial (globals.css). Brand cards: Plus Jakarta Sans.
- Brand cards: deep emerald `#022c22 → #064e3b`
- Icons: lucide (same set as the app)
- UET Lahore logo (same URL the home page loads)

## Storyboard (33s, 1920×1080, 30fps)
| # | Time | Scene |
|---|---|---|
| 1 | 0.0–3.4 | **Hook.** Dark emerald. Six code tiles 4·8·2·9·1·7 drop in one by one. "One code. Whole class present." |
| 2 | 3.4–6.4 | **Intro.** UET logo, "UET Attendance", "CYS Section C · 2025 Fall", presenter badge "Presented by Zaid · ARWA TRAVELS". |
| 3 | 6.4–12.4 | **Step 01 — CR generates a code.** Browser: dashboard → Codes. Cursor picks 15 min, clicks Generate Code; 482917 appears with a live countdown. |
| 4 | 12.4–19.4 | **Step 02 — Students mark themselves.** Phone on /mark: types 121, types 482917, Verify → confirm card → "Marked Present!" |
| 5 | 19.4–24.6 | **Step 03 — Watch it fill live.** Live panel: check-ins pop in, "N present" climbs. |
| 6 | 24.6–28.6 | **Step 04 — Students check their %.** Phone on /student: subject cards with % badges and present/absent dots. |
| 7 | 28.6–33.0 | **Outro.** "UET Attendance" · uet-attendance.vercel.app · "Presented by Zaid" · ✦ ARWA TRAVELS ✦ |

Student names and subject names in the demo are illustrative (the real ones live in Supabase).

## Sound
One piece in A major, ~100 BPM: warm pad + soft pluck arpeggio + light kick/hat from step 1. Effects tuned to the key: soft clicks for taps, quiet key ticks while typing, pentatonic pops for each live check-in, a major-triad chime on "Marked Present!", filtered air swells on scene changes. Shared reverb; effects sit under the music.
