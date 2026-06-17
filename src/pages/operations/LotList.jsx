import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDate } from '../../utils/format'
import { card, badge, btn } from '../../styles/common'

const STATUS_COLORS = { available: '#16a34a', hold: '#d97706', used: '#9ca3af', recalled: '#dc2626' }

export default function LotList() {
  const navigate = useNavigate()
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('available')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getDocs(query(collection(db, 'ingredientLots'), orderBy('createdAt', 'desc')))
      .then(snap => {
        setLots(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  const filtered = lots
    .filter(l => filter === 'all' || l.status === filter)
    .filter(l => {
      if (!search.trim()) return true
      const s = search.toLowerCase()
      return (
        l.ingredientName?.toLowerCase().includes(s) ||
        l.internalLotNumber?.toLowerCase().includes(s) ||
        l.supplierLotNumber?.toLowerCase().includes(s)
      )
    })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>Ingredient Lots</h1>
        <button style={btn.primary} onClick={() => navigate('/operations/receive')}>Receive</button>
      </div>

      <input
        style={{ ...searchInput, marginBottom: '0.75rem' }}
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search ingredient, lot number…"
      />

      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['available', 'hold', 'recalled', 'used', 'all'].map(f => (
          <button key={f}
            style={{ ...filterBtn, background: filter === f ? '#1d4ed8' : '#fff', color: filter === f ? '#fff' : '#374151' }}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p style={muted}>Loading…</p>}
      {!loading && filtered.length === 0 && <p style={muted}>No lots found.</p>}

      {filtered.map(lot => (
        <div key={lot.id} style={{ ...card, cursor: 'pointer', borderLeft: `4px solid ${STATUS_COLORS[lot.status] || '#d1d5db'}` }}
          onClick={() => navigate(`/operations/lots/${lot.id}`)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#111827' }}>{lot.ingredientName}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.1rem' }}>{lot.internalLotNumber}</div>
              {lot.supplierLotNumber && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Supplier: {lot.supplierLotNumber}</div>}
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Received {formatDate(lot.receivedDate)}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 700, color: STATUS_COLORS[lot.status] || '#374151' }}>
                {lot.currentQuantity?.toLocaleString()} {lot.unit}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>of {lot.originalQuantity?.toLocaleString()}</div>
              <span style={{ ...badge[lot.status], marginTop: '0.25rem', display: 'inline-block' }}>{lot.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const filterBtn = { padding: '0.35rem 0.65rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }
const searchInput = {
  display: 'block', width: '100%', padding: '0.7rem 0.875rem',
  border: '1px solid #d1d5db', borderRadius: 8, fontSize: '1rem', background: '#fff',
}
