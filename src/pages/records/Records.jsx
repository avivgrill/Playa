import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDateTime } from '../../utils/format'
import { card, badge } from '../../styles/common'

export default function Records() {
  const navigate = useNavigate()
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    async function load() {
      const [inspSnap, cleanSnap, caSnap] = await Promise.all([
        getDocs(query(collection(db, 'inspections'), orderBy('completedAt', 'desc'))),
        getDocs(query(collection(db, 'cleaningLogs'), orderBy('completedAt', 'desc'))),
        getDocs(query(collection(db, 'correctiveActions'), orderBy('createdAt', 'desc'))),
      ])

      const records = [
        ...inspSnap.docs.map(d => ({ id: d.id, _type: 'inspection', _date: d.data().completedAt, ...d.data() })),
        ...cleanSnap.docs.map(d => ({ id: d.id, _type: 'cleaningLog', _date: d.data().completedAt, ...d.data() })),
        ...caSnap.docs.map(d => ({ id: d.id, _type: 'correctiveAction', _date: d.data().createdAt, ...d.data() })),
      ].sort((a, b) => {
        const at = a._date?.toDate?.() || new Date(0)
        const bt = b._date?.toDate?.() || new Date(0)
        return bt - at
      })

      setAll(records)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = all.filter(r => {
    if (typeFilter !== 'all' && r._type !== typeFilter) return false

    if (dateFrom) {
      const d = r._date?.toDate?.()
      if (!d || d < new Date(dateFrom)) return false
    }
    if (dateTo) {
      const d = r._date?.toDate?.()
      if (!d || d > new Date(dateTo + 'T23:59:59')) return false
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      const searchable = [
        r.area, r.equipment, r.chemical, r.sourceItemLabel,
        r.description, r.caNumber,
        r.createdBy?.displayName, r.createdBy?.email,
        r.type,
      ].filter(Boolean).join(' ').toLowerCase()
      if (!searchable.includes(q)) return false
    }

    return true
  })

  function exportCSV() {
    const rows = [['Type', 'Summary', 'User', 'Date', 'Status']]
    filtered.forEach(r => {
      rows.push([
        typeLabel(r),
        summary(r),
        r.createdBy?.email || '',
        r._date?.toDate?.()?.toLocaleDateString() || '',
        statusOf(r),
      ])
    })
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `playa-records-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Records</h1>
        <button
          style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer' }}
          onClick={exportCSV}
        >
          Export CSV
        </button>
      </div>

      <div style={{ ...card, padding: '0.875rem' }}>
        <input
          style={{ display: 'block', width: '100%', padding: '0.65rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem', marginBottom: '0.75rem' }}
          type="text"
          placeholder="Search records…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            style={filterSelect}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            <option value="inspection">Inspections</option>
            <option value="cleaningLog">Cleaning Logs</option>
            <option value="correctiveAction">Corrective Actions</option>
          </select>
          <input style={filterSelect} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" title="From date" />
          <input style={filterSelect} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" title="To date" />
          {(search || typeFilter !== 'all' || dateFrom || dateTo) && (
            <button
              style={{ background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', color: '#6b7280' }}
              onClick={() => { setSearch(''); setTypeFilter('all'); setDateFrom(''); setDateTo('') }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.75rem' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>

      {loading ? <p style={{ color: '#9ca3af' }}>Loading…</p> : filtered.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '2rem' }}>No records match your filters.</p>
      ) : filtered.map(r => (
        <div key={`${r._type}-${r.id}`} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(pathFor(r))}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                <span style={typePill(r._type)}>{typeLabel(r)}</span>
                {r.caNumber && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{r.caNumber}</span>}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {summary(r)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                {r.createdBy?.displayName || r.createdBy?.email} · {formatDateTime(r._date)}
              </div>
            </div>
            <span style={badge[statusOf(r)] || badge.open}>{statusOf(r)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function typeLabel(r) {
  if (r._type === 'inspection') return r.type === 'daily_facility' ? 'Daily Inspection' : 'Pre-Op Inspection'
  if (r._type === 'cleaningLog') return 'Cleaning Log'
  return 'Corrective Action'
}

function summary(r) {
  if (r._type === 'inspection') return r.type === 'daily_facility' ? 'Daily Facility Inspection' : 'Pre-Operational Inspection'
  if (r._type === 'cleaningLog') return `${r.area} — ${r.equipment}`
  return r.sourceItemLabel || r.description || 'Corrective Action'
}

function statusOf(r) {
  if (r._type === 'inspection') return r.overallResult || 'completed'
  if (r._type === 'cleaningLog') return r.verificationStatus || 'pending'
  return r.status || 'open'
}

function pathFor(r) {
  if (r._type === 'inspection') return `/inspections/${r.id}`
  if (r._type === 'cleaningLog') return `/cleaning/${r.id}`
  return `/corrective-actions/${r.id}`
}

function typePill(type) {
  const colors = { inspection: ['#dbeafe', '#1d4ed8'], cleaningLog: ['#d1fae5', '#065f46'], correctiveAction: ['#fef9c3', '#92400e'] }
  const [bg, color] = colors[type] || ['#f3f4f6', '#374151']
  return { background: bg, color, fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99 }
}

const filterSelect = {
  padding: '0.4rem 0.75rem', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: '0.875rem', background: '#fff',
  color: '#374151',
}
