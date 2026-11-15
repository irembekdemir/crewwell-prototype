# CrewWell — 30-Second Pitch

CrewWell is a mission health dashboard that turns crew data into clear, non-diagnostic alerts. It helps astronauts and mission teams visualize heart rate, blood pressure, sleep, radiation, temperature, and other health signals over time, while warning them when a metric drifts outside an illustrative threshold. The app supports local CSV import from NASA OSDR research datasets, making it easy to compare mission data against public research records without claiming live medical diagnosis. Built as a safe demo prototype, CrewWell prioritizes traceability, clear data-source labeling, and privacy-conscious defaults.

# One-Minute Project Summary

CrewWell is a responsive React + TypeScript dashboard created for the NASA Space Apps Challenge. It brings together health and environmental measurements in a single mission-view interface, tracks trends over time, and surfaces non-diagnostic alerts that help mission teams spot anomalies early. The app includes manual measurement entry, a local CSV import workflow for NASA OSDR datasets, and browser-based speech controls for quick status checks. A key focus of this prototype is responsible data handling: imported NASA research data is kept separate from simulated demo records, local measurement storage is visible and controllable, and the project includes explicit documentation about limitations, privacy, and AI disclosure.

# Submission Checklist for NASA Space Apps

## Required narrative items
- Clear problem statement: monitoring crew health and environmental indicators during a mission
- Clear impact: makes trends visible and supports faster check-ins without diagnosing illness
- Explicit use of NASA data or open resources: OSD-575 from NASA OSDR
- Transparent source citation for datasets and external resources
- Clear distinction between demo data and public research data
- Statement that this is a prototype, not a medical device

## AI disclosure
- AI tools were used to assist with code generation and drafting project text
- The team reviewed and modified all generated output
- No NASA branding or AI-generated NASA imagery is included in the project
- AI-generated materials, if any, would require clear disclosure and watermarking

## Data handling notes
- Demo data is clearly labeled as simulated
- OSDR CSV data is imported locally in the browser and never uploaded to a server
- Local records can be cleared by the user
- No real or identifying health information should be entered into the app

## NASA dataset reference
- Study: OSD-575 – SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays
- Official OSDR record: https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
- Files page: https://osdr.nasa.gov/osdr/data/osd/files/575
- NASA announcement: https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/

# Demo Script

"CrewWell is a mission health dashboard designed to visualize astronaut health trends in a simple, actionable view. It combines health metrics like heart rate, blood pressure, temperature, sleep, and radiation with a local NASA OSDR data import workflow, making it easy to compare crew data against public research records. The app shows non-diagnostic alerts, supports manual data entry, and includes privacy-focused safeguards so that demo data stays clearly separated from public research data. Built as a prototype, it helps teams reason about crew health patterns without claiming to diagnose or replace clinical care."

# Short Team Pitch

"We built CrewWell to make mission health tracking easier to understand at a glance. By combining trend charts, alert summaries, and NASA research data import, we help mission teams monitor crew wellbeing without turning the dashboard into a diagnosis tool. We designed it for responsible demo use: simulated data, clear citations, local CSV handling, and user-controlled cleanup of stored records."
