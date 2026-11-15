import { useEffect, useRef, useState, type FormEvent } from 'react'

type MedicationReminder = { id: string; name: string; time: string }
type DailyState = { date: string; water: number; meals: boolean[]; exerciseDone: boolean[]; routineDone: boolean[] }
type PlannerData = { medications: MedicationReminder[]; daily: DailyState }

const STORAGE_KEY = 'crewwell-wellness-planner-v1'
const mealLabels = ['Breakfast', 'Lunch', 'Dinner']
const exerciseOptions = [
  'Gentle mobility or stretching (if permitted by your mission plan)',
  'Scheduled resistance exercise (follow your approved plan)',
  'Recovery break and light movement (as cleared for you)',
]
const routineOptions = [
  { title: 'Hydration check-in', time: '09:00' },
  { title: 'Nutrition check-in', time: '12:00' },
  { title: 'Movement or recovery check-in', time: '16:00' },
]

function localDateKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function freshDaily(): DailyState {
  return { date: localDateKey(), water: 0, meals: mealLabels.map(() => false), exerciseDone: exerciseOptions.map(() => false), routineDone: routineOptions.map(() => false) }
}

function loadPlanner(): PlannerData {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!parsed || typeof parsed !== 'object') return { medications: [], daily: freshDaily() }
    const stored = parsed as Partial<PlannerData>
    const medications = Array.isArray(stored.medications)
      ? stored.medications.filter((item): item is MedicationReminder => Boolean(item) && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.time === 'string' && /^\d{2}:\d{2}$/.test(item.time))
      : []
    const daily = stored.daily
    if (!daily || daily.date !== localDateKey()) return { medications, daily: freshDaily() }
    return {
      medications,
      daily: {
        date: daily.date,
        water: Number.isInteger(daily.water) && daily.water >= 0 ? daily.water : 0,
        meals: Array.isArray(daily.meals) ? mealLabels.map((_, index) => daily.meals[index] === true) : mealLabels.map(() => false),
        exerciseDone: Array.isArray(daily.exerciseDone) ? exerciseOptions.map((_, index) => daily.exerciseDone[index] === true) : exerciseOptions.map(() => false),
        routineDone: Array.isArray(daily.routineDone) ? routineOptions.map((_, index) => daily.routineDone[index] === true) : routineOptions.map(() => false),
      },
    }
  } catch { return { medications: [], daily: freshDaily() } }
}

