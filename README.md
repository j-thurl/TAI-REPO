# WHOOP + Screen Time Score App

A small web app that combines WHOOP metrics and split phone usage (social vs non-social) into a daily score out of 100.

## Can this work without manual entry?
Yes. The app now supports **auto-sync** from two endpoints so you can stop typing daily values manually.

- WHOOP endpoint expected response:

```json
{
  "recovery": 82,
  "sleepPerformance": 77,
  "dayStrain": 13.4
}
```

- Phone endpoint expected response:

```json
{
  "socialHours": 3.1,
  "otherHours": 2.4
}
```

If your endpoints require auth, paste a bearer token in the app and it sends:

`Authorization: Bearer <token>`

## Inputs used for scoring
- WHOOP Recovery (%)
- WHOOP Sleep Performance (%)
- WHOOP Day Strain (0-21)
- Social media screen time (hours)
- Other screen time (hours)

## Scoring model
- Recovery: 35%
- Sleep: 25%
- Strain balance: 20% (best around strain 13)
- Screen time quality: 20%
  - social time is weighted heavier than non-social time
  - weighted hours = `social*1.7 + other*0.8`
  - screen score = `100 - weightedHours*7` (clamped 0-100)

The app also reports a **social usage signal** (`0-100`) that drops as social media makes up a larger share of your phone time.

## Direct integrations (practical approach)
- WHOOP: use WHOOP developer API through your own small endpoint that returns the normalized JSON above.
- Phone screen time: use Apple Shortcuts/iOS automation or Android export automation to push daily totals to your endpoint in the same normalized shape.

This keeps the browser app simple while allowing real "no manual entry" data flow.

## Run locally
Open `index.html` directly in your browser.
