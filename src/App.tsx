import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import NasaDataImport from './NasaDataImport'
import './safety.css'

type MetricType = 'heartRate' | 'bloodPressure' | 'glucose' | 'temperature' | 'sleep' | 'noise' | 'radiation' | 'boneDensity'
type SourceType = 'Simulation' | 'Manual' | 'Device'
type Measurement = { id: string; type: MetricType; value: number; diastolic?: number; unit: string; timestamp: string; source: SourceType }
type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechRecognitionInstance = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechResultEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void }
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance
type SpeechWindow = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }

const STORAGE_KEY = 'crewwell-measurements-v1'
const config: Record<MetricType, { label: string; unit: string; color: string }> = {
  heartRate: { label: 'Heart rate', unit: 'bpm', color: '#fb7185' },
  bloodPressure: { label: 'Blood pressure', unit: 'mmHg', color: '#38bdf8' },
  glucose: { label: 'Blood glucose', unit: 'mg/dL', color: '#c084fc' },
  temperature: { label: 'Body temperature', unit: '°C', color: '#fb923c' },
  sleep: { label: 'Sleep', unit: 'hours', color: '#818cf8' },
  noise: { label: 'Noise exposure', unit: 'dB', color: '#2dd4bf' },
  radiation: { label: 'Radiation dose', unit: 'mSv', color: '#facc15' },
  boneDensity: { label: 'Bone density', unit: 'T-score', color: '#a3e635' },
}
const types = Object.keys(config) as MetricType[]

function isMeasurementArray(value: unknown): value is Measurement[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => item && typeof item === 'object'
    && typeof item.id === 'string'
    && types.includes(item.type)
    && typeof item.value === 'number' && Number.isFinite(item.value)
    && (item.diastolic === undefined || (typeof item.diastolic === 'number' && Number.isFinite(item.diastolic)))
    && typeof item.unit === 'string'
    && typeof item.timestamp === 'string' && Number.isFinite(Date.parse(item.timestamp))
    && ['Simulation', 'Manual', 'Device'].includes(item.source))
}

function demoData(): Measurement[] {
  const now = Date.now()
  const make = (type: MetricType, value: number, hoursAgo: number, extra: Partial<Measurement> = {}): Measurement => ({
    id: `${type}-${hoursAgo}`, type, value, unit: config[type].unit,
    timestamp: new Date(now - hoursAgo * 3600000).toISOString(), source: 'Simulation', ...extra,
  })
  return [
    make('heartRate', 68, 5), make('heartRate', 72, 4), make('heartRate', 74, 3), make('heartRate', 70, 2), make('heartRate', 76, 1),
    make('bloodPressure', 118, 5, { diastolic: 76 }), make('bloodPressure', 120, 1, { diastolic: 78 }),
    make('glucose', 96, 5), make('glucose', 101, 1), make('temperature', 36.7, 4), make('temperature', 36.8, 1),
    make('sleep', 7.4, 8), make('noise', 68, 3), make('noise', 73, 1), make('radiation', 0.08, 4), make('radiation', 0.11, 1),
    make('boneDensity', -0.5, 168),
  ]
}

function loadMeasurements(): Measurement[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === null) return demoData()
    const parsed: unknown = JSON.parse(saved)
    return isMeasurementArray(parsed) ? parsed : demoData()
  } catch {
    return demoData()
  }
}

export default function App() {
  const [measurements, setMeasurements] = useState<Measurement[]>(loadMeasurements)
  const [metric, setMetric] = useState<MetricType>('heartRate')
  const [formType, setFormType] = useState<MetricType>('heartRate')
  const [value, setValue] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [source, setSource] = useState<SourceType>('Manual')
  const [message, setMessage] = useState('')
  const [voiceMessage, setVoiceMessage] = useState('Try: “What is my heart rate?” or “Save heart rate 72.”')
  const [listening, setListening] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(measurements)) }
    catch { setMessage('Could not save measurements in this browser. Avoid entering sensitive health data.') }
  }, [measurements])

  const latest = useMemo(() => {
    const result: Partial<Record<MetricType, Measurement>> = {}
    for (const item of measurements) {
      if (!result[item.type] || item.timestamp > result[item.type]!.timestamp) result[item.type] = item
    }
    return result
  }, [measurements])

  const chartData = useMemo(() => measurements
    .filter((item) => item.type === metric)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-12)
    .map((item) => ({ time: new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), value: item.value })), [measurements, metric])

  const alerts = useMemo(() => {
    const items: { title: string; detail: string; level: 'notice' | 'warning' }[] = []
    if (latest.heartRate && (latest.heartRate.value < 50 || latest.heartRate.value > 100)) items.push({ title: 'Heart-rate check-in', detail: `Latest reading: ${latest.heartRate.value} bpm. Outside the illustrative demo threshold.`, level: 'warning' })
    if (latest.bloodPressure && (latest.bloodPressure.value >= 140 || (latest.bloodPressure.diastolic ?? 0) >= 90)) items.push({ title: 'Blood-pressure check-in', detail: `Latest reading: ${latest.bloodPressure.value}/${latest.bloodPressure.diastolic ?? '—'} mmHg.`, level: 'warning' })
    if (latest.sleep && latest.sleep.value < 6) items.push({ title: 'Sleep duration is low', detail: `Latest entry: ${latest.sleep.value} hours. Compare with the personal mission plan.`, level: 'notice' })
    if (!items.length) items.push({ title: 'No demo alerts', detail: 'This is not a diagnosis or health assessment.', level: 'notice' })
    return items
  }, [latest])

  function speak(text: string) {
    setVoiceMessage(text)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const speech = new SpeechSynthesisUtterance(text)
      speech.lang = 'en-US'
      window.speechSynthesis.speak(speech)
    }
  }

  function voiceCommand(raw: string) {
    const text = raw.toLowerCase()
    if (text.includes('summary') || text.includes('status')) {
      speak(`Demo summary. Heart rate ${latest.heartRate?.value ?? 'not recorded'} beats per minute; sleep ${latest.sleep?.value ?? 'not recorded'} hours.`)
      return
    }
    const aliases: Record<MetricType, string[]> = {
      heartRate: ['heart rate', 'pulse'], bloodPressure: ['blood pressure'], glucose: ['blood glucose', 'blood sugar', 'glucose'],
      temperature: ['temperature', 'fever'], sleep: ['sleep'], noise: ['noise'], radiation: ['radiation'], boneDensity: ['bone density'],
    }
    const selected = types.find((type) => aliases[type].some((alias) => text.includes(alias)))
    if (text.includes('save') || text.includes('record') || text.includes('add')) {
      if (!selected) { speak('I could not identify which measurement to save.'); return }
      if (selected === 'bloodPressure') { speak('Enter both blood pressure values using the form.'); return }
      const match = text.match(/-?\d+(?:[.,]\d+)?/)
      if (!match) { speak('Please say a value, for example: save heart rate 72.'); return }
      const number = Number(match[0].replace(',', '.'))
      if (!Number.isFinite(number)) { speak('That value could not be read.'); return }
      setMeasurements((previous) => [...previous, { id: crypto.randomUUID(), type: selected, value: number, unit: config[selected].unit, timestamp: new Date().toISOString(), source: 'Manual' }])
      speak(`${config[selected].label} ${number} saved.`)
      return
    }
    if (selected) {
      const item = latest[selected]
      speak(item ? `Latest ${config[selected].label.toLowerCase()} reading: ${item.value} ${item.unit}.` : `No ${config[selected].label.toLowerCase()} reading yet.`)
      return
    }
    speak('I did not understand. Try asking for a status summary or heart rate.')
  }

  function startVoice() {
    const host = window as SpeechWindow
    const Recognition = host.SpeechRecognition ?? host.webkitSpeechRecognition
    if (!Recognition) { speak('Speech recognition is not supported in this browser. Try Chrome.'); return }
    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => voiceCommand(event.results[0]?.[0]?.transcript ?? '')
    recognition.onerror = () => { setListening(false); setVoiceMessage('Speech recognition failed. Check microphone permission.') }
    recognition.onend = () => setListening(false)
    try { setListening(true); setVoiceMessage('Listening…'); recognition.start() }
    catch { setListening(false); setVoiceMessage('Could not start speech recognition.') }
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
      timestamp: new Date().toISOString(), source,
    }])
    setValue('')
    setDiastolic('')
    setMessage('Measurement saved.')
  }

  function clearLocalMeasurements() {
    if (!window.confirm('Delete all measurement records saved in this browser? This cannot be undone.')) return
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* State is still cleared for this session. */ }
    setMeasurements([])
    setMessage('Local measurement records cleared. Demo data will not be restored until browser storage is cleared or reset.')
  }

  const cards: MetricType[] = ['heartRate', 'bloodPressure', 'glucose', 'temperature', 'sleep', 'radiation']

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">CW</div><div><p className="eyebrow">CREWWELL · MISSION HEALTH</p><h1>Crew health dashboard</h1><p className="subheading">Demo crew member · Mission day 042</p></div></div>
      <div className="top-actions"><span className="demo-badge">● DEMO DATA</span><button className="voice-button" type="button" onClick={startVoice} disabled={listening}>{listening ? '🎙 Listening…' : '🎙 Voice command'}</button></div>
    </header>
    <div className="notice-banner"><strong>Prototype notice:</strong> Sample entries are simulated. Do not enter real or identifying health information. This application does not diagnose or make medical decisions.</div>

    <section className="metric-grid" aria-label="Latest health measurements">{cards.map((type) => {
      const item = latest[type]
      return <article className="metric-card" key={type}><div className="metric-icon" style={{ color: config[type].color, backgroundColor: `${config[type].color}18` }}>{type === 'heartRate' ? '♡' : type === 'bloodPressure' ? '⌁' : type === 'glucose' ? '◉' : type === 'temperature' ? '♨' : type === 'sleep' ? '☾' : '✳'}</div><div className="metric-info"><span className="metric-label">{config[type].label}</span><strong>{item ? type === 'bloodPressure' ? `${item.value}/${item.diastolic ?? '—'}` : item.value : '—'}{item && <small> {config[type].unit}</small>}</strong><span className="metric-source">{item?.source ?? 'No measurement yet'}</span></div></article>
    })}</section>

    <section className="main-grid"><article className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">OVER TIME</p><h2>Measurement trend</h2></div><select className="select-control" value={metric} onChange={(event) => setMetric(event.target.value as MetricType)} aria-label="Chart measurement type">{types.map((type) => <option key={type} value={type}>{config[type].label}</option>)}</select></div><div className="chart-caption">{config[metric].label} · {config[metric].unit}</div><div className="chart-wrap">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={config[metric].color} stopOpacity={0.28} /><stop offset="95%" stopColor={config[metric].color} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#253247" strokeDasharray="4 4" /><XAxis dataKey="time" stroke="#718096" /><YAxis stroke="#718096" domain={['auto', 'auto']} /><Tooltip /><Area type="monotone" dataKey="value" stroke={config[metric].color} fill="url(#chartFill)" /></AreaChart></ResponsiveContainer> : <div className="empty-chart">No entries for this measurement.</div>}</div></article>
      <article className="panel alerts-panel"><div className="panel-heading"><div><p className="eyebrow">AUTOMATED SUMMARY</p><h2>Check-in notifications</h2></div><span className="count-badge">{alerts.length}</span></div><div className="alert-list">{alerts.map((alert) => <div className={`alert-item ${alert.level}`} key={alert.title}><span className="alert-symbol">{alert.level === 'warning' ? '!' : 'i'}</span><div><strong>{alert.title}</strong><p>{alert.detail}</p></div></div>)}</div><p className="small-note">Thresholds are illustrative only and are not clinical advice.</p></article>
    </section>

    <section className="secondary-grid"><article className="panel"><div className="panel-heading"><div><p className="eyebrow">RECORD ENTRY</p><h2>Add a measurement</h2></div></div><form className="measurement-form" onSubmit={addMeasurement}><label>Measurement type<select className="select-control" value={formType} onChange={(event) => setFormType(event.target.value as MetricType)}>{types.map((type) => <option key={type} value={type}>{config[type].label}</option>)}</select></label><label>{formType === 'bloodPressure' ? 'Systolic pressure' : 'Value'}<div className="input-with-unit"><input type="number" step="any" min="0" value={value} onChange={(event) => setValue(event.target.value)} required /><span>{config[formType].unit}</span></div></label>{formType === 'bloodPressure' && <label>Diastolic pressure<div className="input-with-unit"><input type="number" step="any" min="0" value={diastolic} onChange={(event) => setDiastolic(event.target.value)} required /><span>mmHg</span></div></label>}<label>Data source<select className="select-control" value={source} onChange={(event) => setSource(event.target.value as SourceType)}><option>Manual</option><option>Device</option><option>Simulation</option></select></label><button className="submit-button" type="submit">Save measurement <span>→</span></button>{message && <p className="form-message" role="status">{message}</p>}</form></article>
      <article className="panel assistant-panel"><div className="panel-heading"><div><p className="eyebrow">SUPPORT</p><h2>Crew wellness assistant</h2></div><span className="assistant-orb">✦</span></div><p className="assistant-intro">General wellness reminders. These do not replace an individual health plan.</p><div className="recommendation"><span>01</span><div><strong>Review nutrition logs</strong><p>Record meals and hydration according to the mission plan.</p></div></div><div className="recommendation"><span>02</span><div><strong>Track the exercise routine</strong><p>Mark planned exercise and recovery sessions.</p></div></div><div className="recommendation"><span>03</span><div><strong>Monitor sleep patterns</strong><p>Record sleep duration and how rested you feel.</p></div></div><div className="voice-status" aria-live="polite"><span className={listening ? 'listening-dot active' : 'listening-dot'} />{voiceMessage}</div><p className="privacy-note"><strong>Microphone privacy:</strong> Voice recognition starts only after you press the button. Depending on your browser, speech may be processed by the browser or its provider. Avoid speaking personal or identifying health information.</p></article>
    </section>

    <NasaDataImport />
    <section className="panel history-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ENTRIES</p><h2>Measurement history</h2></div><div className="history-actions"><span className="history-count">{measurements.length} records</span><button className="clear-button" type="button" onClick={clearLocalMeasurements}>Clear local measurement records</button></div></div><div className="table-scroll"><table><thead><tr><th>Measurement</th><th>Value</th><th>Time</th><th>Source</th></tr></thead><tbody>{[...measurements].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10).map((item) => <tr key={item.id}><td>{config[item.type].label}</td><td>{item.type === 'bloodPressure' ? `${item.value}/${item.diastolic ?? '—'}` : item.value} {item.unit}</td><td>{new Date(item.timestamp).toLocaleString('en-US')}</td><td><span className={`source-tag ${item.source.toLowerCase()}`}>{item.source}</span></td></tr>)}</tbody></table>{measurements.length === 0 && <p className="empty-history">No local measurement records. Demo readings are currently cleared.</p>}</div></section>
    <footer className="footer">CrewWell prototype · Local records are not encrypted · Demo, not a medical device</footer>
  </main>
}
