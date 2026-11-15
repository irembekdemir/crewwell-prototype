# CrewWell — Astronaut Health Prototype

A responsive React + TypeScript dashboard prototype exploring how crew health and environmental measurements can be collected, viewed over time, and surfaced as non-diagnostic notifications.

## Features

- Health summary cards for heart rate, blood pressure, glucose, temperature, sleep, radiation, noise, and bone-density records.
- Manual measurement entry, including separate systolic and diastolic blood-pressure values.
- Measurement history and a trend chart for one measurement type at a time.
- Browser-local persistence using `localStorage`.
- Demo seed measurements clearly labeled **Simulation**.
- Optional English browser speech commands where supported: ask for heart rate/status or save a simple measurement (for example, “Save heart rate 72”).
- Responsive dark dashboard layout.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

## Notes and limitations

This is a hackathon/demo prototype, not a medical device. Seed data and threshold notifications are illustrative only and must not be used for diagnosis or treatment. No real medical device or NASA dataset is connected in this version. Records are stored only in the current browser profile and are not encrypted or synced. Browser speech-recognition availability varies by browser and may require microphone permission and a secure context.
