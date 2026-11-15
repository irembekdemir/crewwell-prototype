# CrewWell — Astronaut Health Monitoring Prototype

CrewWell is a prototype prepared for the **NASA Space Apps Challenge**, focused on monitoring astronauts’ health during space missions. It brings health and environmental records into a dashboard, visualizes trends, and presents non-diagnostic check-in notifications.

AI tools assisted with coding and drafting parts of this project. The team reviewed and adapted the generated code. AI use is disclosed here and in the project source documentation. No NASA logos or branding are used in AI-generated material.

## NASA data and resources

The prototype provides a local CSV import and visualization workflow for NASA OSDR research data. The linked example is **OSD-575: SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex)**.

- [Official OSDR study record (OSD-575)](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575)
- [OSD-575 study files](https://osdr.nasa.gov/osdr/data/osd/files/575)
- [NASA announcement of Inspiration4 datasets](https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/)
- [OSDR dataset API record](https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-575/)

Download a tabular CSV from the official OSDR study files page and import it in the **Inspiration4 research data** panel. Choose a numeric field and, when available, a timepoint/label field. The CSV is parsed in the browser and is not uploaded. Import limits are 5 MB, 5,000 rows, and 100 columns. Consult the OSDR record for the exact data dictionary, units, sample/timepoint context, citation, and reuse terms before interpreting or redistributing data.

OSD-575 research data is kept separate from simulated demo-crew records. It represents historical research data, not live telemetry or a measurement from the demo crew profile. The project does not claim a live NASA device/API connection.

## Features

- Health summary cards for heart rate, blood pressure, glucose, temperature, sleep, radiation, noise, and bone-density records.
- Manual measurement entry, including separate systolic and diastolic blood-pressure values.
- Measurement history, per-metric trend chart, and browser-local `localStorage` persistence.
- Clearly labeled simulated demo data and illustrative, non-diagnostic notifications.
- Local CSV import with file size, row, and column limits.
- Optional English browser speech commands where supported, with a microphone privacy notice.
- A control to clear locally stored measurement records.
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

## Privacy and security limitations

This prototype is for demonstration with simulated or public research data only. Do not enter real, identifying, or sensitive health information. Measurement records are stored in the current browser profile using `localStorage`; they are not encrypted, synced, or protected by user accounts. Clearing records removes the app's local measurement list from this browser, but does not securely erase device backups or browser-level copies. Imported CSV content is held in page memory only and cleared on refresh or with the import reset button.

Voice recognition starts only after the user activates it. Depending on the browser and provider, speech recognition may be processed outside the device. Do not speak personal or identifying health information. Use HTTPS when hosting; microphone access requires a secure context in most browsers.

This is not a medical device. Demo thresholds are illustrative and must not be used for diagnosis or treatment. The CSV viewer is a generic exploratory tool, not a validated clinical data pipeline. Real health-data use would require appropriate privacy, security, access-control, legal, and clinical review.

## AI use disclosure

AI tools assisted with coding and drafting project text. The team reviewed and modified the output. The OSDR source dataset is not AI-generated; imported data is read from the selected local file. No AI-generated imagery, audio, or video is included in this repository.
