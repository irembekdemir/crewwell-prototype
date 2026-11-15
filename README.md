# CrewWell — Astronaut Health Monitoring Prototype

CrewWell is a React and TypeScript web prototype exploring how mission teams could review crew health and environmental records over time. It combines simulated demo measurements, a mission-context checklist, trend charts, optional voice check-ins, a mission wellness planner, non-diagnostic movement and hydration support, and a local CSV viewer for NASA Open Science Data Repository (OSDR) research data.

> **Demo only:** CrewWell is not a medical device, is not connected to mission telemetry or real sensors, and must not be used to diagnose or treat anyone. Do not enter real, identifying, or sensitive health information.

## NASA OSDR research data

The project demonstrates a local CSV exploration workflow for NASA OSDR study **OSD-575 — SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays**. The app does not fetch this dataset automatically. Download the file from NASA OSDR and import it in the research-data panel.

- [Download the Comprehensive Metabolic Panel CSV](https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv)
- [OSD-575 study record](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575)
- [OSD-575 study files](https://osdr.nasa.gov/osdr/data/osd/files/575)
- [NASA announcement of Inspiration4 datasets](https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/)

Imported CSV files are parsed in the browser and are not uploaded to a server. Import limits are 5 MB, 5,000 data rows, and 100 columns. Research data is separate from simulated crew records. It represents historical research data, not live telemetry or a measurement from the fictional demo crew. Check the OSDR record for exact fields, units, sample context, citation, and reuse terms before interpreting or redistributing data.

## Features

- Measurement summary cards and per-metric trend charts
- Manual recording, including separate systolic and diastolic blood-pressure values
- Optional English voice check-in that records a self-reported note and measurement only after on-screen confirmation
- Simulated live sensor feed for heart rate, blood pressure, skin temperature, activity, inactivity, cabin conditions, noise, and radiation dose
- Rule-based movement guidance that suggests short mobility or recovery breaks when inactivity is high or monitoring trends worsen
- Mission wellness planner with daily routine check-ins, generic movement prompts, meal check-ins, and a water-serving counter
- User-configured medication reminder labels and times; no medication or dosing recommendations
- Optional browser notifications and in-app reminders while the dashboard is open
- Selectable demo mission environment and manually completed daily checklist
- Plain-language context for measurements, data-source labels, illustrative non-diagnostic check-in notices, and generic movement prompts
- Browser-local measurement and wellness-planner storage with controls to clear measurement records
- NASA OSDR CSV import and visualization in page memory

## Privacy and AI disclosures

AI tools assisted with coding and drafting parts of the project. The team reviewed and modified the output. The OSDR source dataset is not AI-generated. No AI-generated images, audio, or video are included in this repository. No NASA logos or branding are used in AI-generated material.

Measurement records, check-in notes, sensor values, and planner settings are stored in browser `localStorage` and are **not encrypted**, synced, or protected by user accounts. Clearing measurement records does not clear planner settings. Do not enter real or sensitive health information or identifying medication details. Voice recognition depends on browser support and may be processed by the browser or its provider; the app does not save audio or unconfirmed transcripts. Desktop reminders are best-effort and work only while the dashboard is open; they are not guaranteed alarms. Demo sensor values are not real medical telemetry and are used only to simulate a future device-ingestion workflow.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Verify a production build with:

```bash
npm run build
npm run preview
```

## Scope and limitations

This prototype does not connect to real sensors, mission telemetry, or clinical systems. Its environment selector changes demo context only. Thresholds and wellness prompts are illustrative, not clinically validated or individualized. Medication reminders use a user-entered label and time only; follow the schedule provided by the user’s care team. The planner does not prescribe medication, dosage, diet, hydration targets, or exercise. Browser reminders may not run if the browser or dashboard is closed. Real health-data use would require appropriate privacy, security, access-control, legal, clinical, and operational review.

Before submitting, run the production build and test measurement entry, voice confirmation, wellness planner, medication reminder, local record clearing, NASA CSV import, and the demo sensor guidance flow. Check the current event submission requirements and verify dataset citation and reuse terms.

