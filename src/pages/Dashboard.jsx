import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase/config'
import { todayString, formatDateTime } from '../utils/format'
import { card } from '../styles/common'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = todayString()
      const now = new Date()

      const [dailySnap, preOpSnap, openCASnap, recentInspSnap, recentCleanSnap] = await Promise.all([
        getDocs(query(collection(db, 'inspections'), where('type', '==', 'daily_facility'), where('date', '==', today))),
        getDocs(query(collection(db, 'inspections'), where('type', '==', 'pre_operational'), where('date', '==', today))),
        getDocs(query(collection(db, 'correctiveActions'), where('status', 'in', ['open', 'in_progress']))),
        getDocs(query(collection(db, 'inspections'), orderBy('completedAt', 'desc'), limit(4))),
        getDocs(query(collection(db, 'cleaningLogs'), orderBy('completedAt', 'desc'), limit(4))),
      ])

      const openCAs = openCASnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const overdueCAs = openCAs.filter(ca => ca.dueDate && ca.dueDate.toDate() < now)

      const recentActivity = [
        ...recentInspSnap.docs.map(d => ({
          id: d.id, type: 'inspection', ...d.data(),
          _sortDate: d.data().completedAt,
        })),
        ...recentCleanSnap.docs.map(d => ({
          id: d.id, type: 'cleaningLog', ...d.data(),
          _sortDate: d.data().completedAt,
        })),
      ].sort((a, b) => {
        const at = a._sortDate?.toDate?.() || new Date(0)
        const bt = b._sortDate?.toDate?.() || new Date(0)
        return bt - at
      }).slice(0, 6)

      setData({
        dailyDone: !dailySnap.empty,
        preOpDone: !preOpSnap.empty,
        openCACount: openCAs.length,
        overdueCACount: overdueCAs.length,
        recentActivity,
      })
      setLoading(false)
    }
    load()
  }, [])

  const actions = [
    { label: 'Start Daily Facility Inspection', path: '/inspections/new/daily_facility', color: '#1d4ed8' },
    { label: 'Start Pre-Op Inspection', path: '/inspections/new/pre_operational', color: '#1d4ed8' },
    { label: 'New Cleaning Log', path: '/cleaning/new', color: '#0891b2' },
    { label: 'View Open Corrective Actions', path: '/corrective-actions', color: '#7c3aed' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#111827' }}>Dashboard</h1>

      {/* Primary Actions */}
      <div style={grid2}>
        {actions.map(a => (
          <button key={a.path} style={{ ...actionBtn, background: a.color }} onClick={() => navigate(a.path)}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Today's Tasks */}
      <div style={card}>
        <h2 style={sectionTitle}>Today's Tasks</h2>
        {loading ? <p style={muted}>Loading…</p> : (
          <div>
            <TaskRow done={data.dailyDone} label="Daily Facility Inspection" path="/inspections/new/daily_facility" navigate={navigate} />
            <TaskRow done={data.preOpDone} label="Pre-Operational Inspection" path="/inspections/new/pre_operational" navigate={navigate} />
          </div>
        )}
      </div>

      {/* Open Issues */}
      {!loading && (data.openCACount > 0 || data.overdueCACount > 0) && (
        <div style={{ ...card, borderLeft: '4px solid #dc2626' }}>
          <h2 style={sectionTitle}>Open Issues</h2>
          {data.overdueCACount > 0 && (
            <IssueRow
              color="#dc2626"
              label={`${data.overdueCACount} overdue corrective action${data.overdueCACount > 1 ? 's' : ''}`}
              onClick={() => navigate('/corrective-actions')}
            />
          )}
          {data.openCACount > 0 && (
            <IssueRow
              color="#d97706"
              label={`${data.openCACount} open corrective action${data.openCACount > 1 ? 's' : ''}`}
              onClick={() => navigate('/corrective-actions')}
            />
          )}
        </div>
      )}

      {/* Recent Activity */}
      {!loading && data.recentActivity.length > 0 && (
        <div style={card}>
          <h2 style={sectionTitle}>Recent Activity</h2>
          {data.recentActivity.map(r => (
            <ActivityRow key={r.id} record={r} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({ done, label, path, navigate }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.1rem' }}>{done ? '✅' : '⏳'}</span>
        <span style={{ fontSize: '0.95rem', color: done ? '#6b7280' : '#111827' }}>{label}</span>
      </div>
      {!done && (
        <button style={startBtn} onClick={() => navigate(path)}>Start</button>
      )}
    </div>
  )
}

function IssueRow({ color, label, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
    >
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '0.9rem', color: '#374151' }}>{label}</span>
      <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: '0.8rem' }}>→</span>
    </div>
  )
}

function ActivityRow({ record, navigate }) {
  const typeLabel = record.type === 'inspection'
    ? record.type === 'daily_facility' ? 'Daily Inspection' : 'Pre-Op Inspection'
    : 'Cleaning Log'

  const label = record.type === 'inspection'
    ? (record.type === 'daily_facility' ? 'Daily Inspection' : 'Pre-Op Inspection')
    : `Cleaning — ${record.area || ''}`

  const path = record.type === 'inspection'
    ? `/inspections/${record.id}`
    : `/cleaning/${record.id}`

  const result = record.type === 'inspection' ? record.overallResult : record.verificationStatus

  return (
    <div
      onClick={() => navigate(path)}
      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
    >
      <span style={{ fontSize: '0.9rem', flex: 1, color: '#374151' }}>{label}</span>
      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
        {record.createdBy?.displayName || record.createdBy?.email || '—'}
      </span>
      {result && (
        <span style={{
          fontSize: '0.75rem', fontWeight: 600,
          color: result === 'pass' || result === 'verified' ? '#16a34a' : result === 'fail' ? '#dc2626' : '#d97706',
        }}>
          {result.toUpperCase()}
        </span>
      )}
    </div>
  )
}

const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }
const actionBtn = {
  padding: '1rem', color: '#fff', border: 'none', borderRadius: 10,
  fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
  textAlign: 'left', lineHeight: 1.3, minHeight: 72,
}
const sectionTitle = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const startBtn = {
  background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer',
}
