import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import NasaDataImport from './NasaDataImport'

type MetricType = 'heartRate' | 'bloodPressure' | 'glucose' | 'temperature' | 'sleep' | 'noise' | 'radiation' | 'boneDensity'
type SourceType = 'Simulation' | 'Manual' | 'Device'
type Measurement = { id: string; type: MetricType; value: number; diastolic?: number; unit: string; timestamp: string; source: SourceType }
type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechRecognitionInstance = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechResultEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void }
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance
type SpeechWindow = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }

const STORAGE_KEY = 'crewwell-measurements-v1'
const config: Record<MetricType, { label: string; unit: string; color: string }> = {
  heartRate: { label: 'Heart rate', unit: 'bpm', color: '#fb7185' }, bloodPressure: { label: 'Blood pressure', unit: 'mmHg', color: '#38bdf8' },
  glucose: { label: 'Blood glucose', unit: 'mg/dL', color: '#c084fc' }, temperature: { label: 'Body temperature', unit: '°C', color: '#fb923c' },
  sleep: { label: 'Sleep', unit: 'hours', color: '#818cf8' }, noise: { label: 'Noise exposure', unit: 'dB', color: '#2dd4bf' },
  radiation: { label: 'Radiation dose', unit: 'mSv', color: '#facc15' }, boneDensity: { label: 'Bone density', unit: 'T-score', color: '#a3e635' },
}
const types = Object.keys(config) as MetricType[]

function demoData(): Measurement[] {
  const now = Date.now()
  const make = (type: MetricType, value: number, hoursAgo: number, extra: Partial<Measurement> = {}): Measurement => ({
    id: `${type}-${hoursAgo}`, type, value, unit: config[type].unit, timestamp: new Date(now - hoursAgo * 3600000).toISOString(), source: 'Simulation', ...extra,
  })
  return [make('heartRate', 68, 5), make('heartRate', 72, 4), make('heartRate', 74, 3), make('heartRate', 70, 2), make('heartRate', 76, 1), make('bloodPressure', 118, 5, { diastolic: 76 }), make('bloodPressure', 120, 1, { diastolic: 78 }), make('glucose', 96, 5), make('glucose', 101, 1), make('temperature', 36.7, 4), make('temperature', 36.8, 1), make('sleep', 7.4, 8), make('noise', 68, 3), make('noise', 73, 1), make('radiation', 0.08, 4), make('radiation', 0.11, 1), make('boneDensity', -0.5, 168)]
}

