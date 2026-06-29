import { useState } from 'react'
import { doc, updateDoc, addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { getNextLotNumber } from '../../utils/lotNumber'
import { input, btn, label } from '../../styles/common'

const STORAGE_OPTIONS = [
  { value: 'curing_racks', label: 'Left on Curing Racks' },
  { value: 'baking_trays', label: 'On Baking Trays' },
  { value: 'bulk_packaged', label: 'Bulk Packaged' },
]
const UNITS = ['lbs', 'kg', 'oz', 'g', 'pcs', 'cases']

export default function CompleteProductionModal({ batch, onClose, onConfirmed }) {
  const { currentUser } = useAuth()
  const [storageType, setStorageType] = useState('curing_racks')
  const [quantity, setQuantity] = useState(batch.quantityProduced ? String(batch.quantityProduced) : '')
  const [unit, setUnit] = useState(batch.unit || 'lbs')
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    if (!quantity || Number(quantity) <= 0 || saving) return
    setSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const qty = Number(quantity)

      // 1. Create finished candy lot record
      const lotRef = await addDoc(collection(db, 'finishedCandyLots'), {
        candyName: batch.productName,
        productionOrderId: batch.id,
        batchNumber: batch.batchNumber,
        storageType,
        quantity: qty,
        unit,
        status: 'available',
        createdAt: serverTimestamp(),
        createdBy: userInfo,
      })

      // 2. Create ingredient lot entry so it appears in inventory
      const lotNumber = await getNextLotNumber()
      const ingLotRef = await addDoc(collection(db, 'ingredientLots'), {
        ingredientName: batch.productName,
        internalLotNumber: lotNumber,
        supplierLotNumber: batch.batchNumber,
        type: 'finished_candy',
        storageType,
        originalQuantity: qty,
        currentQuantity: qty,
        unit,
        status: 'available',
        productionOrderId: batch.id,
        finishedCandyLotId: lotRef.id,
        receivedDate: Timestamp.now(),
        receivedBy: userInfo,
        createdAt: serverTimestamp(),
      })

      // 3. Back-link the ingredient lot id onto the finished candy lot
      await updateDoc(lotRef, { ingredientLotId: ingLotRef.id })

      // 4. Mark work order complete
      await updateDoc(doc(db, 'productionBatches', batch.id), {
        status: 'complete',
        finishedCandyLotId: lotRef.id,
        ingredientLotId: ingLotRef.id,
        quantityProduced: qty,
        unit,
        updatedAt: serverTimestamp(),
      })

      onConfirmed({ ...batch, status: 'complete', quantityProduced: qty, unit })
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  return (
    <div>
      <p style={sub}>{batch.batchNumber}</p>

      <label style={label}>How is the candy being stored?</label>
      <select style={input} value={storageType} onChange={e => setStorageType(e.target.value)}>
        {STORAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <label style={label}>Total Quantity Produced</label>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          style={{ ...input, flex: 1, marginBottom: 0 }}
          type="number" min="0" step="0.01"
          value={quantity} onChange={e => setQuantity(e.target.value)}
          placeholder="0" autoFocus
        />
        <select style={{ ...input, width: 90, marginBottom: 0 }} value={unit} onChange={e => setUnit(e.target.value)}>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button style={{ ...btn.secondary, flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
        <button
          style={{ ...btn.success, flex: 1 }}
          onClick={handleConfirm}
          disabled={saving || !quantity || Number(quantity) <= 0}
        >
          {saving ? 'Saving…' : '✓ Complete & Log Inventory'}
        </button>
      </div>
    </div>
  )
}

const sub = { fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1.25rem' }
