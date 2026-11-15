import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import NasaDataImport from './NasaDataImport'
import './safety.css'
import './mission.css'
import './voice-checkin.css'
import './wellness-planner.css'

type MetricType = 'heartRate' | 'bloodPressure' | 'glucose' | 'temperature' | 'sleep' | 'noise' | 'radiation' | 'boneDensity'
type SourceType = 'Simulation' | 'Manual' | 'Device' | 'Voice check-in'
type Measurement = { id: string; type: MetricType; value: number; diastolic?: number; unit: string; timestamp: string; source: SourceType; note?: string }
type PendingVoiceMeasurement = { type: MetricType; value: number; diastolic?: number; note: string }
type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechRecognitionInstance = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechResultEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void }
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance
type SpeechWindow = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
type Environment = 'Spacecraft' | 'Space station' | 'Rover' | 'Surface base'
type SensorFeed = {
  heartRate: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  skinTemp: number
  inactivityMinutes: number
  activityMinutes: number
  radiationDose: number
  cabinTemp: number
  noiseLevel: number
  humidity: number
  stepCount: number
  timestamp: string
}

type RecommendationState = { title: string; detail: string; action: string; priority: 'info' | 'warning' | 'critical' }

const STORAGE_KEY = 'crewwell-measurements-v1'
const config: Record<MetricType, { label: string; unit: string; color: string; explanation: string }> = {
  heartRate: { label: 'Heart rate', unit: 'bpm', color: '#fb7185', explanation: 'Beats per minute. Context such as activity, measurement method, and personal mission guidance matters.' },
  bloodPressure: { label: 'Blood pressure', unit: 'mmHg', color: '#38bdf8', explanation: 'Record systolic and diastolic values together. Measurement position and device can affect interpretation.' },
  glucose: { label: 'Blood glucose', unit: 'mg/dL', color: '#c084fc', explanation: 'Blood glucose depends on timing, meals, and measurement method. This prototype does not interpret it.' },
  temperature: { label: 'Body temperature', unit: '°C', color: '#fb923c', explanation: 'Record the method and time when known; readings vary with device and measurement location.' },
  sleep: { label: 'Sleep', unit: 'hours', color: '#818cf8', explanation: 'A duration entry only; it does not assess sleep quality or replace the mission sleep plan.' },
  noise: { label: 'Noise exposure', unit: 'dB', color: '#2dd4bf', explanation: 'A level without duration or measurement context is incomplete exposure information.' },
  radiation: { label: 'Radiation dose', unit: 'mSv', color: '#facc15', explanation: 'Dose values require time-period and instrument context. Follow official mission procedures.' },
  boneDensity: { label: 'Bone density', unit: 'T-score', color: '#a3e635', explanation: 'A clinical measurement whose meaning depends on method and population; no interpretation is provided here.' },
}
const types = Object.keys(config) as MetricType[]
const aliases: Record<MetricType, string[]> = {
  heartRate: ['heart rate', 'pulse'],
  bloodPressure: ['blood pressure'],
  glucose: ['blood glucose', 'blood sugar', 'glucose'],
  temperature: ['temperature'],
  sleep: ['sleep'],
  noise: ['noise'],
  radiation: ['radiation'],
  boneDensity: ['bone density'],
}
const routineTasks = ['Complete scheduled health check-in', 'Review hydration and nutrition plan', 'Log planned exercise or recovery']
const complaintOptions = ['Neck stiffness', 'Lower-back tightness', 'Eye strain', 'Calf soreness', 'General fatigue']

function isMeasurementArray(value: unknown): value is Measurement[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => item && typeof item === 'object' && typeof item.id === 'string'
    && types.includes(item.type) && typeof item.value === 'number' && Number.isFinite(item.value)
    && (item.diastolic === undefined || (typeof item.diastolic === 'number' && Number.isFinite(item.diastolic)))
    && (item.note === undefined || typeof item.note === 'string')
    && typeof item.unit === 'string' && typeof item.timestamp === 'string' && Number.isFinite(Date.parse(item.timestamp))
    && ['Simulation', 'Manual', 'Device', 'Voice check-in'].includes(item.source))
}

