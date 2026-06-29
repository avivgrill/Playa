import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { formatDate } from '../utils/format'
import { card } from '../styles/common'
import Modal from '../components/Modal'
import BatchDetail from './operations/BatchDetail'

const TYPE_LABELS = {
  work_order: 'Work Order',
  packaging: 'Packaging',
  pickup: 'Pickup',
}

const TYPE_COLORS = {
  work_order: '#1d4ed8',
  packaging: '#7e22ce',
  pickup: '#16a34a',
}

const STATUS_LABELS = {
  backlog: 'Backlog', scheduled: 'Backlog', queued: 'In Queue',
  in_production: 'In Progress', hold: 'Hold',
  complete: 'Complete', packaged: 'Complete', released: 'Complete',
  wrapping: 'Being Wrapped',
  picked_up: 'Picked Up', pending: 'Pending',
}

const FORMAT_LABELS = {
  bulk_packaged: 'Bulk Packaged',
  flow_wrapped: 'Flow Wrapped',
  flow_wrap_boxed: 'Flow Wrap + Boxed',
  flow_wrap_boxed_display: 'Flow Wrap + Boxed + Display Box',
}

export default function ProductionLog() {
  const [allOrders, setAllOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('')
  const [lotFilter, setLotFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [viewWorkOrder, setViewWorkOrder] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [batchSnap, pkgSnap, pickupSnap] = await Promise.all([
        getDocs(collection(db, 'productionBatches')),
        getDocs(collection(db, 'packagingOrders')),
        getDocs(collection(db, 'pickupOrders')),
      ])

      const workOrders = batchSnap.docs.map(d => ({
        id: d.id,
        _type: 'work_order',
        title: d.data().productName || '—',
        number: d.data().batchNumber || '',
        client: '',
        status: d.data().status || 'backlog',
        date: d.data().createdAt,
        ingredients: [],
        raw: d.data(),
      }))

      const packaging = pkgSnap.docs.map(d => ({
        id: d.id,
        _type: 'packaging',
        title: d.data().candyName || '—',
        number: d.data().batchNumber || '',
        client: d.data().clientName || '',
        status: d.data().status || 'backlog',
        date: d.data().createdAt,
        ingredients: [],
        raw: d.data(),
      }))

      const pickups = pickupSnap.docs.map(d => ({
        id: d.id,
        _type: 'pickup',
        title: d.data().productName || '—',
        number: d.data().batchNumber || '',
        client: d.data().clientName || '',
        status: d.data().status || 'pending',
        date: d.data().createdAt,
        ingredients: [],
        raw: d.data(),
      }))

      const combined = [...workOrders, ...packaging, ...pickups].sort(
        (a, b) => (b.date?.toDate?.() || 0) - (a.date?.toDate?.() || 0)
      )
      setAllOrders(combined)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // Backfill ingredient lot numbers for work orders
  useEffect(() => {
    if (allOrders.length === 0) return
    if (!allOrders.some(o => o._type === 'work_order')) return
    getDocs(collection(db, 'ingredientUsage')).then(snap => {
      const usageByBatch = {}
      snap.docs.forEach(d => {
        const u = d.data()
        if (!usageByBatch[u.batchId]) usageByBatch[u.batchId] = []
        if (u.internalLotNumber) usageByBatch[u.batchId].push(u.internalLotNumber)
        if (u.supplierLotNumber) usageByBatch[u.batchId].push(u.supplierLotNumber)
      })
      setAllOrders(prev => prev.map(o =>
        o._type === 'work_order' ? { ...o, ingredients: usageByBatch[o.id] || [] } : o
      ))
    }).catch(() => {})
  }, [allOrders.length])

  // Unique sorted client list derived from loaded orders
  const clientOptions = useMemo(() => {
    const names = new Set(allOrders.map(o => o.client).filter(Boolean))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [allOrders])

  const filtered = allOrders.filter(o => {
    if (typeFilter !== 'all' && o._type !== typeFilter) return false

    if (clientFilter && o.client !== clientFilter) return false

    if (lotFilter.trim()) {
      const q = lotFilter.toLowerCase()
      const matchesNumber = o.number.toLowerCase().includes(q)
      const matchesIngredient = o.ingredients.some(i => i.toLowerCase().includes(q))
      if (!matchesNumber && !matchesIngredient) return false
    }

    if (dateFrom || dateTo) {
      const d = o.date?.toDate?.()
      if (!d) return false
      const dayMs = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
      if (dateFrom) {
        const [y, m, dy] = dateFrom.split('-').map(Number)
        if (dayMs < y * 10000 + m * 100 + dy) return false
      }
      if (dateTo) {
        const [y, m, dy] = dateTo.split('-').map(Number)
        if (dayMs > y * 10000 + m * 100 + dy) return false
      }
    }

    return true
  })

  const hasFilters = typeFilter !== 'all' || clientFilter || lotFilter.trim() || dateFrom || dateTo

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>Production Log</h1>
        {hasFilters && (
          <button style={clearBtn} onClick={() => { setTypeFilter('all'); setClientFilter(''); setLotFilter(''); setDateFrom(''); setDateTo('') }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {[['all', 'All Types'], ['work_order', 'Work Orders'], ['packaging', 'Packaging'], ['pickup', 'Pickups']].map(([v, lbl]) => (
          <button key={v}
            style={{ ...filterBtn, background: typeFilter === v ? '#1d4ed8' : '#fff', color: typeFilter === v ? '#fff' : '#374151' }}
            onClick={() => setTypeFilter(v)}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Secondary filters */}
      <div style={filterRow}>
        <select
          style={selectInput}
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
        >
          <option value="">All clients</option>
          {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <input
          style={searchInput}
          placeholder="Filter by lot / batch #…"
          value={lotFilter}
          onChange={e => setLotFilter(e.target.value)}
        />

        <input
          style={searchInput}
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          title="From date"
          placeholder="From"
        />
        <input
          style={searchInput}
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          title="To date"
          placeholder="To"
        />
      </div>

      {loading && <p style={muted}>Loading…</p>}
      {!loading && filtered.length === 0 && <p style={muted}>No orders match your filters.</p>}

      {filtered.map(order => (
        <div key={`${order._type}_${order.id}`}
          style={{ ...card, cursor: order._type === 'work_order' ? 'pointer' : 'default', borderLeft: `4px solid ${TYPE_COLORS[order._type]}` }}
          onClick={() => order._type === 'work_order' && setViewWorkOrder(order.id)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ ...typeBadge, background: TYPE_COLORS[order._type] + '18', color: TYPE_COLORS[order._type] }}>
                  {TYPE_LABELS[order._type]}
                </span>
                {order.number && <span style={batchTag}>{order.number}</span>}
              </div>
              <div style={{ fontWeight: 700, color: '#111827', marginTop: '0.2rem' }}>{order.title}</div>
              {order.client && <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.1rem' }}>📦 {order.client}</div>}
              {order._type === 'work_order' && order.raw.plannedDate && (
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Planned: {formatDate(order.raw.plannedDate)}</div>
              )}
              {order._type === 'packaging' && order.raw.packagingFormat && (
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{FORMAT_LABELS[order.raw.packagingFormat] || order.raw.packagingFormat}</div>
              )}
              {order._type === 'pickup' && order.raw.pickupDate && (
                <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                  Picked up {order.raw.pickupDate}{order.raw.pickedUpBy ? ` by ${order.raw.pickedUpBy}` : ''}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280' }}>
                {STATUS_LABELS[order.status] || order.status}
              </span>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                {order.date ? formatDate(order.date) : ''}
              </div>
            </div>
          </div>
        </div>
      ))}

      {viewWorkOrder && (
        <Modal onClose={() => setViewWorkOrder(null)} maxWidth={720}>
          <BatchDetail id={viewWorkOrder} onClose={() => setViewWorkOrder(null)} />
        </Modal>
      )}
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }
const filterRow = { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }
const filterBtn = { padding: '0.35rem 0.65rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }
const selectInput = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 7, fontSize: '0.875rem', minWidth: 160, background: '#fff', cursor: 'pointer' }
const searchInput = { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 7, fontSize: '0.875rem', minWidth: 140 }
const typeBadge = { fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 10 }
const batchTag = { fontSize: '0.7rem', fontWeight: 700, background: '#f3f4f6', color: '#6b7280', borderRadius: 4, padding: '0.1rem 0.4rem', letterSpacing: '0.04em' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const clearBtn = { background: 'transparent', border: 'none', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }
