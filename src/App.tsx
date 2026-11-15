import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type MetricType = 'heartRate' | 'bloodPressure' | 'glucose' | 'temperature' | 'sleep' | 'noise' | 'radiation' | 'boneDensity'
type SourceType = 'Simulation' | 'Manual' | 'Device'
type Measurement = { id: string; type: MetricType; value: number; diastolic?: number; unit: string; timestamp: string; source: SourceType }
type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechRecognitionInstance = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechResultEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void }
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance
type SpeechWindow = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }

const STORAGE_KEY = 'crewwell-measurements-v1'
const metricConfig: Record<MetricType, { label: string; unit: string; color: string }> = {
  heartRate: { label: 'Heart rate', unit: 'bpm', color: '#fb7185' },
  bloodPressure: { label: 'Blood pressure', unit: 'mmHg', color: '#38bdf8' },
  glucose: { label: 'Blood glucose', unit: 'mg/dL', color: '#c084fc' },
  temperature: { label: 'Body temperature', unit: '°C', color: '#fb923c' },
  sleep: { label: 'Sleep', unit: 'hours', color: '#818cf8' },
  noise: { label: 'Noise exposure', unit: 'dB', color: '#2dd4bf' },
  radiation: { label: 'Radiation dose', unit: 'mSv', color: '#facc15' },
  boneDensity: { label: 'Bone density', unit: 'T-score', color: '#a3e635' },
}
const metricTypes = Object.keys(metricConfig) as MetricType[]