function demoData(): Measurement[] {
  const now = Date.now()
  const make = (type: MetricType, value: number, hoursAgo: number, extra: Partial<Measurement> = {}): Measurement => ({ id: `${type}-${hoursAgo}`, type, value, unit: config[type].unit, timestamp: new Date(now - hoursAgo * 3600000).toISOString(), source: 'Simulation', ...extra })
  return [
    make('heartRate', 68, 5), make('heartRate', 72, 4), make('heartRate', 74, 3), make('heartRate', 70, 2), make('heartRate', 76, 1),
    make('bloodPressure', 118, 5, { diastolic: 76 }), make('bloodPressure', 120, 1, { diastolic: 78 }),
    make('glucose', 96, 5), make('glucose', 101, 1), make('temperature', 36.7, 4), make('temperature', 36.8, 1),
    make('sleep', 7.4, 8), make('noise', 68, 3), make('noise', 73, 1), make('radiation', 0.08, 4), make('radiation', 0.11, 1), make('boneDensity', -0.5, 168),
  ]
}

function loadMeasurements(): Measurement[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === null) return demoData()
    const parsed: unknown = JSON.parse(saved)
    return isMeasurementArray(parsed) ? parsed : demoData()
  } catch { return demoData() }
}

function parseVoiceMeasurement(transcript: string): Omit<PendingVoiceMeasurement, 'note'> | null {
  const normalized = transcript.toLowerCase()
  const type = types.find((candidate) => aliases[candidate].some((alias) => normalized.includes(alias)))
  if (!type) return null
  const matches = [...normalized.matchAll(/-?\d+(?:[.,]\d+)?/g)].map((match) => Number(match[0].replace(',', '.')))
  if (type === 'bloodPressure') {
    if (matches.length < 2 || !matches.slice(0, 2).every((number) => Number.isFinite(number) && number > 0)) return null
    return { type, value: matches[0], diastolic: matches[1] }
  }
  if (!matches.length || !Number.isFinite(matches[0]) || matches[0] <= 0) return null
  return { type, value: matches[0] }
}

function formatMeasurement(entry: PendingVoiceMeasurement): string {
  const value = entry.type === 'bloodPressure' ? `${entry.value}/${entry.diastolic}` : entry.value
  return `${config[entry.type].label}: ${value} ${config[entry.type].unit}`
}

function buildSensorFeed(previous: SensorFeed): SensorFeed {
  const nextInactivity = Math.min(220, Math.max(0, previous.inactivityMinutes + (Math.random() > 0.5 ? 8 : -3)))
  const nextActivity = Math.min(120, Math.max(0, previous.activityMinutes + (Math.random() > 0.5 ? 3 : -2)))
  const heartRate = Math.min(110, Math.max(52, previous.heartRate + (Math.random() - 0.5) * 7 + (nextInactivity > 120 ? 2 : -1)))
  const systolic = Math.min(150, Math.max(90, previous.bloodPressureSystolic + (Math.random() - 0.5) * 12))
  const diastolic = Math.min(100, Math.max(60, previous.bloodPressureDiastolic + (Math.random() - 0.5) * 8))
  const radiationDose = Math.max(0, Number((previous.radiationDose + (Math.random() - 0.35) * 0.03).toFixed(3)))
  const cabinTemp = Math.min(28, Math.max(18, Number((previous.cabinTemp + (Math.random() - 0.5) * 1.8).toFixed(1))))
  const noiseLevel = Math.min(82, Math.max(35, Number((previous.noiseLevel + (Math.random() - 0.5) * 10).toFixed(0))))
  const humidity = Math.min(70, Math.max(30, Number((previous.humidity + (Math.random() - 0.5) * 8).toFixed(0))))
  const stepCount = Math.max(0, Math.round(previous.stepCount + (Math.random() * 140 - 30)))
  const skinTemp = Math.min(38.5, Math.max(35.5, Number((previous.skinTemp + (Math.random() - 0.5) * 0.5).toFixed(1))))

  return {
    heartRate: Number(heartRate.toFixed(0)),
    bloodPressureSystolic: Number(systolic.toFixed(0)),
    bloodPressureDiastolic: Number(diastolic.toFixed(0)),
    skinTemp,
    inactivityMinutes: Number(nextInactivity.toFixed(0)),
    activityMinutes: Number(nextActivity.toFixed(0)),
    radiationDose,
    cabinTemp,
    noiseLevel: Number(noiseLevel.toFixed(0)),
    humidity: Number(humidity.toFixed(0)),
    stepCount,
    timestamp: new Date().toISOString(),
  }
}

