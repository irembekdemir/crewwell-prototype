import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type MetricType =
  | 'heartRate'
  | 'bloodPressure'
  | 'glucose'
  | 'temperature'
  | 'sleep'
  | 'noise'
  | 'radiation'
  | 'boneDensity'

type SourceType = 'Simülasyon' | 'Manuel' | 'Cihaz'

type Measurement = {
  id: string
  type: MetricType
  value: number
  diastolic?: number
  unit: string
  timestamp: string
  source: SourceType
}

type SpeechRecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

const STORAGE_KEY = 'crewwell-measurements-v1'

const metricConfig: Record<
  MetricType,
  { label: string; unit: string; color: string; demoRange: string }
> = {
  heartRate: { label: 'Nabız', unit: 'bpm', color: '#fb7185', demoRange: '60–100 bpm' },
  bloodPressure: { label: 'Tansiyon', unit: 'mmHg', color: '#38bdf8', demoRange: 'Demo eşiği: 90–140 / 60–90' },
  glucose: { label: 'Kan şekeri', unit: 'mg/dL', color: '#c084fc', demoRange: 'Ölçüm koşuluna göre değişir' },
  temperature: { label: 'Vücut sıcaklığı', unit: '°C', color: '#fb923c', demoRange: 'Ölçüm yöntemine göre değişir' },
  sleep: { label: 'Uyku', unit: 'saat', color: '#818cf8', demoRange: 'Kişisel hedefe göre' },
  noise: { label: 'Gürültü maruziyeti', unit: 'dB', color: '#2dd4bf', demoRange: 'Süre ve ölçüm yöntemine bağlı' },
  radiation: { label: 'Radyasyon dozu', unit: 'mSv', color: '#facc15', demoRange: 'Görev bağlamında değerlendirilir' },
  boneDensity: { label: 'Kemik yoğunluğu', unit: 'T-score', color: '#a3e635', demoRange: 'Periyodik ölçüm' },
}

const metricTypes = Object.keys(metricConfig) as MetricType[]

