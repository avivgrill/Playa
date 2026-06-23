import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import Modal from '../Modal'
import CreatePickupOrderModal from './CreatePickupOrderModal'
import ConfirmPickupModal from './ConfirmPickupModal'
import { formatDate } from '../../utils/format'

export default function PickupOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmOrder, setConfirmOrder] = useState(null)
  const [showComplete, setShowComplete] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const snap = await getDocs(collection(db, 'pickupOrders'))
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))
      setOrders(all)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const pending = orders.filter(o => o.status === 'pending')
  const completed = orders.filter(o => o.status === 'picked_up')

  function handleCreated(newOrder) {
    setOrders(prev => [newOrder, ...prev])
    setShowCreate(false)
  }

  function handleConfirmed(updated) {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
    setConfirmOrder(null)
  }

  return (
    <div style={wrap}>
      <div style={header}>
        <h2 style={title}>Pickup Orders</h2>
        <button style={createBtn} onClick={() => setShowCreate(true)}>
          + Create Pickup Order
        </button>
      </div>

      {loading ? (
        <p style={muted}>Loading…</p>
      ) : pending.length === 0 && completed.length === 0 ? (
        <p style={muted}>No pickup orders yet.</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={section}>
              {pending.map(order => (
                <PickupRow key={order.id} order={order} onPickup={() => setConfirmOrder(order)} />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <>
              <p style={sectionLabel}>Completed</p>
              <div style={section}>
                {completed.slice(0, 10).map(order => (
                  <PickupRow key={order.id} order={order} done />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showCreate && (
        <Modal title="Create Pickup Order" onClose={() => setShowCreate(false)} maxWidth={520}>
          <CreatePickupOrderModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
        </Modal>
      )}

      {confirmOrder && (
        <Modal title="Confirm Pickup" onClose={() => setConfirmOrder(null)} maxWidth={420}>
          <ConfirmPickupModal
            order={confirmOrder}
            onClose={() => setConfirmOrder(null)}
            onConfirmed={handleConfirmed}
          />
        </Modal>
      )}
    </div>
  )
}

function PickupRow({ order, onPickup, done }) {
  return (
    <div style={row}>
      <div style={rowLeft}>
        <div style={productName}>
          {order.productName}
          {order.batchNumber && <span style={batchTag}>{order.batchNumber}</span>}
        </div>
        <div style={rowMeta}>
          <span>{order.quantityAssigned} {order.unit}</span>
          {order.packagingFormat && <span>· {order.packagingFormat}</span>}
        </div>
        <div style={{ ...rowMeta, color: '#374151', fontWeight: 500 }}>📦 {order.clientName}</div>
        {done && order.pickupDate && (
          <div style={{ ...rowMeta, color: '#16a34a' }}>
            Picked up {order.pickupDate}{order.pickedUpBy ? ` by ${order.pickedUpBy}` : ''}
          </div>
        )}
      </div>
      {!done && (
        <button style={pickupBtn} onClick={onPickup}>
          Pickup →
        </button>
      )}
      {done && <span style={doneBadge}>✓ Done</span>}
    </div>
  )
}

const wrap = { marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb' }
const header = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }
const title = { fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }
const createBtn = { background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 0.875rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }
const section = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '1rem' }
const sectionLabel = { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', margin: '0 0 0.4rem' }
const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid #f3f4f6', gap: '0.75rem' }
const rowLeft = { flex: 1, minWidth: 0 }
const productName = { fontSize: '0.9rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }
const batchTag = { fontSize: '0.7rem', fontWeight: 700, background: '#f3f4f6', color: '#6b7280', borderRadius: 4, padding: '0.1rem 0.4rem', letterSpacing: '0.04em' }
const rowMeta = { fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.15rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }
const pickupBtn = { background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', borderRadius: 7, padding: '0.4rem 0.875rem', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
const doneBadge = { fontSize: '0.78rem', fontWeight: 600, color: '#16a34a', whiteSpace: 'nowrap' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