export default function App() {
  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) as Measurement[] : demoData() } catch { return demoData() }
  })
  const [metric, setMetric] = useState<MetricType>('heartRate')
  const [formType, setFormType] = useState<MetricType>('heartRate')
  const [value, setValue] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [source, setSource] = useState<SourceType>('Manual')
  const [message, setMessage] = useState('')
  const [voiceMessage, setVoiceMessage] = useState('Try: “What is my heart rate?” or “Save heart rate 72.”')
  const [listening, setListening] = useState(false)

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(measurements)) } catch { setMessage('Could not save measurements in this browser.') } }, [measurements])

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
    if (latest.sleep && latest.sleep.value < 6) items.push({ title: 'Sleep duration is low', detail: `Latest entry: ${latest.sleep.value} hours. Compare with the personal mission plan.`, level: 'notice' })
    if (!items.length) items.push({ title: 'No demo alerts', detail: 'This is not a diagnosis or health assessment.', level: 'notice' })
    return items
  }, [latest])

  function speak(text: string) {
    setVoiceMessage(text)
    if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(text); speech.lang = 'en-US'; window.speechSynthesis.speak(speech) }
  }
  function voiceCommand(raw: string) {
    const text = raw.toLowerCase()
    if (text.includes('summary') || text.includes('status')) { speak(`Demo summary. Heart rate ${latest.heartRate?.value ?? 'not recorded'} beats per minute; sleep ${latest.sleep?.value ?? 'not recorded'} hours.`); return }
    const aliases: Record<MetricType, string[]> = { heartRate: ['heart rate', 'pulse'], bloodPressure: ['blood pressure'], glucose: ['blood glucose', 'blood sugar', 'glucose'], temperature: ['temperature', 'fever'], sleep: ['sleep'], noise: ['noise'], radiation: ['radiation'], boneDensity: ['bone density'] }
    const selected = types.find((type) => aliases[type].some((alias) => text.includes(alias)))
    if (text.includes('save') || text.includes('record') || text.includes('add')) {
      if (!selected) { speak('I could not identify which measurement to save.'); return }
      if (selected === 'bloodPressure') { speak('Enter both blood pressure values using the form.'); return }
      const match = text.match(/-?\d+(?:[.,]\d+)?/)
      if (!match) { speak('Please say a value, for example: save heart rate 72.'); return }
      const number = Number(match[0].replace(',', '.'))
      setMeasurements((previous) => [...previous, { id: crypto.randomUUID(), type: selected, value: number, unit: config[selected].unit, timestamp: new Date().toISOString(), source: 'Manual' }])
      speak(`${config[selected].label} ${number} saved.`); return
    }
    if (selected) { speak(latest[selected] ? `Latest ${config[selected].label.toLowerCase()} reading: ${latest[selected]!.value} ${latest[selected]!.unit}.` : `No ${config[selected].label.toLowerCase()} reading yet.`); return }
    speak('I did not understand. Try asking for a status summary or heart rate.')
  }
  function startVoice() {
    const host = window as SpeechWindow
    const Recognition = host.SpeechRecognition ?? host.webkitSpeechRecognition
    if (!Recognition) { speak('Speech recognition is not supported in this browser. Try Chrome.'); return }
    const recognition = new Recognition(); recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = false
    recognition.onresult = (event) => voiceCommand(event.results[0]?.[0]?.transcript ?? '')
    recognition.onerror = () => { setListening(false); setVoiceMessage('Speech recognition failed. Check microphone permission.') }
    recognition.onend = () => setListening(false)
    try { setListening(true); setVoiceMessage('Listening…'); recognition.start() } catch { setListening(false); setVoiceMessage('Could not start speech recognition.') }
  }
  function addMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numericValue = Number(value)
    const lower = formType === 'bloodPressure' ? Number(diastolic) : undefined
    if (!Number.isFinite(numericValue) || numericValue <= 0 || (formType === 'bloodPressure' && (!Number.isFinite(lower) || (lower ?? 0) <= 0))) { setMessage('Enter valid measurement values. Blood pressure needs both values.'); return }
    setMeasurements((previous) => [...previous, { id: crypto.randomUUID(), type: formType, value: numericValue, ...(lower !== undefined ? { diastolic: lower } : {}), unit: config[formType].unit, timestamp: new Date().toISOString(), source }])
    setValue(''); setDiastolic(''); setMessage('Measurement saved.')
  }

  const cards: MetricType[] = ['heartRate', 'bloodPressure', 'glucose', 'temperature', 'sleep', 'radiation']
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">CW</div><div><p className="eyebrow">CREWWELL · MISSION HEALTH</p><h1>Crew health dashboard</h1><p className="subheading">Demo crew member · Mission day 042</p></div></div><div className="top-actions"><span className="demo-badge">● DEMO DATA</span><button className="voice-button" onClick={startVoice} disabled={listening}>{listening ? '🎙 Listening…' : '🎙 Voice command'}</button></div></header>
    <div className="notice-banner"><strong>Prototype notice:</strong> Sample entries are simulated. This application does not diagnose or make medical decisions.</div>
    <section className="metric-grid" aria-label="Latest health measurements">{cards.map((type) => { const item = latest[type]; return <article className="metric-card" key={type}><div className="metric-icon" style={{ color: config[type].color, backgroundColor: `${config[type].color}18` }}>{type === 'heartRate' ? '♡' : type === 'bloodPressure' ? '⌁' : type === 'glucose' ? '◉' : type === 'temperature' ? '♨' : type === 'sleep' ? '☾' : '✳'}</div><div className="metric-info"><span className="metric-label">{config[type].label}</span><strong>{item ? type === 'bloodPressure' ? `${item.value}/${item.diastolic ?? '—'}` : item.value : '—'}{item && <small> {config[type].unit}</small>}</strong><span className="metric-source">{item?.source ?? 'No measurement yet'}</span></div></article> })}</section>
    <section className="main-grid"><article className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">OVER TIME</p><h2>Measurement trend</h2></div><select className="select-control" value={metric} onChange={(event) => setMetric(event.target.value as MetricType)}>{types.map((type) => <option key={type} value={type}>{config[type].label}</option>)}</select></div><div className="chart-caption">{config[metric].label} · {config[metric].unit}</div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={config[metric].color} stopOpacity={0.28} /><stop offset="95%" stopColor={config[metric].color} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#253247" strokeDasharray="4 4" /><XAxis dataKey="time" stroke="#718096" /><YAxis stroke="#718096" domain={['auto', 'auto']} /><Tooltip /><Area type="monotone" dataKey="value" stroke={config[metric].color} fill="url(#chartFill)" /></AreaChart></ResponsiveContainer></div></article>
      <article className="panel alerts-panel"><div className="panel-heading"><div><p className="eyebrow">AUTOMATED SUMMARY</p><h2>Check-in notifications</h2></div><span className="count-badge">{alerts.length}</span></div><div className="alert-list">{alerts.map((alert) => <div className={`alert-item ${alert.level}`} key={alert.title}><span className="alert-symbol">{alert.level === 'warning' ? '!' : 'i'}</span><div><strong>{alert.title}</strong><p>{alert.detail}</p></div></div>)}</div><p className="small-note">Thresholds are illustrative only and are not clinical advice.</p></article></section>
    <section className="secondary-grid"><article className="panel"><div className="panel-heading"><div><p className="eyebrow">RECORD ENTRY</p><h2>Add a measurement</h2></div></div><form className="measurement-form" onSubmit={addMeasurement}><label>Measurement type<select className="select-control" value={formType} onChange={(event) => setFormType(event.target.value as MetricType)}>{types.map((type) => <option key={type} value={type}>{config[type].label}</option>)}</select></label><label>{formType === 'bloodPressure' ? 'Systolic pressure' : 'Value'}<div className="input-with-unit"><input type="number" step="any" min="0" value={value} onChange={(event) => setValue(event.target.value)} required /><span>{config[formType].unit}</span></div></label>{formType === 'bloodPressure' && <label>Diastolic pressure<div className="input-with-unit"><input type="number" step="any" min="0" value={diastolic} onChange={(event) => setDiastolic(event.target.value)} required /><span>mmHg</span></div></label>}<label>Data source<select className="select-control" value={source} onChange={(event) => setSource(event.target.value as SourceType)}><option>Manual</option><option>Device</option><option>Simulation</option></select></label><button className="submit-button">Save measurement <span>→</span></button>{message && <p className="form-message">{message}</p>}</form></article>
      <article className="panel assistant-panel"><div className="panel-heading"><div><p className="eyebrow">SUPPORT</p><h2>Crew wellness assistant</h2></div><span className="assistant-orb">✦</span></div><p className="assistant-intro">General wellness reminders. These do not replace an individual health plan.</p><div className="recommendation"><span>01</span><div><strong>Review nutrition logs</strong><p>Record meals and hydration according to the mission plan.</p></div></div><div className="recommendation"><span>02</span><div><strong>Track the exercise routine</strong><p>Mark planned exercise and recovery sessions.</p></div></div><div className="recommendation"><span>03</span><div><strong>Monitor sleep patterns</strong><p>Record sleep duration and how rested you feel.</p></div></div><div className="voice-status" aria-live="polite"><span className={listening ? 'listening-dot active' : 'listening-dot'} />{voiceMessage}</div></article></section>
    <NasaDataImport />
    <section className="panel history-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ENTRIES</p><h2>Measurement history</h2></div><span className="history-count">{measurements.length} records</span></div><div className="table-scroll"><table><thead><tr><th>Measurement</th><th>Value</th><th>Time</th><th>Source</th></tr></thead><tbody>{[...measurements].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10).map((item) => <tr key={item.id}><td>{config[item.type].label}</td><td>{item.type === 'bloodPressure' ? `${item.value}/${item.diastolic ?? '—'}` : item.value} {item.unit}</td><td>{new Date(item.timestamp).toLocaleString('en-US')}</td><td><span className={`source-tag ${item.source.toLowerCase()}`}>{item.source}</span></td></tr>)}</tbody></table></div></section>
    <footer className="footer">CrewWell prototype · Records are stored in this browser · Demo, not a medical device</footer>
  </main>
}
