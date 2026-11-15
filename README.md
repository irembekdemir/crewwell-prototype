# CrewWell — Astronaut Health Monitoring Prototype

CrewWell is a React + TypeScript web prototype for exploring how a mission team might view astronaut health and environmental records over time. It combines simulated demo measurements, a simple mission-routine checklist, trend charts, non-diagnostic check-in notices, and a local CSV viewer for NASA OSDR research data.

> **Demo only:** CrewWell is not a medical device, is not connected to mission telemetry, and must not be used to diagnose or treat anyone. Do not enter real, identifying, or sensitive health information.

## NASA OSDR dataset

The app links to NASA OSDR study **OSD-575 — SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays**. The app can import a compatible CSV locally; it does not fetch or upload the dataset automatically. Use OSDR metadata to verify the exact fields, units, sample context, citation, and reuse terms.

- [Download Comprehensive Metabolic Panel (CMP) CSV](https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv)
- [OSD-575 study record](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575)
- [OSD-575 files page](https://osdr.nasa.gov/osdr/data/osd/files/575)
- [NASA announcement of Inspiration4 datasets](https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/)

Imported CSVs are parsed in the browser and are not uploaded to a server. Limits: 5 MB, 5,000 data rows, 100 columns. NASA research data stays separate from simulated demo-crew records; it is historical research data, not live telemetry or an individual reading from the fictional demo profile.

## What the prototype demonstrates

- Measurement summary cards and per-metric trend charts
- Manual recording, including separate systolic and diastolic blood-pressure values
- A selectable demo mission environment: spacecraft, space station, rover, or surface base
- A manually checked daily routine list (not timed reminders or mission procedures)
- Plain-language context for each measurement, with explicit notes that colors identify data types rather than medical status
- Illustrative, non-diagnostic check-in notices
- Optional browser speech commands, started only by the user
- Browser-local measurement storage and a control to clear the app's local measurement records
- NASA OSDR CSV import and visualization in page memory

## Privacy and AI disclosures

AI tools assisted with coding and drafting parts of the project. The team reviewed and modified the output. The OSDR dataset itself is not AI-generated. No AI-generated images, audio, or video are included in this repository; no NASA logos or branding are used in AI-generated material.

Local measurement records use browser `localStorage` and are **not encrypted**, synced, or protected by user accounts. Clearing records removes the app's local measurement list but is not a secure erasure of device backups or browser-level copies. Voice recognition behavior depends on the browser and may involve its provider; avoid speaking sensitive information. Use HTTPS when hosting, but note that HTTPS alone does not make this prototype suitable for real health data.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Production build:

```bash
npm run build
npm run preview
```

## Limitations

The routine checklist is a manual demo interaction, not a notification scheduler. Environment selection changes demo context only; it does not apply validated environment-specific health rules. Thresholds are illustrative, not clinically validated. The NASA CSV viewer is a generic exploratory tool, not a validated clinical data pipeline. Real health-data use would require appropriate privacy, security, access-control, legal, and clinical review.