function createDemoMeasurements(): Measurement[] {
  const now = Date.now()
  const make = (type: MetricType, value: number, hoursAgo: number, extra: Partial<Measurement> = {}): Measurement => ({
    id: `${type}-${hoursAgo}`, type, value, unit: metricConfig[type].unit,
    timestamp: new Date(now - hoursAgo * 60 * 60 * 1000).toISOString(), source: 'Simulation', ...extra,
  })
  return [
    make('heartRate', 68, 5), make('heartRate', 72, 4), make('heartRate', 74, 3), make('heartRate', 70, 2), make('heartRate', 76, 1),
    make('bloodPressure', 118, 5, { diastolic: 76 }), make('bloodPressure', 120, 1, { diastolic: 78 }),
    make('glucose', 96, 5), make('glucose', 101, 1), make('temperature', 36.7, 4), make('temperature', 36.8, 1),
    make('sleep', 7.4, 8), make('noise', 68, 3), make('noise', 73, 1), make('radiation', 0.08, 4), make('radiation', 0.11, 1),
    make('boneDensity', -0.5, 24 * 7),
  ]
}
function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function App() {
  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return createDemoMeasurements()
      const parsed: unknown = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed as Measurement[] : createDemoMeasurements()
    } catch { return createDemoMeasurements() }
  })
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('heartRate')
  const [formType, setFormType] = useState<MetricType>('heartRate')
  const [formValue, setFormValue] = useState('')
  const [formDiastolic, setFormDiastolic] = useState('')
  const [formSource, setFormSource] = useState<SourceType>('Manual')
  const [formMessage, setFormMessage] = useState('')
  const [voiceMessage, setVoiceMessage] = useState('Try: “What is my heart rate?” or “Save heart rate 72.”')
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(measurements)) }
    catch { setFormMessage('Could not save measurements in this browser.') }
  }, [measurements])

  const latestByType = useMemo(() => {
    const latest: Partial<Record<MetricType, Measurement>> = {}
    for (const measurement of measurements) {
      const current = latest[measurement.type]
      if (!current || new Date(measurement.timestamp).getTime() > new Date(current.timestamp).getTime()) latest[measurement.type] = measurement
    }
    return latest
  }, [measurements])

  const chartData = useMemo(() => measurements
    .filter((measurement) => measurement.type === selectedMetric)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-12)
    .map((measurement) => ({ time: new Date(measurement.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), value: measurement.value })), [measurements, selectedMetric])

  const alerts = useMemo(() => {
    const found: { title: string; detail: string; level: 'notice' | 'warning' }[] = []
    const heartRate = latestByType.heartRate
    if (heartRate && (heartRate.value < 50 || heartRate.value > 100)) found.push({ title: 'Heart-rate check-in', detail: `Latest reading: ${heartRate.value} bpm. It is outside this demo threshold.`, level: 'warning' })
    const pressure = latestByType.bloodPressure
    if (pressure && (pressure.value >= 140 || (pressure.diastolic !== undefined && pressure.diastolic >= 90))) found.push({ title: 'Blood-pressure check-in', detail: `Latest reading: ${pressure.value}/${pressure.diastolic ?? '—'} mmHg.`, level: 'warning' })
    const sleep = latestByType.sleep
    if (sleep && sleep.value < 6) found.push({ title: 'Sleep duration is low', detail: `Latest entry: ${sleep.value} hours. Compare with the crew member’s personal target.`, level: 'notice' })
    const noise = latestByType.noise
    if (noise && noise.value >= 80) found.push({ title: 'High noise reading', detail: `Latest entry: ${noise.value} dB. Exposure duration also matters.`, level: 'notice' })
    if (!found.length) found.push({ title: 'No new demo alerts', detail: 'This is not a diagnosis or health assessment.', level: 'notice' })
    return found
  }, [latestByType])

  function speak(text: string) {
    setVoiceMessage(text)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      window.speechSynthesis.speak(utterance)
    }
  }

  function runVoiceCommand(rawText: string) {
    const text = rawText.toLowerCase()
    const aliases: Record<MetricType, string[]> = {
      heartRate: ['heart rate', 'pulse'], bloodPressure: ['blood pressure'], glucose: ['blood glucose', 'glucose', 'blood sugar'],
      temperature: ['body temperature', 'temperature', 'fever'], sleep: ['sleep'], noise: ['noise'], radiation: ['radiation'], boneDensity: ['bone density'],
    }
    const spokenMetric = metricTypes.find((type) => aliases[type].some((alias) => text.includes(alias)))
    if (text.includes('status') || text.includes('summary')) {
      const pulse = latestByType.heartRate
      const sleep = latestByType.sleep
      speak(`Demo summary. Heart rate: ${pulse ? `${pulse.value} beats per minute` : 'not recorded'}. Sleep: ${sleep ? `${sleep.value} hours` : 'not recorded'}.`)
      return
    }
    if (text.includes('save') || text.includes('record') || text.includes('add')) {
      if (!spokenMetric) { speak('I could not identify which measurement to save.'); return }
      if (spokenMetric === 'bloodPressure') { speak('Voice blood-pressure entry is not supported yet. Please enter both values in the form.'); return }
      const match = text.match(/-?\d+(?:[.,]\d+)?/)
      if (!match) { speak('I could not hear a value. For example, say: save heart rate 72.'); return }
      const value = Number(match[0].replace(',', '.'))
      if (!Number.isFinite(value)) { speak('I could not understand that measurement value.'); return }
      setMeasurements((previous) => [...previous, { id: crypto.randomUUID(), type: spokenMetric, value, unit: metricConfig[spokenMetric].unit, timestamp: new Date().toISOString(), source: 'Manual' }])
      speak(`${metricConfig[spokenMetric].label} ${value} saved.`)
      return
    }
    if (spokenMetric) {
      const measurement = latestByType[spokenMetric]
      speak(measurement ? `Your latest ${metricConfig[spokenMetric].label.toLowerCase()} reading is ${measurement.value} ${measurement.unit}.` : `There is no ${metricConfig[spokenMetric].label.toLowerCase()} reading yet.`)
      return
    }
    speak('I did not understand. Try asking for a status summary or your heart rate.')
  }

  function startVoiceCommand() {
    const speechWindow = window as SpeechWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) { speak('Speech recognition is not supported in this browser. Try Chrome.'); return }
    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => runVoiceCommand(event.results[0]?.[0]?.transcript ?? '')
    recognition.onerror = () => { setIsListening(false); setVoiceMessage('Speech was not recognized. Check microphone permission and try again.') }
    recognition.onend = () => setIsListening(false)
    try { setIsListening(true); setVoiceMessage('Listening…'); recognition.start() }
    catch { setIsListening(false); setVoiceMessage('Could not start speech recognition.') }
  }

  function addMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = Number(formValue)
    const diastolic = formType === 'bloodPressure' ? Number(formDiastolic) : undefined
    if (!Number.isFinite(value) || value <= 0) { setFormMessage('Enter a valid value greater than zero.'); return }
    if (formType === 'bloodPressure' && (!Number.isFinite(diastolic) || (diastolic ?? 0) <= 0)) { setFormMessage('Enter systolic and diastolic values separately.'); return }
    setMeasurements((previous) => [...previous, { id: crypto.randomUUID(), type: formType, value, ...(diastolic !== undefined ? { diastolic } : {}), unit: metricConfig[formType].unit, timestamp: new Date().toISOString(), source: formSource }])
    setFormValue(''); setFormDiastolic(''); setFormMessage('Measurement saved.')
  }

  const cards: MetricType[] = ['heartRate', 'bloodPressure', 'glucose', 'temperature', 'sleep', 'radiation']
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">CW</div><div>
      <p className="eyebrow">CREWWELL · MISSION HEALTH</p><h1>Crew health dashboard</h1><p className="subheading">Demo crew member · Mission day 042</p>
    </div></div><div className="top-actions"><span className="demo-badge">● DEMO DATA</span>
      <button className="voice-button" type="button" onClick={startVoiceCommand} disabled={isListening}>{isListening ? '🎙 Listening…' : '🎙 Voice command'}</button>
    </div></header>

    <div className="notice-banner"><strong>Prototype notice:</strong> Sample entries are simulated. This application does not diagnose or make medical decisions.</div>

    <section className="metric-grid" aria-label="Latest health measurements">{cards.map((type) => {
      const measurement = latestByType[type]; const config = metricConfig[type]
      const displayValue = measurement ? type === 'bloodPressure' ? `${measurement.value}/${measurement.diastolic ?? '—'}` : measurement.value : '—'
      return <article className="metric-card" key={type}><div className="metric-icon" style={{ color: config.color, backgroundColor: `${config.color}18` }}>
        {type === 'heartRate' ? '♡' : type === 'bloodPressure' ? '⌁' : type === 'glucose' ? '◉' : type === 'temperature' ? '♨' : type === 'sleep' ? '☾' : '✳'}
      </div><div className="metric-info"><span className="metric-label">{config.label}</span><strong>{displayValue}{measurement && <small> {config.unit}</small>}</strong><span className="metric-source">{measurement?.source ?? 'No measurement yet'}</span></div></article>
    })}</section>

    <section className="main-grid"><article className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">OVER TIME</p><h2>Measurement trend</h2></div>
      <select className="select-control" value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value as MetricType)} aria-label="Chart measurement type">
        {metricTypes.map((type) => <option key={type} value={type}>{metricConfig[type].label}</option>)}
      </select></div><div className="chart-caption">{metricConfig[selectedMetric].label} · {metricConfig[selectedMetric].unit}</div>
      <div className="chart-wrap">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={metricConfig[selectedMetric].color} stopOpacity={0.28} /><stop offset="95%" stopColor={metricConfig[selectedMetric].color} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke="#253247" strokeDasharray="4 4" /><XAxis dataKey="time" stroke="#718096" tickLine={false} /><YAxis stroke="#718096" tickLine={false} width={42} domain={['auto', 'auto']} />
        <Tooltip contentStyle={{ background: '#111c2c', border: '1px solid #29364b', borderRadius: 12, color: '#edf4ff' }} formatter={(value) => [`${value} ${metricConfig[selectedMetric].unit}`, metricConfig[selectedMetric].label]} />
        <Area type="monotone" dataKey="value" stroke={metricConfig[selectedMetric].color} strokeWidth={3} fill="url(#chartFill)" connectNulls /></AreaChart></ResponsiveContainer> : <div className="empty-chart">No entries for this measurement yet.</div>}</div>
    </article>

    <article className="panel alerts-panel"><div className="panel-heading"><div><p className="eyebrow">AUTOMATED SUMMARY</p><h2>Check-in notifications</h2></div><span className="count-badge">{alerts.length}</span></div>
      <div className="alert-list">{alerts.map((alert, index) => <div className={`alert-item ${alert.level}`} key={`${alert.title}-${index}`}><span className="alert-symbol">{alert.level === 'warning' ? '!' : 'i'}</span><div><strong>{alert.title}</strong><p>{alert.detail}</p></div></div>)}</div>
      <p className="small-note">Thresholds are for prototype demonstration only and are not clinical advice.</p>
    </article></section>

    <section className="secondary-grid"><article className="panel"><div className="panel-heading"><div><p className="eyebrow">RECORD ENTRY</p><h2>Add a measurement</h2></div></div>
      <form className="measurement-form" onSubmit={addMeasurement}><label>Measurement type<select className="select-control" value={formType} onChange={(event) => { setFormType(event.target.value as MetricType); setFormMessage('') }}>{metricTypes.map((type) => <option key={type} value={type}>{metricConfig[type].label}</option>)}</select></label>
        <label>{formType === 'bloodPressure' ? 'Systolic pressure' : 'Value'}<div className="input-with-unit"><input type="number" step="any" min="0" value={formValue} onChange={(event) => setFormValue(event.target.value)} placeholder={formType === 'bloodPressure' ? '120' : 'Enter a value'} required /><span>{metricConfig[formType].unit}</span></div></label>
        {formType === 'bloodPressure' && <label>Diastolic pressure<div className="input-with-unit"><input type="number" step="any" min="0" value={formDiastolic} onChange={(event) => setFormDiastolic(event.target.value)} placeholder="80" required /><span>mmHg</span></div></label>}
        <label>Data source<select className="select-control" value={formSource} onChange={(event) => setFormSource(event.target.value as SourceType)}><option>Manual</option><option>Device</option><option>Simulation</option></select></label>
        <button className="submit-button" type="submit">Save measurement <span>→</span></button>{formMessage && <p className="form-message">{formMessage}</p>}
      </form>
    </article>

    <article className="panel assistant-panel"><div className="panel-heading"><div><p className="eyebrow">SUPPORT</p><h2>Crew wellness assistant</h2></div><span className="assistant-orb">✦</span></div>
      <p className="assistant-intro">General wellness reminders. These do not replace an individual health plan.</p>
      <div className="recommendation"><span>01</span><div><strong>Review nutrition logs</strong><p>Record meals and hydration according to the mission plan.</p></div></div>
      <div className="recommendation"><span>02</span><div><strong>Track the exercise routine</strong><p>Mark planned exercise and recovery sessions.</p></div></div>
      <div className="recommendation"><span>03</span><div><strong>Monitor sleep patterns</strong><p>Record sleep duration and how rested you feel.</p></div></div>
      <div className="voice-status" aria-live="polite"><span className={isListening ? 'listening-dot active' : 'listening-dot'} />{voiceMessage}</div>
    </article></section>

    <section className="panel history-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ENTRIES</p><h2>Measurement history</h2></div><span className="history-count">{measurements.length} records</span></div>
      <div className="table-scroll"><table><thead><tr><th>Measurement</th><th>Value</th><th>Time</th><th>Source</th></tr></thead><tbody>
        {[...measurements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10).map((measurement) => <tr key={measurement.id}><td>{metricConfig[measurement.type].label}</td><td>{measurement.type === 'bloodPressure' ? `${measurement.value}/${measurement.diastolic ?? '—'}` : measurement.value} {measurement.unit}</td><td>{formatDateTime(measurement.timestamp)}</td><td><span className={`source-tag ${measurement.source.toLowerCase()}`}>{measurement.source}</span></td></tr>)}
      </tbody></table></div>
    </section>
    <footer className="footer">CrewWell prototype · Records are stored in this browser · Demo, not a medical device</footer>
  </main>
}
