# CrewWell — Astronaut Health Monitoring Prototype

CrewWell is a prototype prepared for the **NASA Space Apps Challenge**, focused on the challenge of **monitoring astronauts’ health during space missions**. It brings health and environmental records into a dashboard, visualizes trends, and presents non-diagnostic check-in notifications.

AI tools assisted with coding and drafting parts of this project. The team reviewed and adapted the generated code. AI use is disclosed here and in the project source documentation. No NASA logos or branding are used in AI-generated material.

## NASA data and resources

The prototype includes a local CSV import and visualization workflow for NASA OSDR research data. The linked example is **OSD-575: SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex)**.

- [Official OSDR study record (OSD-575)](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575)
- [OSD-575 study files](https://osdr.nasa.gov/osdr/data/osd/files/575)
- [NASA announcement of Inspiration4 datasets](https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/)
- [OSDR dataset API record](https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-575/)

To explore it, download a tabular CSV from the official OSDR study files page and import it in the **Inspiration4 research data** panel. Choose a numeric field and, when available, a timepoint/label field. The file is read locally in the browser and is not uploaded. The prototype displays the selected values and a small row preview; it does not claim that historic research samples are live astronaut telemetry or individual health advice. Check the OSDR record for the exact data dictionary, units, sample/timepoint context, citation, and reuse terms before interpreting or redistributing the dataset.

OSD-575 research data is kept separate from simulated demo-crew records. The project does not claim a live NASA device/API connection.

## Features

- Health summary cards for heart rate, blood pressure, glucose, temperature, sleep, radiation, noise, and bone-density records.
- Manual measurement entry, including separate systolic and diastolic blood-pressure values.
- Measurement history, per-metric trend chart, and browser-local `localStorage` persistence.
- Clearly labeled simulated demo data and illustrative, non-diagnostic notifications.
- Local CSV import for exploring tabular OSDR data.
- Optional English browser speech commands where supported.
- Responsive dashboard layout.

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

## AI use disclosure

AI tools were used to assist with coding and drafting project text. The team reviewed and modified the output. The OSDR source dataset is not AI-generated; imported data is displayed from the selected local file. No AI-generated imagery, audio, or video is included in this repository.

## Limitations

This is a hackathon/demo prototype, not a medical device. Seed data and threshold notifications are illustrative only and must not be used for diagnosis or treatment. No real medical device is connected. Crew records remain in the current browser profile and are not encrypted or synced. Browser speech-recognition availability varies by browser and may require microphone permission and a secure context. The CSV import is a generic exploratory viewer, not a validated clinical data pipeline.
