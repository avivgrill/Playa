import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDateTime } from '../../utils/format'
import { card, badge } from '../../styles/common'

export default function InspectionHistory() {
  const navigate = useNavigate()
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getDocs(query(collection(db, 'inspections'), orderBy('completedAt', 'desc'), limit(100)))
      .then(snap => {
        setInspections(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'all' ? inspections : inspections.filter(i => i.type === filter)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Inspection History</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={navigate === filter ? filterBtnActive : filterBtn(filter === 'all')} onClick={() => setFilter('all')}>All</button>
          <button style={filterBtn(filter === 'daily_facility')} onClick={() => setFilter('daily_facility')}>Daily</button>
          <button style={filterBtn(filter === 'pre_operational')} onClick={() => setFilter('pre_operational')}>Pre-Op</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', fontSize: '0.875rem', cursor: 'pointer' }}
          onClick={() => navigate('/inspections/new/daily_facility')}>
          + Daily Inspection
        </button>
        <button style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', fontSize: '0.875rem', cursor: 'pointer' }}
          onClick={() => navigate('/inspections/new/pre_operational')}>
          + Pre-Op Inspection
        </button>
      </div>

      {loading ? <p style={{ color: '#9ca3af' }}>Loading…</p> : filtered.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '2rem' }}>No inspections found.</p>
      ) : filtered.map(insp => (
        <div key={insp.id} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(`/inspections/${insp.id}`)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                {insp.type === 'daily_facility' ? 'Daily Facility Inspection' : 'Pre-Operational Inspection'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {insp.createdBy?.displayName || insp.createdBy?.email} · {formatDateTime(insp.completedAt)}
              </div>
              {insp.failedItemCount > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.2rem' }}>
                  {insp.failedItemCount} item{insp.failedItemCount > 1 ? 's' : ''} failed
                </div>
              )}
            </div>
            <span style={insp.overallResult === 'pass' ? badge.pass : badge.fail}>
              {insp.overallResult?.toUpperCase()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

const filterBtn = (active) => ({
  background: active ? '#1d4ed8' : '#fff',
  color: active ? '#fff' : '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '0.35rem 0.75rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
})
const filterBtnActive = filterBtn(true)
