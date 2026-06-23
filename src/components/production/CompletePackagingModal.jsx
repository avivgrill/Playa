import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { input, btn, label } from '../../styles/common'

const UNITS = ['pieces', 'lbs', 'kg', 'oz', 'g', 'cases']

export default function CompletePackagingModal({ order, onClose, onConfirmed }) {
  const [count, setCount] = useState('')
  const [unit, setUnit] = useState('pieces')
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    if (!count || Number(count) <= 0 || saving) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'packagingOrders', order.id), {
        status: 'complete',
        finalCount: Number(count),
        finalUnit: unit,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      onConfirmed({ ...order, status: 'complete', finalCount: Number(count), finalUnit: unit })
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  return (
    <div>
      <p style={detail}><strong>Client:</strong> {order.clientName}</p>
      {order.candyName && <p style={detail}><strong>Candy:</strong> {order.candyName}</p>}

      <label style={label}>Final Count</label>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          style={{ ...input, flex: 1, marginBottom: 0 }}
          type="number" min="0" step="0.01"
          value={count} onChange={e => setCount(e.target.value)}
          placeholder="0" autoFocus
        />
        <select style={{ ...input, width: 120, marginBottom: 0 }} value={unit} onChange={e => setUnit(e.target.value)}>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button style={{ ...btn.secondary, flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
        <button
          style={{ ...btn.success, flex: 1 }}
          onClick={handleConfirm}
          disabled={saving || !count || Number(count) <= 0}
        >
          {saving ? 'Saving…' : '✓ Complete Packaging'}
        </button>
      </div>
    </div>
  )
}

const detail = { fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }
