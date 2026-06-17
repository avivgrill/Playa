import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { card, badge, btn } from '../../styles/common'

export default function CustomerList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    getDocs(query(collection(db, 'customers'), orderBy('customerName', 'asc')))
      .then(snap => {
        setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'all' ? customers : customers.filter(c => c.status === filter)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>Customers</h1>
        <button style={btn.primary} onClick={() => navigate('/operations/customers/new')}>+ New Customer</button>
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
        <p style={muted}>No customers found.</p>
      )}

      {filtered.map(c => (
        <div
          key={c.id}
          style={{ ...card, cursor: 'pointer' }}
          onClick={() => navigate(`/operations/customers/${c.id}`)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#111827', marginBottom: '0.2rem' }}>{c.customerName}</div>
              {c.contactName && <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{c.contactName}</div>}
              {c.email && <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{c.email}</div>}
            </div>
            <span style={badge[c.status] || badge.active}>{c.status}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const filterBtn = {
  padding: '0.4rem 0.875rem', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer',
}
