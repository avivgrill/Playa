import { useState, useEffect } from 'react'
import { collection, doc, getDocs, query, where, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../Modal'
import { btn, input, label } from '../../styles/common'

const UNITS = ['lbs', 'kg', 'oz', 'g', 'units', 'cases', 'gallons', 'liters']

export default function StartProductionModal({ batch, onClose, onConfirmed }) {
  const { currentUser } = useAuth()
  const [ingredients, setIngredients] = useState([])
  const [batchSize, setBatchSize] = useState('')
  const [unit, setUnit] = useState('lbs')
  const [rows, setRows] = useState([]) // [{ ingredientId, ingredientName, lotId, lots, quantityUsed }]
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'ingredients'), where('status', '==', 'active')))
      .then(snap => setIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))))
  }, [])

  async function handleIngredientChange(idx, ingredientId) {
    const updated = rows.map((r, i) => i === idx ? { ...r, ingredientId, ingredientName: '', lotId: '', lots: [], quantityUsed: '' } : r)
    setRows(updated)
    if (!ingredientId) return

    const ing = ingredients.find(i => i.id === ingredientId)
    const snap = await getDocs(query(collection(db, 'ingredientLots'), where('ingredientId', '==', ingredientId)))
    const lots = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(l => l.status === 'available' && l.currentQuantity > 0)
      .sort((a, b) => (a.receivedDate?.toDate?.() || 0) - (b.receivedDate?.toDate?.() || 0))

    setRows(prev => prev.map((r, i) => i === idx
      ? { ...r, ingredientId, ingredientName: ing?.name || '', lots, lotId: lots[0]?.id || '' }
      : r
    ))
  }

  function updateRow(idx, field, value) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function addRow() {
    setRows(prev => [...prev, { ingredientId: '', ingredientName: '', lotId: '', lots: [], quantityUsed: '' }])
  }

  function removeRow(idx) {
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleConfirm() {
    if (!batchSize || Number(batchSize) <= 0) { alert('Enter a valid batch size.'); return }
    const validRows = rows.filter(r => r.ingredientId && r.lotId && r.quantityUsed)
    setSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const qty = Number(batchSize)

      await runTransaction(db, async (tx) => {
        // Validate + deduct all lots
        const lotData = []
        for (const row of validRows) {
          const lotRef = doc(db, 'ingredientLots', row.lotId)
          const lotSnap = await tx.get(lotRef)
          if (!lotSnap.exists()) throw new Error(`Lot not found: ${row.lotId}`)
          const lot = lotSnap.data()
          const used = Number(row.quantityUsed)
          if (lot.currentQuantity < used) throw new Error(`Not enough ${lot.ingredientName}. Available: ${lot.currentQuantity} ${lot.unit}`)
          lotData.push({ ref: lotRef, lot, used })
        }

        // Write lot decrements
        for (const { ref, lot, used } of lotData) {
          const newQty = lot.currentQuantity - used
          tx.update(ref, {
            currentQuantity: newQty,
            ...(newQty === 0 ? { status: 'used' } : {}),
            auditLog: (lot.auditLog || []).concat([{ action: `used ${used} ${lot.unit} in ${batch.batchNumber}`, changedBy: userInfo, changedAt: Timestamp.now() }]),
          })
        }

        // Write ingredientUsage docs
        for (const row of validRows) {
          const lot = lotData.find(l => l.ref.id === row.lotId)?.lot
          const usageRef = doc(collection(db, 'ingredientUsage'))
          tx.set(usageRef, {
            batchId: batch.id, batchNumber: batch.batchNumber, productName: batch.productName,
            ingredientId: row.ingredientId, ingredientName: row.ingredientName,
            lotId: row.lotId, internalLotNumber: lot?.internalLotNumber || '', supplierLotNumber: lot?.supplierLotNumber || '',
            quantityUsed: Number(row.quantityUsed), unit: lot?.unit || '',
            addedBy: userInfo, usedAt: Timestamp.now(), createdAt: serverTimestamp(),
            auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now() }],
          })
        }

        // Update batch status
        tx.update(doc(db, 'productionBatches', batch.id), {
          status: 'in_production',
          actualQuantity: qty,
          unit,
          updatedAt: serverTimestamp(),
          auditLog: (batch.auditLog || []).concat([{ action: 'started production', changedBy: userInfo, changedAt: Timestamp.now() }]),
        })
      })

      onConfirmed({ ...batch, status: 'in_production', actualQuantity: qty, unit })
      onClose()
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  return (
    <Modal title={`Start Production — ${batch.batchNumber}`} onClose={onClose} maxWidth={540}>
      <div>
        <label style={label}>Batch Size *</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem' }}>
          <input style={{ ...input, marginBottom: 0, flex: 2 }} type="number" min="0" step="any" value={batchSize} onChange={e => setBatchSize(e.target.value)} placeholder="0" />
          <select style={{ ...input, marginBottom: 0, flex: 1 }} value={unit} onChange={e => setUnit(e.target.value)}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ ...label, marginBottom: 0 }}>Ingredients Used</label>
          <button type="button" style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }} onClick={addRow}>+ Add ingredient</button>
        </div>

        {rows.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.875rem' }}>No ingredients added yet — tap above to add.</p>
        )}

        {rows.map((row, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 28px', gap: '0.375rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <select style={{ ...input, marginBottom: 0, fontSize: '0.8rem' }} value={row.ingredientId} onChange={e => handleIngredientChange(idx, e.target.value)}>
              <option value="">Ingredient</option>
              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <select style={{ ...input, marginBottom: 0, fontSize: '0.8rem' }} value={row.lotId} onChange={e => updateRow(idx, 'lotId', e.target.value)} disabled={!row.lots.length}>
              <option value="">{row.lots.length ? 'Lot' : '—'}</option>
              {row.lots.map(l => <option key={l.id} value={l.id}>{l.internalLotNumber} ({l.currentQuantity} {l.unit})</option>)}
            </select>
            <input style={{ ...input, marginBottom: 0, fontSize: '0.8rem' }} type="number" min="0" step="any" value={row.quantityUsed} onChange={e => updateRow(idx, 'quantityUsed', e.target.value)} placeholder="Qty" />
            <button type="button" onClick={() => removeRow(idx)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button type="button" style={{ ...btn.secondary, flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...btn.primary, flex: 2, opacity: batchSize && Number(batchSize) > 0 ? 1 : 0.4 }}
            disabled={!batchSize || Number(batchSize) <= 0 || saving}
            onClick={handleConfirm}>
            {saving ? 'Starting…' : 'Start Production'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
