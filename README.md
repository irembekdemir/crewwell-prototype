# CrewWell — Astronaut Health Monitoring Prototype

CrewWell is a responsive React + TypeScript dashboard prototype designed to explore how astronaut health and environmental measurements can be collected, visualized over time, and surfaced as non-diagnostic mission alerts. The project brings health metrics, trend analysis, and NASA open-data exploration into a single interface for a fictional mission crew.

The prototype is intended for educational and hackathon/demo use. It does not diagnose illness or provide clinical recommendations. It is designed to demonstrate how a mission health dashboard could present overview data, detect illustrative outliers, and keep demo records clearly separated from research datasets.

## Why this project matters

Long-duration missions require clear visibility into crew health. This project explores a simple mission-view concept that helps teams:

- track daily or recurring health measurements,
- compare trends over time,
- highlight unusual values as illustrative alerts,
- distinguish simulated demo data from public research data,
- keep the user interface understandable and lightweight.

## Features

- Health summary cards for heart rate, blood pressure, glucose, temperature, sleep, radiation, noise, and bone-density records
- Manual measurement entry, including separate systolic and diastolic blood-pressure values
- Historical measurement logs and a per-metric trend chart
- Browser-local persistence using `localStorage`
- Simulated demo data clearly labeled as **Simulation**
- Optional English browser speech commands for quick status checks and simple entry
- Local CSV import for compatible NASA OSDR tabular data
- Responsive dark dashboard layout
- Clear local-data reset controls and privacy notices

## NASA data and open resources

This project includes a NASA open-data workflow centered on the OSDR study record for:

- OSD-575 — SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays

Official references:

- OSDR study page: https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
- OSDR study files: https://osdr.nasa.gov/osdr/data/osd/files/575
- NASA announcement: https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/
- OSDR API metadata: https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-575/

The app supports importing a locally downloaded CSV from the research data page. The CSV is parsed in the browser and is not uploaded to a server. This is a lightweight exploratory workflow for public tabular data and is not a live telemetry connection to NASA systems.

## AI use disclosure

AI tools were used to assist with coding and drafting portions of this project. The output was reviewed, modified, and adapted by the project team before use. No NASA branding, NASA logos, or AI-generated NASA imagery are included in this repository. The project does not claim to be an official NASA product or clinical system.

## Privacy and safety notes

This prototype is for demo use only and should not be run with real personal health data.

- Do not enter real, identifying, or sensitive health information.
- Demo data is labeled as simulated and is stored in the browser only.
- Local measurement records are kept in `localStorage` and can be cleared from the interface.
- Imported CSV content is held in browser memory only and is cleared on refresh or by clearing the imported file.
- Voice recognition starts only after the user activates it.
- Avoid speaking personal or identifying health information through the microphone.
- This prototype is not a medical device; thresholds are illustrative and do not represent medical advice.

## How it works

1. The app loads a set of simulated measurements for a fictional mission crew.
2. Users can add new values manually or use the speech command flow.
3. The dashboard summarizes the latest values and highlights illustrative alerts.
4. Users can import a CSV from NASA OSDR to explore a public research dataset locally.
5. Data is kept separate from demo records so the prototype remains understandable and responsible.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite in the terminal.

To build for production:

```bash
npm run build
npm run preview
```

## Project limitations

This project is intentionally limited and should not be interpreted as a real clinical or operational system.

- It uses illustrative thresholds, not medical decision rules.
- It does not connect to real sensors, mission telemetry, or clinical systems.
- It does not replace a physician, clinical review, operational health workflow, or regulatory approval process.
- OSDR data must be checked for its own units, timepoints, participant context, citation, and reuse terms before interpreting or redistributing it.

## Citation and use note

When using public NASA research data, review the official dataset record and associated documentation for exact units, sample context, publication, citation, and any reuse conditions. This project is a prototype and should be treated as an educational demonstration rather than a validated medical or scientific tool.

## Repository structure

```text
src/
  App.tsx
  NasaDataImport.tsx
  nasa-data.css
  safety.css
README.md
PITCH.md
```

## Summary

CrewWell is a proof-of-concept mission health dashboard exploring how health metrics can be surfaced in a clear, usable, and non-diagnostic way. By combining demo data, local record tracking, and NASA open-data import, the project demonstrates a responsible and educational approach to crew health visualization in a space-mission context.