const initialSensorFeed: SensorFeed = {
  heartRate: 68,
  bloodPressureSystolic: 122,
  bloodPressureDiastolic: 78,
  skinTemp: 36.7,
  inactivityMinutes: 90,
  activityMinutes: 24,
  radiationDose: 0.12,
  cabinTemp: 22.1,
  noiseLevel: 52,
  humidity: 46,
  stepCount: 2100,
  timestamp: new Date().toISOString(),
}

export default function App() {
  const [measurements, setMeasurements] = useState<Measurement[]>(loadMeasurements)
  const [metric, setMetric] = useState<MetricType>('heartRate')
  const [formType, setFormType] = useState<MetricType>('heartRate')
  const [value, setValue] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [note, setNote] = useState('')
  const [source, setSource] = useState<SourceType>('Manual')
  const [message, setMessage] = useState('')
  const [voiceMessage, setVoiceMessage] = useState('Start a voice check-in to share how you feel and report a measurement. Your entry is saved only after confirmation.')
  const [listening, setListening] = useState(false)
  const [environment, setEnvironment] = useState<Environment>('Spacecraft')
  const [completedTasks, setCompletedTasks] = useState<boolean[]>(() => routineTasks.map(() => false))
  const [pendingVoice, setPendingVoice] = useState<PendingVoiceMeasurement | null>(null)
  const [complaint, setComplaint] = useState<string>(complaintOptions[0])
  const [sensorFeed, setSensorFeed] = useState<SensorFeed>(initialSensorFeed)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(measurements)) }
    catch { setMessage('Could not save measurements in this browser. Avoid entering sensitive health data.') }
  }, [measurements])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSensorFeed((previous) => buildSensorFeed(previous))
    }, 12000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => {
    recognitionRef.current?.stop()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  const latest = useMemo(() => {
    const result: Partial<Record<MetricType, Measurement>> = {}
    for (const item of measurements) if (!result[item.type] || item.timestamp > result[item.type]!.timestamp) result[item.type] = item
    return result
  }, [measurements])

  const chartData = useMemo(() => measurements.filter((item) => item.type === metric).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-12).map((item) => ({ time: new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), value: item.value })), [measurements, metric])

  const alerts = useMemo(() => {
    const items: { title: string; detail: string; level: 'notice' | 'warning' }[] = []
    if (latest.heartRate && (latest.heartRate.value < 50 || latest.heartRate.value > 100)) items.push({ title: 'Heart-rate check-in', detail: `Latest reading: ${latest.heartRate.value} bpm. Outside the illustrative demo threshold.`, level: 'warning' })
    if (latest.bloodPressure && (latest.bloodPressure.value >= 140 || (latest.bloodPressure.diastolic ?? 0) >= 90)) items.push({ title: 'Blood-pressure check-in', detail: `Latest reading: ${latest.bloodPressure.value}/${latest.bloodPressure.diastolic ?? '—'} mmHg.`, level: 'warning' })
    if (latest.sleep && latest.sleep.value < 6) items.push({ title: 'Sleep duration check-in', detail: `Latest entry: ${latest.sleep.value} hours. Compare with the personal mission plan.`, level: 'notice' })
    if (!items.length) items.push({ title: 'No demo alerts', detail: 'No illustrative threshold notification right now. This is not a health assessment.', level: 'notice' })
    return items
  }, [latest])

  const recommendation: RecommendationState = useMemo(() => {
    if (sensorFeed.bloodPressureSystolic >= 140 || sensorFeed.bloodPressureDiastolic >= 90) {
      return {
        title: 'Elevated pressure trend',
        detail: 'Recent readings suggest pressure is trending upward. Rest, hydrate and compare with the medical checklist before continuing high-intensity work.',
        action: 'Pause strenuous activity and contact the flight surgeon or mission health officer for confirmation.',
        priority: 'warning',
      }
    }
    if (sensorFeed.inactivityMinutes >= 150 || sensorFeed.activityMinutes < 18) {
      return {
        title: 'Inactivity reminder',
        detail: `The crew member has been inactive for ${sensorFeed.inactivityMinutes} minutes. A short movement break is recommended to reduce stiffness and support circulation.`,
        action: 'Take a 5–10 minute mobility break: gentle leg stretch, shoulder roll, and seated spinal mobility.',
        priority: 'warning',
      }
    }
    if (sensorFeed.heartRate >= 98 || sensorFeed.skinTemp >= 37.4) {
      return {
        title: 'Thermal or exertion load',
        detail: 'Heart rate and body temperature suggest increased exertion or environmental load.',
        action: 'Reduce workload, cool down and recheck in 10–15 minutes before continuing strenuous procedures.',
        priority: 'warning',
      }
    }
    if (sensorFeed.radiationDose > 0.16) {
      return {
        title: 'Environment check',
        detail: 'Radiation or cabin environmental values are trending upward and should be reviewed alongside the mission log.',
        action: 'Review the cabin and radiation monitor logs and follow the flight environment checklist.',
        priority: 'info',
      }
    }
    return {
      title: 'Routine stability',
      detail: 'Current readings are within the normal demonstration range. Continue with the regular schedule and keep hydration and mobility check-ins active.',
      action: 'Continue routine tasks and maintain hydration and light mobility scheduled breaks.',
      priority: 'info',
    }
  }, [sensorFeed])

  const complaintRecommendation = useMemo(() => {
    switch (complaint) {
      case 'Neck stiffness':
        return 'Slow shoulder circles and gentle chin tucks for 2 minutes. Keep the movement small and pain-free.'
      case 'Lower-back tightness':
        return 'Perform seated pelvic tilts and standing hamstring mobility, then reset posture before the next task block.'
      case 'Eye strain':
        return 'Take a visual break every 20 minutes, look 20 feet away for 20 seconds, and blink regularly.'
      case 'Calf soreness':
        return 'Use easy ankle pumps and calf raises with a slow cadence. Do not push through sharp discomfort.'
      default:
        return 'Use a short recovery cycle: light walking, hydration, and a brief postural reset.'
    }
  }, [complaint])

  function beginListening(onTranscript: (transcript: string) => void) {
    const host = window as SpeechWindow
    const Recognition = host.SpeechRecognition ?? host.webkitSpeechRecognition
    if (!Recognition) {
      setListening(false)
      setVoiceMessage('Speech recognition is not supported in this browser. Use the manual measurement form instead.')
      return
    }
    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => onTranscript(event.results[0]?.[0]?.transcript?.trim() ?? '')
    recognition.onerror = () => { setListening(false); setVoiceMessage('Speech recognition failed. Check microphone permission or use the manual form.') }
    recognition.onend = () => { setListening(false); recognitionRef.current = null }
    try { setListening(true); setVoiceMessage('Listening…'); recognition.start() }
    catch { setListening(false); recognitionRef.current = null; setVoiceMessage('Could not start speech recognition. Check microphone permission or use the manual form.') }
  }

  function promptThenListen(prompt: string, onTranscript: (transcript: string) => void) {
    setVoiceMessage(prompt)
    if (!('speechSynthesis' in window)) {
      beginListening(onTranscript)
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(prompt)
    utterance.lang = 'en-US'
    utterance.onend = () => beginListening(onTranscript)
    utterance.onerror = () => beginListening(onTranscript)
    window.speechSynthesis.speak(utterance)
  }

  function startVoiceCheckIn() {
    if (pendingVoice || listening) return
    const host = window as SpeechWindow
    if (!(host.SpeechRecognition ?? host.webkitSpeechRecognition)) {
      setVoiceMessage('Speech recognition is not supported in this browser. Use the manual measurement form instead.')
      return
    }
    promptThenListen('How are you feeling today? Give a short self-report and then state the measurement.', (feelingTranscript) => {
      const feeling = feelingTranscript.slice(0, 240)
      if (!feeling) {
        setVoiceMessage('I could not hear your response. Start the voice check-in again or use the manual form.')
        return
      }
      promptThenListen('Thanks. Now report a measurement such as heart rate 72 or blood pressure 120 over 80.', (measurementTranscript) => {
        const parsed = parseVoiceMeasurement(measurementTranscript)
        if (!parsed) {
          setVoiceMessage('I could not identify a measurement. No entry was saved. Start again and say a measurement name with a value, or use the manual form.')
          return
        }
        const pending = { ...parsed, note: feeling }
        setPendingVoice(pending)
        const readback = `${formatMeasurement(pending)}. Your self-reported check-in note is: ${feeling}. Review and confirm on screen before saving.`
        setVoiceMessage(readback)
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
          const utterance = new SpeechSynthesisUtterance(readback)
          utterance.lang = 'en-US'
          window.speechSynthesis.speak(utterance)
        }
      })
    })
  }

  function confirmVoiceMeasurement() {
    if (!pendingVoice) return
    setMeasurements((previous) => [...previous, {
      id: crypto.randomUUID(), type: pendingVoice.type, value: pendingVoice.value,
      ...(pendingVoice.diastolic !== undefined ? { diastolic: pendingVoice.diastolic } : {}),
      unit: config[pendingVoice.type].unit, timestamp: new Date().toISOString(), source: 'Voice check-in', note: pendingVoice.note,
    }])
    setVoiceMessage(`${formatMeasurement(pendingVoice)} saved as a voice-reported entry.`)
    setPendingVoice(null)
  }

  function editVoiceMeasurement() {
    if (!pendingVoice) return
    setFormType(pendingVoice.type)
    setValue(String(pendingVoice.value))
    setDiastolic(pendingVoice.diastolic === undefined ? '' : String(pendingVoice.diastolic))
    setNote(pendingVoice.note)
    setSource('Voice check-in')
    setMessage('Review and edit the recognized values and check-in note, then save them from the form.')
    setPendingVoice(null)
    document.getElementById('measurement-entry')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function cancelVoiceMeasurement() {
    setPendingVoice(null)
    setVoiceMessage('Voice entry discarded. No measurement or check-in note was saved.')
  }

  function addMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numericValue = Number(value)
    const lower = formType === 'bloodPressure' ? Number(diastolic) : undefined
    if (!Number.isFinite(numericValue) || numericValue <= 0 || (formType === 'bloodPressure' && (!Number.isFinite(lower) || (lower ?? 0) <= 0))) {
      setMessage('Enter valid measurement values. Blood pressure needs both values.')
      return
    }
    setMeasurements((previous) => [...previous, {
      id: crypto.randomUUID(), type: formType, value: numericValue,
      ...(lower !== undefined ? { diastolic: lower } : {}), unit: config[formType].unit,
      timestamp: new Date().toISOString(), source, ...(note.trim() ? { note: note.trim().slice(0, 240) } : {}),
    }])
    setValue('')
    setDiastolic('')
    setNote('')
    setMessage('Measurement saved.')
  }

  function clearLocalMeasurements() {
    if (!window.confirm('Delete all measurement records saved in this browser? This cannot be undone.')) return
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* Clear the current session even if storage is unavailable. */ }
    setMeasurements([])
    setMessage('Local measurement records cleared. They will remain empty until new records are entered.')
  }

  function toggleTask(index: number) {
    setCompletedTasks((previous) => previous.map((done, taskIndex) => taskIndex === index ? !done : done))
  }

  function handleMobilityReset() {
    setSensorFeed((previous) => ({ ...previous, inactivityMinutes: Math.max(0, previous.inactivityMinutes - 35), activityMinutes: Math.min(120, previous.activityMinutes + 12), stepCount: previous.stepCount + 250 }))
    setMessage('Mobility reminder acknowledged. Short movement activity has been recorded for the demo session.')
  }

  const cards: MetricType[] = ['heartRate', 'bloodPressure', 'glucose', 'temperature', 'sleep', 'radiation']

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">CW</div><div><p className="eyebrow">CREWWELL · MISSION HEALTH</p><h1>Crew health dashboard</h1><p className="subheading">Demo crew member · Mission day 042</p></div></div>
      <div className="top-actions"><span className="demo-badge">● DEMO DATA</span><button className="voice-button" type="button" onClick={startVoiceCheckIn} disabled={listening || Boolean(pendingVoice)}>{listening ? 'Listening…' : 'Start voice check-in'}</button></div>
    </header>

    <div className="notice-banner"><strong>Prototype notice:</strong> Sample entries are simulated. Do not enter real or identifying health information. This application does not diagnose or make medical decisions.</div>

    <section className="panel mission-panel">
      <div className="panel-heading"><div><p className="eyebrow">MISSION CONTEXT</p><h2>Environment & daily routine</h2></div><span className="context-badge">Demo context only</span></div>
      <div className="mission-controls"><label>Mission environment<select className="select-control" value={environment} onChange={(event) => setEnvironment(event.target.value as Environment)}><option>Spacecraft</option><option>Space station</option><option>Rover</option><option>Surface base</option></select></label><div className="routine-progress"><strong>{completedTasks.filter(Boolean).length}/{routineTasks.length}</strong><span>routine items checked off</span></div></div>
      <div className="routine-list">{routineTasks.map((task, index) => <label className={`routine-item ${completedTasks[index] ? 'done' : ''}`} key={task}><input type="checkbox" checked={completedTasks[index]} onChange={() => toggleTask(index)} /><span className="routine-check" aria-hidden="true">{completedTasks[index] ? '✓' : ''}</span><span>{task}</span>{index === 0 && <span className="routine-hint">Reminder</span>}</label>)}</div>
      <p className="mission-note">These are manual demo checklists, not timed reminders or mission procedures. Follow the official mission plan.</p>
    </section>

    <section className="metric-grid" aria-label="Latest health measurements">{cards.map((type) => {
      const item = latest[type]
      return <article className="metric-card" key={type}><div className="metric-icon" style={{ color: config[type].color, backgroundColor: `${config[type].color}18` }}>{type === 'heartRate' ? '♡' : type === 'bloodPressure' ? '⌁' : type === 'glucose' ? '◉' : type === 'temperature' ? '♨' : type === 'sleep' ? '☾' : '✳'}</div><div className="metric-info"><span className="metric-label">{config[type].label}</span><strong>{item ? type === 'bloodPressure' ? `${item.value}/${item.diastolic ?? '—'}` : item.value : '—'}{item && <small> {config[type].unit}</small>}</strong><span className="metric-source">{item?.source ?? 'No measurement yet'}</span><span className={`data-status ${item?.source === 'Simulation' ? 'status-simulated' : item ? 'status-recorded' : 'status-empty'}`}>{item?.source === 'Simulation' ? 'SIMULATED' : item ? 'RECORDED' : 'NO DATA'}</span></div></article>
    })}</section>

    <section className="main-grid">
      <article className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">OVER TIME</p><h2>Measurement trend</h2></div><select className="select-control" value={metric} onChange={(event) => setMetric(event.target.value as MetricType)} aria-label="Chart measurement type">{types.map((type) => <option key={type} value={type}>{config[type].label}</option>)}</select></div><div className="chart-caption">{config[metric].label} · {config[metric].unit}</div><p className="metric-explanation">{config[metric].explanation}</p><div className="chart-wrap">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={config[metric].color} stopOpacity={0.28} /><stop offset="95%" stopColor={config[metric].color} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#253247" strokeDasharray="4 4" /><XAxis dataKey="time" stroke="#718096" /><YAxis stroke="#718096" domain={['auto', 'auto']} /><Tooltip /><Area type="monotone" dataKey="value" stroke={config[metric].color} fill="url(#chartFill)" /></AreaChart></ResponsiveContainer> : <div className="empty-chart">No entries for this measurement.</div>}</div><p className="chart-legend"><span className="legend-dot" style={{ backgroundColor: config[metric].color }} />Color identifies the measurement type; it does not indicate clinical status.</p></article>
      <article className="panel alerts-panel"><div className="panel-heading"><div><p className="eyebrow">AUTOMATED SUMMARY</p><h2>Check-in notifications</h2></div><span className="count-badge">{alerts.length}</span></div><div className="alert-list">{alerts.map((alert) => <div className={`alert-item ${alert.level}`} key={alert.title}><span className="alert-symbol">{alert.level === 'warning' ? '!' : 'i'}</span><div><strong>{alert.title}</strong><p>{alert.detail}</p></div></div>)}</div><p className="small-note">Thresholds are illustrative only, not clinically validated, and are not medical advice.</p></article>
    </section>

    <section className="panel sensor-panel">
      <div className="panel-heading"><div><p className="eyebrow">LIVE SUPPORT</p><h2>Sensor feed and guidance</h2></div><button className="mini-button" type="button" onClick={handleMobilityReset}>Log 5 min mobility break</button></div>
      <div className="sensor-grid">
        <div className="sensor-stat"><span>Heart rate</span><strong>{sensorFeed.heartRate} bpm</strong></div>
        <div className="sensor-stat"><span>Blood pressure</span><strong>{sensorFeed.bloodPressureSystolic}/{sensorFeed.bloodPressureDiastolic} mmHg</strong></div>
        <div className="sensor-stat"><span>Skin temp</span><strong>{sensorFeed.skinTemp.toFixed(1)}°C</strong></div>
        <div className="sensor-stat"><span>Activity</span><strong>{sensorFeed.activityMinutes} min</strong></div>
        <div className="sensor-stat"><span>Inactivity</span><strong>{sensorFeed.inactivityMinutes} min</strong></div>
        <div className="sensor-stat"><span>Steps</span><strong>{sensorFeed.stepCount}</strong></div>
        <div className="sensor-stat"><span>Cabin temp</span><strong>{sensorFeed.cabinTemp.toFixed(1)}°C</strong></div>
        <div className="sensor-stat"><span>Noise</span><strong>{sensorFeed.noiseLevel} dB</strong></div>
        <div className="sensor-stat"><span>Radiation</span><strong>{sensorFeed.radiationDose.toFixed(3)} mSv</strong></div>
      </div>
      <div className={`sensor-recommendation priority-${recommendation.priority}`}>
        <div>
          <p className="eyebrow small-eyebrow">DOCTOR-APPROVED RULE TEMPLATE</p>
          <h3>{recommendation.title}</h3>
        </div>
        <p>{recommendation.detail}</p>
        <strong>{recommendation.action}</strong>
      </div>
      <div className="complaint-box">
        <label>Symptom or discomfort<select className="select-control" value={complaint} onChange={(event) => setComplaint(event.target.value)}>{complaintOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <p><strong>Suggested movement:</strong> {complaintRecommendation}</p>
      </div>
    </section>

    <section className="secondary-grid">
      <article className="panel" id="measurement-entry"><div className="panel-heading"><div><p className="eyebrow">RECORD ENTRY</p><h2>Add a measurement</h2></div></div><form className="measurement-form" onSubmit={addMeasurement}><label>Measurement type<select className="select-control" value={formType} onChange={(event) => setFormType(event.target.value as MetricType)}>{types.map((type) => <option key={type} value={type}>{config[type].label}</option>)}</select></label><p className="metric-explanation form-explanation">{config[formType].explanation}</p><label>{formType === 'bloodPressure' ? 'Systolic pressure' : 'Value'}<div className="input-with-unit"><input type="number" step="any" min="0" value={value} onChange={(event) => setValue(event.target.value)} required /><span>{config[formType].unit}</span></div></label>{formType === 'bloodPressure' && <label>Diastolic pressure<div className="input-with-unit"><input type="number" step="any" min="0" value={diastolic} onChange={(event) => setDiastolic(event.target.value)} required /><span>mmHg</span></div></label>}<label>Check-in note (optional)<textarea className="note-input" maxLength={240} value={note} onChange={(event) => setNote(event.target.value)} placeholder="A brief self-reported note" /></label><label>Data source<select className="select-control" value={source} onChange={(event) => setSource(event.target.value as SourceType)}><option>Manual</option><option>Device</option><option>Simulation</option><option>Voice check-in</option></select></label><button className="submit-button" type="submit">Save measurement <span>→</span></button>{message && <p className="form-message" role="status">{message}</p>}</form></article>
      <article className="panel assistant-panel"><div className="panel-heading"><div><p className="eyebrow">VOICE CHECK-IN</p><h2>Crew wellness assistant</h2></div><span className="assistant-orb">✦</span></div><p className="assistant-intro">Start a two-step check-in: describe how you feel, then report a measurement. The assistant reads back both your note and measurement and waits for your confirmation before saving.</p><div className="voice-status" aria-live="polite"><span className={listening ? 'listening-dot active' : 'listening-dot'} />{voiceMessage}</div>{pendingVoice && <div className="voice-confirm" role="group" aria-label="Confirm voice check-in"><strong>Review before saving</strong><p>{formatMeasurement(pendingVoice)}</p><p className="voice-note-preview">Self-reported note: “{pendingVoice.note}”</p><div className="voice-confirm-actions"><button type="button" className="confirm-button" onClick={confirmVoiceMeasurement}>Confirm and save</button><button type="button" className="edit-button" onClick={editVoiceMeasurement}>Edit values</button><button type="button" className="discard-button" onClick={cancelVoiceMeasurement}>Cancel</button></div></div>}<div className="voice-examples"><span>Try saying:</span><code>“I feel well and rested”</code><code>“Heart rate 72”</code><code>“Blood pressure 120 over 80”</code></div><p className="privacy-note"><strong>Microphone privacy:</strong> Recognition starts only when you activate the button. The app stores the self-reported note and measurement only after confirmation; it does not save audio or unconfirmed transcripts. Depending on your browser, speech recognition may be processed by the browser or its provider. Avoid speaking sensitive personal information.</p></article>
    </section>

    <NasaDataImport />
    <section className="panel history-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ENTRIES</p><h2>Measurement history</h2></div><div className="history-actions"><span className="history-count">{measurements.length} records</span><button className="clear-button" type="button" onClick={clearLocalMeasurements}>Clear local measurement records</button></div></div><div className="table-scroll"><table><thead><tr><th>Measurement</th><th>Value and note</th><th>Time</th><th>Source</th></tr></thead><tbody>{[...measurements].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10).map((item) => <tr key={item.id}><td>{config[item.type].label}</td><td>{item.type === 'bloodPressure' ? `${item.value}/${item.diastolic ?? '—'}` : item.value} {item.unit}{item.note && <small className="history-note">{item.note}</small>}</td><td>{new Date(item.timestamp).toLocaleString('en-US')}</td><td><span className={`source-tag ${item.source.toLowerCase().replaceAll(' ', '-')}`}>{item.source}</span></td></tr>)}</tbody></table>{measurements.length === 0 && <p className="empty-history">No local measurement records. Demo readings are currently cleared.</p>}</div></section>
    <footer className="footer">CrewWell prototype · Local records are not encrypted · Demo, not a medical device</footer>
  </main>
}






















































































































