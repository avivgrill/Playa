import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDate } from '../../utils/format'
import { card, badge, btn } from '../../styles/common'

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  in_production: 'In Production',
  complete: 'Complete',
  hold: 'Hold',
  released: 'Released',
}

export default function BatchList() {
  const navigate = useNavigate()
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    getDocs(query(collection(db, 'productionBatches'), orderBy('createdAt', 'desc')))
      .then(snap => {
        setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'all'
    ? batches
    : batches.filter(b => ['scheduled', 'in_production'].includes(b.status))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>Production Batches</h1>
        <button style={btn.primary} onClick={() => navigate('/operations/batches/new')}>+ New Batch</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['active', 'all'].map(f => (
          <button
            key={f}
            style={{ ...filterBtn, background: filter === f ? '#1d4ed8' : '#fff', color: filter === f ? '#fff' : '#374151' }}
            onClick={() => setFilter(f)}
          >
            {f === 'active' ? 'Active' : 'All'}
          </button>
        ))}
      </div>

      {loading && <p style={muted}>Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p style={muted}>No batches found.</p>
      )}

      {filtered.map(b => (
        <div
          key={b.id}
          style={{ ...card, cursor: 'pointer', borderLeft: `4px solid ${statusColor(b.status)}` }}
          onClick={() => navigate(`/operations/batches/${b.id}`)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.85rem', marginBottom: '0.15rem' }}>
                {b.batchNumber}
              </div>
              <div style={{ fontWeight: 600, color: '#374151' }}>{b.productName}</div>
              {b.sopName && <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>SOP: {b.sopName}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={badge[b.status] || badge.pending}>
                {STATUS_LABELS[b.status] || b.status}
              </span>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                {formatDate(b.productionDate)}
              </div>
            </div>
          </div>
          {b.quantityProduced > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.3rem' }}>
              {b.quantityProduced.toLocaleString()} {b.unit}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function statusColor(status) {
  const colors = { scheduled: '#d97706', in_production: '#1d4ed8', complete: '#7e22ce', hold: '#dc2626', released: '#16a34a' }
  return colors[status] || '#d1d5db'
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const filterBtn = {
  padding: '0.4rem 0.875rem', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer',
}
