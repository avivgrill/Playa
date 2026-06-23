import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { input, btn, label } from '../../styles/common'

function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ConfirmPickupModal({ order, onClose, onConfirmed }) {
  const [pickupDate, setPickupDate] = useState(todayLocal())
  const [pickedUpBy, setPickedUpBy] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    if (!pickedUpBy.trim() || saving) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'pickupOrders', order.id), {
        status: 'picked_up',
        pickupDate,
        pickedUpBy: pickedUpBy.trim(),
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      onConfirmed({ ...order, status: 'picked_up', pickupDate, pickedUpBy: pickedUpBy.trim() })
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  return (
    <div>
      <div style={summary}>
        <div style={summaryRow}><span style={summaryLabel}>Product</span> {order.productName}{order.batchNumber ? ` — ${order.batchNumber}` : ''}</div>
        <div style={summaryRow}><span style={summaryLabel}>Client</span> {order.clientName}</div>
        <div style={summaryRow}><span style={summaryLabel}>Qty</span> {order.quantityAssigned} {order.unit}</div>
      </div>

      <label style={label}>Pickup Date</label>
      <input style={input} type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />

      <label style={label}>Picked Up By *</label>
      <input
        style={input}
        value={pickedUpBy} onChange={e => setPickedUpBy(e.target.value)}
        placeholder="Name of person picking up"
        autoFocus
      />

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button style={{ ...btn.secondary, flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
        <button
          style={{ ...btn.success, flex: 1 }}
          onClick={handleConfirm}
          disabled={saving || !pickedUpBy.trim()}
        >
          {saving ? 'Saving…' : '✓ Confirm Pickup'}
        </button>
      </div>
    </div>
  )
}

const summary = { background: '#f9fafb', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', border: '1px solid #e5e7eb' }
const summaryRow = { fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem', display: 'flex', gap: '0.5rem' }
const summaryLabel = { color: '#9ca3af', fontWeight: 600, minWidth: 60 }
