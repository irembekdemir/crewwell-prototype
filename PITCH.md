# CrewWell — Submission and Demo Guide

## 30-second pitch

CrewWell is a mission health dashboard prototype for long-duration spaceflight. It brings simulated crew measurements, trend charts, and a manual mission-routine checklist into one clear interface. An optional English voice check-in can capture a spoken measurement, read it back, and wait for confirmation before saving. CrewWell also lets users explore a public NASA OSDR research CSV locally, while keeping historical research data separate from demo records. Its purpose is to make health information easier to review—not to diagnose or replace mission medical care.

## Four-slide presentation outline

### Slide 1 — The mission challenge
**Headline:** Health data needs context, not just numbers.

- Long-duration missions need clear, repeatable health check-ins.
- Isolated readings can be difficult to review as a changing picture.
- CrewWell explores a concise, mission-context dashboard.

**Visual:** Dashboard overview with a simple mission timeline.

**Speaker note:** “CrewWell starts with a simple problem: crew health readings are more useful when people can review them in context over time.”

### Slide 2 — The prototype
**Headline:** One view for trends and routine check-ins.

- Review simulated health and environmental measurements.
- Explore per-metric trends and plain-language context.
- Select a demo environment and check off routine items.
- Use voice check-in to capture a measurement, review it, and confirm before saving.
- See source labels and illustrative, non-diagnostic notices.

**Visual:** App screenshot with metric cards, chart, voice confirmation, and routine checklist.

**Speaker note:** “The prototype brings trend visualization, routine tracking, and an optional confirmation-based voice input together. Environment selection changes demo context only; it does not apply validated medical rules.”

### Slide 3 — NASA open research data
**Headline:** Public research data, clearly separated from demo records.

- Explore NASA OSDR study OSD-575 with a local CSV import.
- Select a numeric field and optional timepoint or label field.
- Data is parsed in the browser and is not uploaded by the app.
- Historical research data is not live mission telemetry.

**Visual:** OSDR import panel and its selected-field chart.

**Source links:**
- [OSD-575 study record](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575)
- [OSD-575 files](https://osdr.nasa.gov/osdr/data/osd/files/575)
- [Direct CMP CSV download](https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv)

**Speaker note:** “We use the OSDR study as a public research-data exploration workflow—not as real-time crew monitoring or individual medical advice.”

### Slide 4 — Responsible scope and next steps
**Headline:** A transparent concept for future mission workflows.

- Demo and research data are labeled and kept separate.
- Local measurement records can be cleared by the user.
- Voice-recognized measurements require explicit confirmation before saving.
- The tool is not a medical device and does not diagnose.
- Future work could validate workflows with mission and clinical experts.

**Visual:** Simple future roadmap: validate, test with users, then evaluate integration requirements.

**Speaker note:** “CrewWell is a proof of concept. Its next step is expert and user feedback, not a claim of clinical readiness.”

## 30-second video / voice-over script

“CrewWell is a mission health dashboard prototype for long-duration spaceflight. It brings simulated crew measurements, trend charts, and a manual routine checklist into one clear interface. An optional voice check-in can capture a spoken measurement, read it back, and wait for confirmation before saving. The prototype also lets users explore a public NASA OSDR research CSV locally, keeping that historical research data separate from demo crew records. CrewWell is designed to make information easier to review—not to diagnose or replace mission medical care.”

## 60-second demo narration

“Here is CrewWell, a prototype dashboard for reviewing crew health trends during a mission. The overview cards show the latest simulated measurements, and the chart lets us explore how one selected metric changes over time. The mission context panel allows us to select a demo environment and check off routine items; these are illustrative interactions, not mission procedures or timed reminders. We can also start a voice check-in, report a measurement, and review the recognized value before confirming it. In the research-data panel, we can import a public CSV from NASA OSDR study OSD-575, select a numeric field, and inspect its values locally in the browser. The historical research data stays separate from simulated crew records and is not live telemetry. CrewWell is an educational prototype, not a medical device or diagnostic tool.”

## Final demo checklist

- Run `npm run build` and confirm it succeeds.
- Test dashboard, manual measurement form, voice check-in confirmation, edit, cancel, and local-record clearing.
- Confirm unsupported speech recognition or denied microphone access leaves manual entry available.
- Import the OSDR CMP CSV and confirm the field selector, chart, and preview render.
- Test invalid CSV and a file larger than the stated import limit.
- Review the current event's official submission guide for required fields, language, and demo format limits.
- Verify the NASA data citation and any reuse terms from the OSDR record.
- Do not use real or identifying health information in the demo.
