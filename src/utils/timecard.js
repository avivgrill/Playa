export function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun, 1=Mon…
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function weekLabel(weekStart) {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(weekStart)} – ${fmt(end)}, ${weekStart.getFullYear()}`
}

export function weekStartStr(date) {
  // YYYY-MM-DD of the Monday
  return date.toISOString().split('T')[0]
}

// Returns the last `count` completed week-start dates (Mondays), newest first
export function recentWeeks(count = 6) {
  const weeks = []
  const thisWeek = getWeekStart()
  for (let i = 1; i <= count; i++) {
    const d = new Date(thisWeek)
    d.setDate(d.getDate() - i * 7)
    weeks.push(d)
  }
  return weeks
}

function parseTime(t) {
  if (!t || !t.includes(':')) return null
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

export function punchHours(inTime, outTime) {
  const inMin = parseTime(inTime)
  const outMin = parseTime(outTime)
  if (inMin === null || outMin === null || outMin <= inMin) return 0
  return (outMin - inMin) / 60
}

export function totalHours(punches) {
  return punches.reduce((sum, p) => sum + punchHours(p.in, p.out), 0)
}

export function formatHours(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
