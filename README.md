# CrewWell — Astronaut Health Monitoring Prototype

CrewWell is a React and TypeScript web prototype exploring how mission teams could review crew health and environmental measurements over time. It combines simulated demo records, a mission-context checklist, trend charts, non-diagnostic notices, and a local CSV viewer for NASA Open Science Data Repository (OSDR) research data.

> **Demo only:** CrewWell is not a medical device, is not connected to mission telemetry, and must not be used to diagnose or treat anyone. Do not enter real, identifying, or sensitive health information.

## NASA OSDR research data

The project demonstrates a local CSV exploration workflow for NASA OSDR study **OSD-575 — SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays**. The app does not fetch this dataset automatically. Download the file from NASA OSDR and import it in the research-data panel.

- [Download the Comprehensive Metabolic Panel CSV](https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv)
- [OSD-575 study record](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575)
- [OSD-575 study files](https://osdr.nasa.gov/osdr/data/osd/files/575)
- [NASA announcement of Inspiration4 datasets](https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/)

Imported CSV files are parsed in the browser and are not uploaded to a server. Import limits are 5 MB, 5,000 data rows, and 100 columns. Research data is separate from simulated crew records. It represents historical research data, not live telemetry or a measurement from the fictional demo crew. Check the OSDR record for the exact fields, units, sample context, citation, and reuse terms before interpreting or redistributing data.

## Features

- Measurement summary cards and per-metric trend charts
- Manual recording, including separate systolic and diastolic blood-pressure values
- Selectable demo mission environment: spacecraft, space station, rover, or surface base
- Manually completed daily-routine checklist; it is not a timed reminder or mission procedure
- Plain-language context for each measurement
- Clear data-source labels and illustrative, non-diagnostic check-in notices
- Optional browser speech commands, started only by the user
- Browser-local measurement storage with a control to clear the app's local records
- NASA OSDR CSV import and visualization in page memory

## Privacy and AI disclosures

AI tools assisted with coding and drafting parts of the project. The team reviewed and modified the output. The OSDR source dataset is not AI-generated. No AI-generated images, audio, or video are included in this repository. No NASA logos or branding are used in AI-generated material.

Measurement records are stored in browser `localStorage` and are **not encrypted**, synced, or protected by user accounts. Clearing records removes the app's local measurement list but is not secure erasure of device backups or browser-level copies. Voice-recognition behavior depends on the browser and may involve its provider; avoid speaking sensitive information. Use HTTPS when hosting, but HTTPS alone does not make this prototype suitable for real health data.

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

## Submission and limitations

This prototype does not connect to real sensors, mission telemetry, or clinical systems. Its environment selector changes demo context only and does not apply validated environment-specific health rules. Thresholds are illustrative, not clinically validated. The NASA CSV viewer is a generic exploratory tool, not a validated clinical data pipeline. Real health-data use would require appropriate privacy, security, access-control, legal, and clinical review.

Before submitting, run the production build, test the measurement-entry and CSV-import flows, verify the data source citation, and include the currently required submission materials in English. Check the latest official Space Apps guide for the event-specific format and limits.
