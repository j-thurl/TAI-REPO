# WHOOP + Screen Time Score App

A browser app that combines WHOOP metrics and phone usage into one daily score out of 100.

## What changed in scoring
The phone component is now based on:
1. **When you wake**
2. **When you go to bed**
3. **What % of your waking day is spent on phone**

Baseline for phone usage is set to **45 minutes per waking hour**.

- Baseline share = `45 / 60 = 0.75` => **75% of waking hours**
- Actual share = `totalPhoneHours / wakingHours`
- If actual share is above baseline, the phone score drops.
- A social-media penalty signal is blended into the phone score so social-heavy usage still scores lower.

## Inputs used for scoring
- Wake time (`HH:MM`)
- Bed time (`HH:MM`)
- WHOOP Recovery (%)
- WHOOP Sleep Performance (%)
- WHOOP Day Strain (0-21)
- Social media screen time (hours)
- Other screen time (hours)

## Final score weights
- Recovery: 35%
- Sleep: 25%
- Strain balance: 20% (best around strain 13)
- Phone behavior score (waking-day share + social penalty): 20%

## Auto-sync (no manual entry)
The app supports syncing from two endpoints:
- WHOOP endpoint
- Phone usage endpoint

### WHOOP endpoint expected JSON
```json
{
  "recovery": 82,
  "sleepPerformance": 77,
  "dayStrain": 13.4,
  "wakeTime": "07:00",
  "bedTime": "23:30"
}
```

### Phone endpoint expected JSON
```json
{
  "socialHours": 3.1,
  "otherHours": 2.4
}
```

If auth is needed, add your token in the UI. The app sends:

`Authorization: Bearer <token>`

## How to connect your real data (step-by-step)
1. **Create a tiny personal API endpoint** (Cloudflare Worker, Vercel Function, Railway, etc.).
2. **WHOOP data**: call WHOOP developer API in your backend and map fields to:
   - `recovery`, `sleepPerformance`, `dayStrain`, `wakeTime`, `bedTime`.
3. **Phone data**:
   - iOS: use Shortcuts automation to read Screen Time and POST daily values to your backend.
   - Android: use Digital Wellbeing export + automation app (Tasker/HTTP action) to POST daily values.
4. Have your backend expose two read endpoints:
   - `/whoop/today`
   - `/screentime/today`
5. Paste those two URLs in this app, optionally paste token, click **Save source settings**.
6. Click **Sync connected data** to fill values and calculate automatically.

## Run locally
Open `index.html` directly in your browser.