export default function WellnessPlanner() {
  const [open, setOpen] = useState(false)
  const [planner, setPlanner] = useState<PlannerData>(loadPlanner)
  const [medicationName, setMedicationName] = useState('')
  const [medicationTime, setMedicationTime] = useState('08:00')
  const [status, setStatus] = useState('Reminders are shown while this dashboard is open.')
  const [now, setNow] = useState(new Date())
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(planner)) }
    catch { setStatus('Could not save this planner in browser storage.') }
  }, [planner])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (planner.daily.date !== localDateKey()) {
      setPlanner((previous) => ({ ...previous, daily: freshDaily() }))
      notifiedRef.current.clear()
    }
  }, [planner.daily.date, now])

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const today = localDateKey()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    planner.medications.forEach((reminder) => {
      const key = `${today}:${reminder.id}`
      if (reminder.time === currentTime && !notifiedRef.current.has(key)) {
        new Notification('CrewWell medication reminder', { body: `Your scheduled reminder: ${reminder.name}. Follow your prescribed instructions.` })
        notifiedRef.current.add(key)
      }
    })
  }, [now, planner.medications])

  function updateDaily(update: (daily: DailyState) => DailyState) {
    setPlanner((previous) => ({ ...previous, daily: update(previous.daily) }))
  }

  function addMedicationReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = medicationName.trim()
    if (!name) return
    setPlanner((previous) => ({ ...previous, medications: [...previous.medications, { id: crypto.randomUUID(), name: name.slice(0, 60), time: medicationTime }] }))
    setMedicationName('')
    setStatus('Reminder added. Use only a schedule provided by your care team.')
  }

  function removeMedicationReminder(id: string) {
    setPlanner((previous) => ({ ...previous, medications: previous.medications.filter((item) => item.id !== id) }))
  }

  async function enableNotifications() {
    if (!('Notification' in window)) {
      setStatus('This browser does not support desktop notifications. In-app reminders remain available while the dashboard is open.')
      return
    }
    const permission = await Notification.requestPermission()
    setStatus(permission === 'granted'
      ? 'Desktop reminders enabled. They work only while this dashboard is open; follow your prescribed instructions.'
      : 'Notifications were not enabled. In-app reminders remain available while the dashboard is open.')
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const dueMedications = planner.medications.filter((item) => item.time <= currentTime)

  return <aside className={`wellness-widget ${open ? 'is-open' : ''}`} aria-label="Mission wellness planner">
    <button className="wellness-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true">✦</span> {open ? 'Close wellness planner' : 'Mission wellness planner'}
    </button>
    {open && <section className="wellness-panel">
      <p className="eyebrow">DAILY SUPPORT · DEMO</p>
      <h2>Mission wellness planner</h2>
      <p className="wellness-disclaimer">Planning prompts only. Follow your official mission, nutrition, exercise, and medication instructions. CrewWell does not prescribe or change care.</p>

      <section className="wellness-section">
        <h3>Daily reminders</h3>
        <div className="wellness-checklist">{routineOptions.map((task, index) => <label key={task.title} className="wellness-check"><input type="checkbox" checked={planner.daily.routineDone[index]} onChange={() => updateDaily((daily) => ({ ...daily, routineDone: daily.routineDone.map((done, taskIndex) => taskIndex === index ? !done : done) }))} /><span><strong>{task.title}</strong><small>Suggested check-in time: {task.time}</small></span></label>)}</div>
        <p className="wellness-hint">Check-ins are shown in this planner while the page is open; they are not mission alerts.</p>
      </section>

      <section className="wellness-section">
        <h3>Movement and recovery</h3>
        <div className="wellness-checklist">{exerciseOptions.map((suggestion, index) => <label key={suggestion} className="wellness-check"><input type="checkbox" checked={planner.daily.exerciseDone[index]} onChange={() => updateDaily((daily) => ({ ...daily, exerciseDone: daily.exerciseDone.map((done, taskIndex) => taskIndex === index ? !done : done) }))} /><span>{suggestion}</span></label>)}</div>
        <p className="wellness-hint">Suggestions are generic prompts, not individualized exercise guidance. Only do activities approved for you.</p>
      </section>

      <section className="wellness-section">
        <h3>Nutrition and hydration tracker</h3>
        <div className="wellness-checklist">{mealLabels.map((meal, index) => <label key={meal} className="wellness-check"><input type="checkbox" checked={planner.daily.meals[index]} onChange={() => updateDaily((daily) => ({ ...daily, meals: daily.meals.map((done, mealIndex) => mealIndex === index ? !done : done) }))} /><span>{meal} check-in</span></label>)}</div>
        <div className="water-counter"><span>Water servings logged: <strong>{planner.daily.water}</strong></span><div><button type="button" aria-label="Remove one water serving" onClick={() => updateDaily((daily) => ({ ...daily, water: Math.max(0, daily.water - 1) }))}>−</button><button type="button" aria-label="Log one water serving" onClick={() => updateDaily((daily) => ({ ...daily, water: daily.water + 1 }))}>+</button></div></div>
        <p className="wellness-hint">This records check-ins only; it does not set dietary or fluid targets.</p>
      </section>

      <section className="wellness-section">
        <h3>Medication reminders</h3>
        <form className="medication-form" onSubmit={addMedicationReminder}><label>Reminder label<input value={medicationName} maxLength={60} onChange={(event) => setMedicationName(event.target.value)} placeholder="Enter a private label" required /></label><label>Reminder time<input type="time" value={medicationTime} onChange={(event) => setMedicationTime(event.target.value)} required /></label><button className="planner-action" type="submit">Add reminder</button></form>
        <p className="wellness-hint">Enter only your own schedule from your care team. No dose or medication advice is provided.</p>
        {planner.medications.length > 0 && <ul className="medication-list">{planner.medications.map((reminder) => <li key={reminder.id}><span>{reminder.time} · {reminder.name}</span><button type="button" aria-label={`Remove reminder ${reminder.name}`} onClick={() => removeMedicationReminder(reminder.id)}>Remove</button></li>)}</ul>}
        {dueMedications.length > 0 && <p className="medication-due" role="status">Reminder due: {dueMedications.map((item) => item.name).join(', ')}. Follow your prescribed instructions.</p>}
        <button className="planner-action secondary-action" type="button" onClick={enableNotifications}>Enable browser notifications</button>
      </section>
      <p className="wellness-status" role="status">{status}</p>
      <p className="wellness-hint">Planner settings are stored in this browser and are not encrypted. Reminders are not guaranteed if the browser or dashboard is closed.</p>
    </section>}
  </aside>
}

