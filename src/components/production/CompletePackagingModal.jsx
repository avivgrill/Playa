import { useState } from 'react'
import { doc, updateDoc, addDoc, collection, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { getNextLotNumber } from '../../utils/lotNumber'
import { input, btn, label } from '../../styles/common'

const UNITS = ['pieces', 'lbs', 'kg', 'oz', 'g', 'cases']

const FORMAT_LABELS = {
  bulk_packaged: 'Bulk Packaged',
  flow_wrapped: 'Flow Wrapped',
  flow_wrap_boxed: 'Flow Wrap + Boxed',
  flow_wrap_boxed_display: 'Flow Wrap + Boxed + Display Box',
}

export default function CompletePackagingModal({ order, onClose, onConfirmed }) {
  const { currentUser } = useAuth()
  const [count, setCount] = useState('')
  const [unit, setUnit] = useState('pieces')
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    if (!count || Number(count) <= 0 || saving) return
    setSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const finalCount = Number(count)

      // 1. Decrement the source candy ingredient lot
      if (order.sourceIngredientLotId) {
        await runTransaction(db, async tx => {
          const sourceRef = doc(db, 'ingredientLots', order.sourceIngredientLotId)
          const snap = await tx.get(sourceRef)
          if (snap.exists()) {
            const current = snap.data().currentQuantity || 0
            const deduct = order.quantity || 0
            const newQty = Math.max(0, current - deduct)
            tx.update(sourceRef, {
              currentQuantity: newQty,
              ...(newQty === 0 ? { status: 'used' } : {}),
            })
          }
        })
      }

      // 2. Create packaged goods ingredient lot entry
      const lotNumber = await getNextLotNumber()
      const formatLabel = FORMAT_LABELS[order.packagingFormat] || order.packagingFormat || ''
      const pkgLotRef = await addDoc(collection(db, 'ingredientLots'), {
        ingredientName: order.candyName || 'Packaged Goods',
        internalLotNumber: lotNumber,
        supplierLotNumber: order.batchNumber || '',
        type: 'packaged_goods',
        packagingFormat: order.packagingFormat || '',
        packagingOrderId: order.id,
        originalQuantity: finalCount,
        currentQuantity: finalCount,
        unit,
        status: 'available',
        clientName: order.clientName || '',
        receivedDate: Timestamp.now(),
        receivedBy: userInfo,
        createdAt: serverTimestamp(),
      })

      // 3. Mark packaging order complete and store the new lot id
      await updateDoc(doc(db, 'packagingOrders', order.id), {
        status: 'complete',
        finalCount,
        finalUnit: unit,
        packagedIngredientLotId: pkgLotRef.id,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      onConfirmed({ ...order, status: 'complete', finalCount, finalUnit: unit, packagedIngredientLotId: pkgLotRef.id })
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  return (
    <div>
      <p style={detail}><strong>Client:</strong> {order.clientName || '—'}</p>
      {order.candyName && <p style={detail}><strong>Candy:</strong> {order.candyName}</p>}
      {order.packagingFormat && <p style={detail}><strong>Format:</strong> {FORMAT_LABELS[order.packagingFormat] || order.packagingFormat}</p>}

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
