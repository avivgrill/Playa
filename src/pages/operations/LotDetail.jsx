import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, collection, getDocs, query, where,
  runTransaction, updateDoc, serverTimestamp, Timestamp, arrayUnion,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, formatDateTime } from '../../utils/format'
import { card, badge, btn, input, label } from '../../styles/common'

const ADJ_TYPES = [
  { value: 'add', label: 'Add Stock', color: '#16a34a' },
  { value: 'remove', label: 'Remove', color: '#dc2626' },
  { value: 'waste', label: 'Waste', color: '#d97706' },
  { value: 'correct', label: 'Correct Count', color: '#1d4ed8' },
]

const STATUS_COLORS = { available: '#16a34a', hold: '#d97706', used: '#9ca3af', recalled: '#dc2626' }
const STATUS_TRANSITIONS = {
  available: ['hold'],
  hold: ['available'],
  used: [],
  recalled: [],
}

export default function LotDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [lot, setLot] = useState(null)
  const [usageRecords, setUsageRecords] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('details')
  const [showAdjForm, setShowAdjForm] = useState(false)
  const [adjForm, setAdjForm] = useState({ type: 'add', quantity: '', reason: '', notes: '' })
  const [adjusting, setAdjusting] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  async function load() {
    const [lotSnap, usageSnap, adjSnap] = await Promise.all([
      getDoc(doc(db, 'ingredientLots', id)),
      getDocs(query(collection(db, 'ingredientUsage'), where('lotId', '==', id))),
      getDocs(query(collection(db, 'inventoryAdjustments'), where('lotId', '==', id))),
    ])
    if (lotSnap.exists()) setLot({ id: lotSnap.id, ...lotSnap.data() })
    setUsageRecords(usageSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.usedAt?.toDate?.() || 0) - (a.usedAt?.toDate?.() || 0)))
    setAdjustments(adjSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.adjustedAt?.toDate?.() || 0) - (a.adjustedAt?.toDate?.() || 0)))
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function submitAdjustment(e) {
    e.preventDefault()
    const qty = Number(adjForm.quantity)
    if (!qty || qty <= 0) { alert('Enter a valid quantity.'); return }
    if (!adjForm.reason.trim()) { alert('Reason is required.'); return }

    setAdjusting(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const lotRef = doc(db, 'ingredientLots', id)
      const adjRef = doc(collection(db, 'inventoryAdjustments'))

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(lotRef)
        const current = snap.data()
        const prev = current.currentQuantity
        let newQty
        if (adjForm.type === 'add') newQty = prev + qty
        else if (adjForm.type === 'correct') newQty = qty
        else newQty = Math.max(0, prev - qty) // remove / waste

        tx.update(lotRef, {
          currentQuantity: newQty,
          ...(newQty === 0 && current.status === 'available' ? { status: 'used' } : {}),
          auditLog: arrayUnion({ action: `${adjForm.type}: ${qty} ${current.unit} — ${adjForm.reason}`, changedBy: userInfo, changedAt: Timestamp.now() }),
        })
        tx.set(adjRef, {
          lotId: id, internalLotNumber: current.internalLotNumber,
          ingredientId: current.ingredientId, ingredientName: current.ingredientName,
          adjustmentType: adjForm.type, quantity: qty,
          previousQuantity: prev, newQuantity: newQty,
          reason: adjForm.reason, notes: adjForm.notes || '',
          adjustedBy: userInfo, adjustedAt: Timestamp.now(), createdAt: serverTimestamp(),
        })
      })
      setAdjForm({ type: 'add', quantity: '', reason: '', notes: '' })
      setShowAdjForm(false)
      await load()
    } catch (err) {
      alert(`Adjustment failed: ${err.message}`)
    }
    setAdjusting(false)
  }

  async function changeStatus(newStatus) {
    if (!window.confirm(`Change lot status to "${newStatus}"?`)) return
    setChangingStatus(true)
    const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
    await updateDoc(doc(db, 'ingredientLots', id), {
      status: newStatus,
      auditLog: arrayUnion({ action: `status changed to ${newStatus}`, changedBy: userInfo, changedAt: Timestamp.now() }),
    })
    setLot(prev => ({ ...prev, status: newStatus }))
    setChangingStatus(false)
  }

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>Loading…</p>
  if (!lot) return <p style={{ color: '#dc2626', padding: '1rem' }}>Lot not found.</p>

  const pct = lot.originalQuantity > 0 ? Math.round((lot.currentQuantity / lot.originalQuantity) * 100) : 0
  const transitions = STATUS_TRANSITIONS[lot.status] || []

  return (
    <div>
      <button style={backBtn} onClick={() => navigate(-1)}>← Back</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em' }}>{lot.internalLotNumber}</div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{lot.ingredientName}</h1>
        </div>
        <span style={{ ...(badge[lot.status] || badge.available), fontSize: '0.8rem' }}>{lot.status}</span>
      </div>

      {/* Qty bar */}
      <div style={{ ...card, padding: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1.4rem', color: STATUS_COLORS[lot.status] || '#374151' }}>
            {lot.currentQuantity?.toLocaleString()} {lot.unit}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#9ca3af', alignSelf: 'flex-end' }}>
            {pct}% of {lot.originalQuantity?.toLocaleString()} received
          </span>
        </div>
        <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct < 25 ? '#dc2626' : pct < 50 ? '#f59e0b' : '#16a34a', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {lot.status !== 'recalled' && lot.status !== 'used' && (
          <button style={btn.primary} onClick={() => setShowAdjForm(!showAdjForm)}>
            {showAdjForm ? 'Cancel' : 'Adjust Inventory'}
          </button>
        )}
        {transitions.map(s => (
          <button key={s} style={btn.secondary} onClick={() => changeStatus(s)} disabled={changingStatus}>
            {s === 'hold' ? '⚠ Place on Hold' : '✓ Release from Hold'}
          </button>
        ))}
        <button style={{ ...btn.secondary, color: '#1d4ed8' }} onClick={() => navigate(`/operations/recall?lotId=${id}`)}>
          Recall Trace
        </button>
      </div>

      {/* Adjustment Form */}
      {showAdjForm && (
        <form onSubmit={submitAdjustment} style={{ ...card, background: '#fffbeb', borderLeft: '4px solid #f59e0b', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400e', marginBottom: '0.75rem' }}>Adjust Inventory</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
            {ADJ_TYPES.map(t => (
              <button key={t.value} type="button"
                style={{ padding: '0.4rem 0.8rem', border: `2px solid ${adjForm.type === t.value ? t.color : '#d1d5db'}`, borderRadius: 8, background: adjForm.type === t.value ? t.color : '#fff', color: adjForm.type === t.value ? '#fff' : '#374151', fontSize: '0.85rem', cursor: 'pointer', fontWeight: adjForm.type === t.value ? 600 : 400 }}
                onClick={() => setAdjForm(prev => ({ ...prev, type: t.value }))}>
                {t.label}
              </button>
            ))}
          </div>
          <label style={label}>
            Quantity ({lot.unit})
            {adjForm.type === 'correct' ? ' — set to this exact amount' : ''}
          </label>
          <input style={input} type="number" min="0.01" step="any" value={adjForm.quantity} onChange={e => setAdjForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" />
          <label style={label}>Reason *</label>
          <input style={input} value={adjForm.reason} onChange={e => setAdjForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Spillage, cycle count correction…" />
          <label style={label}>Notes</label>
          <input style={{ ...input, marginBottom: '0.75rem' }} value={adjForm.notes} onChange={e => setAdjForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional additional detail" />
          <button type="submit" style={btn.primary} disabled={adjusting}>{adjusting ? 'Saving…' : 'Save Adjustment'}</button>
        </form>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: '1rem' }}>
        {[['details', 'Details'], ['usage', `Usage (${usageRecords.length})`], ['adjustments', `Adjustments (${adjustments.length})`]].map(([key, lbl]) => (
          <button key={key}
            style={{ ...tabBtn, borderBottom: tab === key ? '2px solid #1d4ed8' : '2px solid transparent', color: tab === key ? '#1d4ed8' : '#6b7280', marginBottom: '-2px' }}
            onClick={() => setTab(key)}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div style={card}>
          {lot.supplierLotNumber && <Row label="Supplier Lot #" value={lot.supplierLotNumber} />}
          {lot.supplier && <Row label="Supplier" value={lot.supplier} />}
          <Row label="Received Date" value={formatDate(lot.receivedDate)} />
          <Row label="Received By" value={lot.receivedBy?.displayName || lot.receivedBy?.email || '—'} />
          <Row label="Storage Location" value={lot.palletNumber ? `${lot.storageLocation} · Pallet ${lot.palletNumber}` : (lot.storageLocation || '—')} />
          {lot.notes && <Row label="Notes" value={lot.notes} />}
          {lot.photoUrl && (
            <div style={{ paddingTop: '0.75rem' }}>
              <a href={lot.photoUrl} target="_blank" rel="noopener noreferrer">
                <img src={lot.photoUrl} alt="Label/COA" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              </a>
            </div>
          )}
        </div>
      )}

      {tab === 'usage' && (
        <div>
          {usageRecords.length === 0 && <p style={muted}>This lot has not been used in production.</p>}
          {usageRecords.map(u => (
            <div key={u.id} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(`/operations/batches/${u.batchId}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>{u.batchNumber}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{u.productName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatDateTime(u.usedAt)} · {u.addedBy?.displayName || u.addedBy?.email}</div>
                </div>
                <div style={{ fontWeight: 700, color: '#1d4ed8', textAlign: 'right' }}>
                  {u.quantityUsed} {u.unit}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'adjustments' && (
        <div>
          {adjustments.length === 0 && <p style={muted}>No adjustments recorded.</p>}
          {adjustments.map(a => (
            <div key={a.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#374151', textTransform: 'capitalize', fontSize: '0.875rem' }}>{a.adjustmentType}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{a.reason}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatDateTime(a.adjustedAt)} · {a.adjustedBy?.displayName || a.adjustedBy?.email}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: a.adjustmentType === 'add' ? '#16a34a' : '#dc2626' }}>
                    {a.adjustmentType === 'add' ? '+' : a.adjustmentType === 'correct' ? '=' : '-'}{a.quantity} {lot.unit}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{a.previousQuantity} → {a.newQuantity}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 500, textAlign: 'right', maxWidth: '65%' }}>{value}</span>
    </div>
  )
}

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const tabBtn = { background: 'none', border: 'none', padding: '0.5rem 0.875rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }
