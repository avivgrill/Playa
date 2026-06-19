import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, query, where, getDocs, updateDoc, deleteDoc, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../utils/format'
import SlideOver from '../SlideOver'
import { btn } from '../../styles/common'

const STATUS_LABELS = {
  backlog: 'Backlog', queued: 'In Queue', in_production: 'In Progress',
  packaged: 'Packaged', complete: 'Complete', hold: 'Hold', scheduled: 'Backlog', released: 'Complete',
}
const STATUS_COLOR = {
  backlog: '#6b7280', queued: '#d97706', in_production: '#1d4ed8',
  packaged: '#7e22ce', complete: '#16a34a', hold: '#dc2626',
}
const STATUS_NEXT = {
  backlog: 'queued', scheduled: 'queued', queued: 'in_production',
  in_production: 'packaged', packaged: 'complete',
}
const ALL_STATUSES = ['backlog', 'queued', 'in_production', 'packaged', 'complete', 'hold']

export default function CardDetailSlideOver({ batch: initialBatch, onClose, onUpdated, onDeleted }) {
  const { currentUser, isAdmin } = useAuth()
  const [batch, setBatch] = useState(initialBatch)
  const [usage, setUsage] = useState([])
  const [advancing, setAdvancing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setBatch(initialBatch)
    if (['in_production', 'packaged', 'complete', 'released'].includes(initialBatch?.status)) {
      getDocs(query(collection(db, 'ingredientUsage'), where('batchId', '==', initialBatch.id)))
        .then(snap => setUsage(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    } else {
      setUsage([])
    }
  }, [initialBatch?.id])

  async function moveToStatus(newStatus) {
    if (advancing) return
    setAdvancing(true)
    const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
    try {
      await updateDoc(doc(db, 'productionBatches', batch.id), {
        status: newStatus, updatedAt: serverTimestamp(),
        auditLog: arrayUnion({ action: `status → ${newStatus}`, changedBy: userInfo, changedAt: Timestamp.now() }),
      })
      const updated = { ...batch, status: newStatus }
      setBatch(updated)
      onUpdated?.(updated)
    } catch (err) {
      alert(err.message)
    }
    setAdvancing(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${batch.batchNumber}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'productionBatches', batch.id))
      onDeleted?.(batch.id)
      onClose()
    } catch (err) {
      alert(err.message)
      setDeleting(false)
    }
  }

  if (!batch) return null
  const color = STATUS_COLOR[batch.status] || '#6b7280'
  const nextStatus = STATUS_NEXT[batch.status]

  return (
    <SlideOver onClose={onClose}>
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{batch.batchNumber}</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{batch.productName}</div>
          <span style={{ display: 'inline-block', marginTop: '0.35rem', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99, background: color + '18', color }}>
            {STATUS_LABELS[batch.status] || batch.status}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#9ca3af', cursor: 'pointer', flexShrink: 0, padding: '0.25rem' }}>✕</button>
      </div>

      {/* Body */}
      <div style={{ padding: '1rem 1.25rem', flex: 1 }}>

        {/* Advance button */}
        {nextStatus && (
          <button style={{ ...btn.primary, width: '100%', marginBottom: '0.875rem', fontSize: '0.9rem' }}
            onClick={() => moveToStatus(nextStatus)} disabled={advancing}>
            {advancing ? '…' : `→ Move to ${STATUS_LABELS[nextStatus]}`}
          </button>
        )}

        {/* Detail rows */}
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '0.75rem', marginBottom: '0.875rem' }}>
          {batch.productionDate && <Row label="Planned Date" value={formatDate(batch.productionDate)} />}
          {batch.sopName && <Row label="SOP" value={batch.sopName} />}
          {batch.actualQuantity > 0 && <Row label="Batch Size" value={`${batch.actualQuantity.toLocaleString()} ${batch.unit}`} />}
          {batch.plannedQuantity > 0 && !batch.actualQuantity && <Row label="Planned Qty" value={`${batch.plannedQuantity.toLocaleString()} ${batch.unit}`} />}
          {batch.clientOrderNumber && <Row label="Client Order" value={batch.clientOrderNumber} />}
        </div>

        {/* Ingredient usage */}
        {usage.length > 0 && (
          <div style={{ marginBottom: '0.875rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', margin: '0 0 0.4rem' }}>Ingredients Used</p>
            <div style={{ background: '#f9fafb', borderRadius: 8, overflow: 'hidden' }}>
              {usage.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem' }}>
                  <span style={{ color: '#374151' }}>{u.ingredientName} <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>({u.internalLotNumber})</span></span>
                  <span style={{ color: '#6b7280', fontWeight: 500 }}>{u.quantityUsed} {u.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {batch.notes && (
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '0.75rem', marginBottom: '0.875rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', margin: '0 0 0.3rem' }}>Notes</p>
            <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0 }}>{batch.notes}</p>
          </div>
        )}

        {/* Admin status override */}
        {isAdmin && (
          <div style={{ marginBottom: '0.875rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', margin: '0 0 0.4rem' }}>Set Status</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {ALL_STATUSES.filter(s => s !== batch.status).map(s => (
                <button key={s} style={{ background: '#fff', border: `1px solid ${STATUS_COLOR[s] || '#e5e7eb'}`, color: STATUS_COLOR[s] || '#374151', borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => moveToStatus(s)} disabled={advancing}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Full page link */}
        <Link to={`/operations/batches/${batch.id}`} style={{ display: 'block', fontSize: '0.85rem', color: '#1d4ed8', marginBottom: isAdmin ? '1.5rem' : 0 }}>
          Open full detail page →
        </Link>

        {/* Delete (admin only) */}
        {isAdmin && (
          <button style={{ ...btn.danger, width: '100%', fontSize: '0.875rem' }} onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Card'}
          </button>
        )}
      </div>
    </SlideOver>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
      <span style={{ color: '#9ca3af' }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