function createDemoMeasurements(): Measurement[] {
  const now = Date.now()
  const make = (type: MetricType, value: number, hoursAgo: number, extra: Partial<Measurement> = {}): Measurement => ({
    id: `${type}-${hoursAgo}`,
    type,
    value,
    unit: metricConfig[type].unit,
    timestamp: new Date(now - hoursAgo * 60 * 60 * 1000).toISOString(),
    source: 'Simülasyon',
    ...extra,
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
  return new Date(value).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function App() {
  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return createDemoMeasurements()
      const parsed: unknown = JSON.parse(saved)
      return Array.isArray(parsed) ? (parsed as Measurement[]) : createDemoMeasurements()
    } catch {
      return createDemoMeasurements()
    }
  })
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('heartRate')
  const [formType, setFormType] = useState<MetricType>('heartRate')
  const [formValue, setFormValue] = useState('')
  const [formDiastolic, setFormDiastolic] = useState('')
  const [formSource, setFormSource] = useState<SourceType>('Manuel')
  const [formMessage, setFormMessage] = useState('')
  const [voiceMessage, setVoiceMessage] = useState('Örnek: “Nabzım kaç?” veya “Nabız 72 kaydet.”')
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(measurements))
    } catch {
      setFormMessage('Tarayıcıda kayıt yapılamadı.')
    }
  }, [measurements])

  const latestByType = useMemo(() => {
    const latest: Partial<Record<MetricType, Measurement>> = {}
    for (const measurement of measurements) {
      const current = latest[measurement.type]
      if (!current || new Date(measurement.timestamp).getTime() > new Date(current.timestamp).getTime()) {
        latest[measurement.type] = measurement
      }
    }
    return latest
  }, [measurements])

  const chartData = useMemo(() => measurements
    .filter((measurement) => measurement.type === selectedMetric)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-12)
    .map((measurement) => ({
      time: new Date(measurement.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      value: measurement.value,
    })), [measurements, selectedMetric])

  const alerts = useMemo(() => {
    const found: { title: string; detail: string; level: 'notice' | 'warning' }[] = []
    const heartRate = latestByType.heartRate
    if (heartRate && (heartRate.value < 50 || heartRate.value > 100)) {
      found.push({ title: 'Nabız için kontrol bildirimi', detail: `Son kayıt ${heartRate.value} bpm. Demo eşiği dışında görünüyor.`, level: 'warning' })
    }
    const pressure = latestByType.bloodPressure
    if (pressure && (pressure.value >= 140 || (pressure.diastolic !== undefined && pressure.diastolic >= 90))) {
      found.push({ title: 'Tansiyon için kontrol bildirimi', detail: `Son kayıt ${pressure.value}/${pressure.diastolic ?? '—'} mmHg.`, level: 'warning' })
    }
    const sleep = latestByType.sleep
    if (sleep && sleep.value < 6) {
      found.push({ title: 'Uyku süresi düşük görünüyor', detail: `Son kayıt ${sleep.value} saat. Kişisel hedefle karşılaştırın.`, level: 'notice' })
    }
    const noise = latestByType.noise
    if (noise && noise.value >= 80) {
      found.push({ title: 'Yüksek gürültü kaydı', detail: `Son kayıt ${noise.value} dB. Maruziyet süresi de önemlidir.`, level: 'notice' })
    }
    if (found.length === 0) found.push({ title: 'Yeni kritik demo uyarısı yok', detail: 'Bu, tanı veya sağlık değerlendirmesi değildir.', level: 'notice' })
    return found
  }, [latestByType])

  function speak(text: string) {
    setVoiceMessage(text)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'tr-TR'
      window.speechSynthesis.speak(utterance)
    }
  }

  function runVoiceCommand(rawText: string) {
    const text = rawText.toLocaleLowerCase('tr-TR')
    const spokenMetric = metricTypes.find((type) => {
      const label = metricConfig[type].label.toLocaleLowerCase('tr-TR')
      return text.includes(label) || (type === 'heartRate' && text.includes('kalp')) || (type === 'temperature' && text.includes('ateş'))
    })

    if (text.includes('durum') || text.includes('özet')) {
      const pulse = latestByType.heartRate
      const sleep = latestByType.sleep
      speak(`Demo özeti. Nabız ${pulse ? `${pulse.value} bpm` : 'kaydedilmemiş'}. Uyku ${sleep ? `${sleep.value} saat` : 'kaydedilmemiş'}.`)
      return
    }
    if (text.includes('kaydet') || text.includes('ekle')) {
      if (!spokenMetric) { speak('Hangi ölçümü kaydedeceğimi anlayamadım.'); return }
      if (spokenMetric === 'bloodPressure') { speak('Sesli tansiyon kaydı henüz desteklenmiyor. Formdan iki değeri gir.'); return }
      const numberMatch = text.match(/-?\d+(?:[.,]\d+)?/)
      if (!numberMatch) { speak('Değeri anlayamadım. Örneğin: Nabız 72 kaydet.'); return }
      const value = Number(numberMatch[0].replace(',', '.'))
      if (!Number.isFinite(value)) { speak('Bu ölçüm değerini anlayamadım.'); return }
      setMeasurements((previous) => [...previous, {
        id: crypto.randomUUID(), type: spokenMetric, value, unit: metricConfig[spokenMetric].unit,
        timestamp: new Date().toISOString(), source: 'Manuel',
      }])
      speak(`${metricConfig[spokenMetric].label} ${value} olarak kaydedildi.`)
      return
    }
    if (spokenMetric) {
      const measurement = latestByType[spokenMetric]
      speak(measurement ? `Son ${metricConfig[spokenMetric].label.toLocaleLowerCase('tr-TR')} kaydın ${measurement.value} ${measurement.unit}.` : `${metricConfig[spokenMetric].label} için kayıt yok.`)
      return
    }
    speak('Komutu anlayamadım. Durum özeti isteyebilir veya nabız sorabilirsin.')
  }

  function startVoiceCommand() {
    const speechWindow = window as SpeechWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) { speak('Bu tarayıcı ses tanımayı desteklemiyor. Chrome ile deneyebilirsin.'); return }
    const recognition = new Recognition()
    recognition.lang = 'tr-TR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => runVoiceCommand(event.results[0]?.[0]?.transcript ?? '')
    recognition.onerror = () => { setIsListening(false); setVoiceMessage('Ses tanınamadı. Mikrofon iznini kontrol edip tekrar dene.') }
    recognition.onend = () => setIsListening(false)
    try { setIsListening(true); setVoiceMessage('Dinliyorum…'); recognition.start() }
    catch { setIsListening(false); setVoiceMessage('Ses tanıma başlatılamadı.') }
  }

  function addMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = Number(formValue)
    const diastolic = formType === 'bloodPressure' ? Number(formDiastolic) : undefined
    if (!Number.isFinite(value) || value <= 0) { setFormMessage('Geçerli ve sıfırdan büyük bir değer gir.'); return }
    if (formType === 'bloodPressure' && (!Number.isFinite(diastolic) || (diastolic ?? 0) <= 0)) {
      setFormMessage('Sistolik ve diyastolik değerleri ayrı ayrı gir.'); return
    }
    setMeasurements((previous) => [...previous, {
      id: crypto.randomUUID(), type: formType, value,
      ...(diastolic !== undefined ? { diastolic } : {}),
      unit: metricConfig[formType].unit, timestamp: new Date().toISOString(), source: formSource,
    }])
    setFormValue('')
    setFormDiastolic('')
    setFormMessage('Ölçüm kaydedildi.')
  }

  const cards: MetricType[] = ['heartRate', 'bloodPressure', 'glucose', 'temperature', 'sleep', 'radiation']

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">CW</div><div>
          <p className="eyebrow">CREWWELL · MISSION HEALTH</p>
          <h1>Mürettebat sağlık paneli</h1>
          <p className="subheading">Demo astronot · Görev günü 042</p>
        </div></div>
        <div className="top-actions">
          <span className="demo-badge">● DEMO VERİSİ</span>
          <button className="voice-button" type="button" onClick={startVoiceCommand} disabled={isListening}>
            {isListening ? '🎙 Dinliyorum…' : '🎙 Sesli komut'}
          </button>
        </div>
      </header>

      <div className="notice-banner"><strong>Prototip bilgilendirmesi:</strong> Örnek kayıtlar simülasyondur. Bu uygulama tanı koymaz ve tıbbi karar vermez.</div>

      <section className="metric-grid" aria-label="Son sağlık ölçümleri">
        {cards.map((type) => {
          const measurement = latestByType[type]
          const config = metricConfig[type]
          const displayValue = measurement ? type === 'bloodPressure' ? `${measurement.value}/${measurement.diastolic ?? '—'}` : measurement.value : '—'
          return <article className="metric-card" key={type}>
            <div className="metric-icon" style={{ color: config.color, backgroundColor: `${config.color}18` }}>
              {type === 'heartRate' ? '♡' : type === 'bloodPressure' ? '⌁' : type === 'glucose' ? '◉' : type === 'temperature' ? '♨' : type === 'sleep' ? '☾' : '✳'}
            </div>
            <div className="metric-info"><span className="metric-label">{config.label}</span>
              <strong>{displayValue}{measurement && <small> {config.unit}</small>}</strong>
              <span className="metric-source">{measurement?.source ?? 'Henüz ölçüm yok'}</span>
            </div>
          </article>
        })}
      </section>

      <section className="main-grid">
        <article className="panel chart-panel">
          <div className="panel-heading"><div><p className="eyebrow">ZAMAN İÇİNDE</p><h2>Ölçüm eğilimi</h2></div>
            <select className="select-control" value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value as MetricType)} aria-label="Grafik ölçüm türü">
              {metricTypes.map((type) => <option key={type} value={type}>{metricConfig[type].label}</option>)}
            </select>
          </div>
          <div className="chart-caption">{metricConfig[selectedMetric].label} · {metricConfig[selectedMetric].unit}</div>
          <div className="chart-wrap">{chartData.length > 0 ? <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metricConfig[selectedMetric].color} stopOpacity={0.28} />
              <stop offset="95%" stopColor={metricConfig[selectedMetric].color} stopOpacity={0} />
            </linearGradient></defs>
              <CartesianGrid stroke="#253247" strokeDasharray="4 4" />
              <XAxis dataKey="time" stroke="#718096" tickLine={false} />
              <YAxis stroke="#718096" tickLine={false} width={42} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#111c2c', border: '1px solid #29364b', borderRadius: 12, color: '#edf4ff' }} formatter={(value) => [`${value} ${metricConfig[selectedMetric].unit}`, metricConfig[selectedMetric].label]} />
              <Area type="monotone" dataKey="value" stroke={metricConfig[selectedMetric].color} strokeWidth={3} fill="url(#chartFill)" connectNulls />
            </AreaChart>
          </ResponsiveContainer> : <div className="empty-chart">Bu ölçüm için henüz kayıt yok.</div>}</div>
        </article>

        <article className="panel alerts-panel"><div className="panel-heading"><div><p className="eyebrow">OTOMATİK ÖZET</p><h2>Kontrol bildirimleri</h2></div><span className="count-badge">{alerts.length}</span></div>
          <div className="alert-list">{alerts.map((alert, index) => <div className={`alert-item ${alert.level}`} key={`${alert.title}-${index}`}>
            <span className="alert-symbol">{alert.level === 'warning' ? '!' : 'i'}</span><div><strong>{alert.title}</strong><p>{alert.detail}</p></div>
          </div>)}</div>
          <p className="small-note">Eşikler yalnızca prototip gösterimi içindir; klinik tavsiye değildir.</p>
        </article>
      </section>

      <section className="secondary-grid">
        <article className="panel"><div className="panel-heading"><div><p className="eyebrow">KAYIT GİRİŞİ</p><h2>Ölçüm ekle</h2></div></div>
          <form className="measurement-form" onSubmit={addMeasurement}>
            <label>Ölçüm türü<select className="select-control" value={formType} onChange={(event) => { setFormType(event.target.value as MetricType); setFormMessage('') }}>
              {metricTypes.map((type) => <option key={type} value={type}>{metricConfig[type].label}</option>)}
            </select></label>
            <label>{formType === 'bloodPressure' ? 'Büyük tansiyon (sistolik)' : 'Değer'}<div className="input-with-unit">
              <input type="number" step="any" min="0" value={formValue} onChange={(event) => setFormValue(event.target.value)} placeholder={formType === 'bloodPressure' ? '120' : 'Değer gir'} required />
              <span>{metricConfig[formType].unit}</span>
            </div></label>
            {formType === 'bloodPressure' && <label>Küçük tansiyon (diyastolik)<div className="input-with-unit">
              <input type="number" step="any" min="0" value={formDiastolic} onChange={(event) => setFormDiastolic(event.target.value)} placeholder="80" required /><span>mmHg</span>
            </div></label>}
            <label>Veri kaynağı<select className="select-control" value={formSource} onChange={(event) => setFormSource(event.target.value as SourceType)}>
              <option>Manuel</option><option>Cihaz</option><option>Simülasyon</option>
            </select></label>
            <button className="submit-button" type="submit">Ölçümü kaydet <span>→</span></button>
            {formMessage && <p className="form-message">{formMessage}</p>}
          </form>
        </article>

        <article className="panel assistant-panel"><div className="panel-heading"><div><p className="eyebrow">DESTEK</p><h2>Mürettebat asistanı</h2></div><span className="assistant-orb">✦</span></div>
          <p className="assistant-intro">Genel iyilik hâli için hatırlatmalar. Kişisel sağlık planının yerine geçmez.</p>
          <div className="recommendation"><span>01</span><div><strong>Beslenme kaydını gözden geçir</strong><p>Öğünlerini ve sıvı alımını görev planına göre kaydet.</p></div></div>
          <div className="recommendation"><span>02</span><div><strong>Egzersiz rutinini takip et</strong><p>Planlanan egzersiz ve dinlenme seanslarını işaretle.</p></div></div>
          <div className="recommendation"><span>03</span><div><strong>Uyku düzenini izle</strong><p>Uyku süresini ve öznel dinlenmişlik hissini not et.</p></div></div>
          <div className="voice-status" aria-live="polite"><span className={isListening ? 'listening-dot active' : 'listening-dot'} />{voiceMessage}</div>
        </article>
      </section>

      <section className="panel history-panel"><div className="panel-heading"><div><p className="eyebrow">SON KAYITLAR</p><h2>Ölçüm geçmişi</h2></div><span className="history-count">{measurements.length} kayıt</span></div>
        <div className="table-scroll"><table><thead><tr><th>Ölçüm</th><th>Değer</th><th>Zaman</th><th>Kaynak</th></tr></thead>
          <tbody>{[...measurements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10).map((measurement) => <tr key={measurement.id}>
            <td>{metricConfig[measurement.type].label}</td>
            <td>{measurement.type === 'bloodPressure' ? `${measurement.value}/${measurement.diastolic ?? '—'}` : measurement.value} {measurement.unit}</td>
            <td>{formatDateTime(measurement.timestamp)}</td>
            <td><span className={`source-tag ${measurement.source.toLowerCase()}`}>{measurement.source}</span></td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <footer className="footer">CrewWell prototype · Kayıtlar bu tarayıcıda saklanır · Demo, tıbbi cihaz değildir</footer>
    </main>
  )
}
