# WHOOP + Screen Time Score App

A browser app that combines WHOOP metrics and phone usage into one daily score out of 100.

## Quick start (I implemented this for you)
You now have a built-in local API server (`server.js`) so you can run everything end-to-end right away.

```bash
node server.js
```

Then open: `http://localhost:8787`

Use **Use local demo endpoints** in the app, then click **Sync connected data**.

## Windows PowerShell fix (for `running scripts is disabled`)
If PowerShell shows this at startup:

```
...profile.ps1 cannot be loaded because running scripts is disabled on this system
```

that error is from your PowerShell profile, not from this app. Use one of these options:

### Option A (recommended): open PowerShell without loading your profile
```powershell
powershell -NoProfile
cd "C:\path\to\TAI-REPO"
node server.js
```

### Option B: allow scripts only for this terminal session
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
cd "C:\path\to\TAI-REPO"
node server.js
```

### Option C: use Command Prompt instead of PowerShell
```cmd
cd C:\path\to\TAI-REPO
node server.js
```

If `cd` fails, locate where you saved the project first:

```powershell
Get-ChildItem -Path C:\Users\josia -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq "TAI-REPO" }
```

Then use that full path with `cd`.

## Scoring logic
Phone score is based on your waking day:
- Baseline is **45 minutes per waking hour** (`75%` of waking hours)
- Actual phone share = `totalPhoneHours / wakingHours`
- Above-baseline usage reduces phone score
- Social-heavy usage also reduces score via social penalty signal

Final weight mix:
- Recovery: 35%
- Sleep: 25%
- Strain: 20%
- Phone behavior: 20%

## Local API endpoints (included)
`server.js` now serves these endpoints:

- `GET /api/whoop/today`
- `GET /api/screentime/today`
- `POST /api/ingest/whoop`
- `POST /api/ingest/screentime`
- `GET /api/debug/latest`

## Data formats
### WHOOP payload (for ingest + sync output)
```json
{
  "recovery": 82,
  "sleepPerformance": 77,
  "dayStrain": 13.4,
  "wakeTime": "07:00",
  "bedTime": "23:30"
}
```

### Screen-time payload (for ingest + sync output)
```json
{
  "socialHours": 3.1,
  "otherHours": 2.4
}
```

## “Do the data instructions” — exact steps
This section is the concrete setup workflow you asked for.

### 1) Start your local app + API
```bash
node server.js
```

### 2) Post WHOOP data (manual test)
```bash
curl -X POST http://localhost:8787/api/ingest/whoop \
  -H 'Content-Type: application/json' \
  -d '{
    "recovery": 86,
    "sleepPerformance": 81,
    "dayStrain": 12.9,
    "wakeTime": "07:00",
    "bedTime": "23:00"
  }'
```

### 3) Post phone screen-time data (manual test)
```bash
curl -X POST http://localhost:8787/api/ingest/screentime \
  -H 'Content-Type: application/json' \
  -d '{
    "socialHours": 3.2,
    "otherHours": 2.7
  }'
```

### 4) Verify combined stored data
```bash
curl http://localhost:8787/api/debug/latest
```

### 5) In the UI
- click **Use local demo endpoints**
- click **Sync connected data**
- score is calculated from synced data automatically

## Connecting real WHOOP + phone data
Keep this app exactly as-is, and replace data posting with automations:

1. Create a tiny backend job (or script) that fetches WHOOP API data and POSTs normalized JSON to `/api/ingest/whoop`.
2. Create iOS/Android automation that sends daily screen-time totals to `/api/ingest/screentime`.
3. Keep frontend sync URLs pointed at:
   - `http://<your-host>/api/whoop/today`
   - `http://<your-host>/api/screentime/today`

## Security note
This starter server is for local/personal use. If deploying publicly, add auth and HTTPS before exposing ingest endpoints.
