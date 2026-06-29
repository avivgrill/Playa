import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, collection, query, where, getDocs,
  addDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp, Timestamp, arrayUnion,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, formatDateTime } from '../../utils/format'
import { card, badge, btn, input, label } from '../../styles/common'
import { useTranslation } from 'react-i18next'

const STATUSES = ['backlog', 'queued', 'in_production', 'packaged', 'complete', 'hold']

export default function BatchDetail({ id: idProp, onClose }) {
  const { id: idParam } = useParams()
  const id = idProp || idParam
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { currentUser } = useAuth()

  const STATUS_LABELS = {
    backlog: t('Backlog'), queued: t('In Queue'),
    in_production: t('In Progress'), packaged: t('Packaged'),
    complete: t('Complete'), hold: t('Hold'),
    scheduled: t('Backlog'), released: t('Complete'),
  }

  const [batch, setBatch] = useState(null)
  const [allocations, setAllocations] = useState([])
  const [customers, setCustomers] = useState([])
  const [usageRecords, setUsageRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  // Allocation form
  const [showAllocForm, setShowAllocForm] = useState(false)
  const [allocForm, setAllocForm] = useState({ customerId: '', quantityAllocated: '', allocationDate: new Date().toISOString().split('T')[0], notes: '' })
  const [allocating, setAllocating] = useState(false)

  // Ingredient usage form
  const [ingredients, setIngredients] = useState([])
  const [availableLots, setAvailableLots] = useState([])
  const [loadingLots, setLoadingLots] = useState(false)
  const [showUsageForm, setShowUsageForm] = useState(false)
  const [usageForm, setUsageForm] = useState({ ingredientId: '', lotId: '', quantityUsed: '' })
  const [addingUsage, setAddingUsage] = useState(false)

  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    const [batchSnap, allocSnap, usageSnap] = await Promise.all([
      getDoc(doc(db, 'productionBatches', id)),
      getDocs(query(collection(db, 'batchAllocations'), where('batchId', '==', id))),
      getDocs(query(collection(db, 'ingredientUsage'), where('batchId', '==', id))),
    ])
    if (batchSnap.exists()) setBatch({ id: batchSnap.id, ...batchSnap.data() })
    setAllocations(allocSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.allocationDate?.toDate?.() || 0) - (a.allocationDate?.toDate?.() || 0)))
    setUsageRecords(usageSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.usedAt?.toDate?.() || 0) - (a.usedAt?.toDate?.() || 0)))
    setLoading(false)
  }

  useEffect(() => {
    load()
    getDocs(query(collection(db, 'customers'), where('status', '==', 'active')))
      .then(snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.customerName?.localeCompare(b.customerName))))
    getDocs(query(collection(db, 'ingredients'), where('status', '==', 'active')))
      .then(snap => setIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))))
  }, [id])

  async function handleIngredientSelect(ingredientId) {
    setUsageForm({ ingredientId, lotId: '', quantityUsed: '' })
    setAvailableLots([])
    if (!ingredientId) return
    setLoadingLots(true)
    const snap = await getDocs(query(collection(db, 'ingredientLots'), where('ingredientId', '==', ingredientId)))
    const lots = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(l => l.status === 'available' && l.currentQuantity > 0)
      .sort((a, b) => (a.receivedDate?.toDate?.() || 0) - (b.receivedDate?.toDate?.() || 0)) // FIFO
    setAvailableLots(lots)
    if (lots.length > 0) setUsageForm(prev => ({ ...prev, lotId: lots[0].id }))
    setLoadingLots(false)
  }

  async function submitUsage(e) {
    e.preventDefault()
    const { ingredientId, lotId, quantityUsed } = usageForm
    const qty = Number(quantityUsed)
    if (!ingredientId || !lotId) { alert('Select an ingredient and lot.'); return }
    if (!qty || qty <= 0) { alert('Enter a valid quantity.'); return }

    setAddingUsage(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const lotRef = doc(db, 'ingredientLots', lotId)
      const usageRef = doc(collection(db, 'ingredientUsage'))

      await runTransaction(db, async (tx) => {
        const lotSnap = await tx.get(lotRef)
        if (!lotSnap.exists()) throw new Error('Lot not found')
        const lot = lotSnap.data()
        if (lot.status !== 'available') throw new Error(`Lot is "${lot.status}" and cannot be used`)
        if (qty > lot.currentQuantity) throw new Error(`Not enough stock. Available: ${lot.currentQuantity} ${lot.unit}`)

        const newQty = lot.currentQuantity - qty
        tx.update(lotRef, {
          currentQuantity: newQty,
          ...(newQty === 0 ? { status: 'used' } : {}),
          auditLog: arrayUnion({ action: `used ${qty} ${lot.unit} in batch ${batch.batchNumber}`, changedBy: userInfo, changedAt: Timestamp.now() }),
        })
        tx.set(usageRef, {
          batchId: id, batchNumber: batch.batchNumber, productName: batch.productName,
          ingredientId: lot.ingredientId, ingredientName: lot.ingredientName,
          lotId, internalLotNumber: lot.internalLotNumber, supplierLotNumber: lot.supplierLotNumber || '',
          quantityUsed: qty, unit: lot.unit,
          addedBy: userInfo, usedAt: Timestamp.now(), createdAt: serverTimestamp(),
          auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now() }],
        })
      })

      setUsageForm({ ingredientId: '', lotId: '', quantityUsed: '' })
      setAvailableLots([])
      setShowUsageForm(false)
      await load()
    } catch (err) {
      alert(`Failed: ${err.message}`)
    }
    setAddingUsage(false)
  }

  async function submitAllocation(e) {
    e.preventDefault()
    const { customerId, quantityAllocated, allocationDate, notes } = allocForm
    if (!customerId || !quantityAllocated) { alert('Customer and quantity are required.'); return }
    const qty = Number(quantityAllocated)
    if (qty <= 0) { alert('Quantity must be greater than 0.'); return }
    const totalAllocated = allocations.reduce((sum, a) => sum + (a.quantityAllocated || 0), 0)
    const available = (batch.quantityProduced || 0) - totalAllocated
    if (qty > available) {
      alert(`Cannot allocate ${qty} ${batch.unit}. Only ${available} ${batch.unit} available.`)
      return
    }
    setAllocating(true)
    try {
      const customer = customers.find(c => c.id === customerId)
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const allocDate = allocationDate ? new Date(allocationDate + 'T00:00:00') : new Date()
      await addDoc(collection(db, 'batchAllocations'), {
        batchId: id, batchNumber: batch.batchNumber, productName: batch.productName,
        customerId, customerName: customer?.customerName || '',
        quantityAllocated: qty, unit: batch.unit,
        allocationDate: Timestamp.fromDate(allocDate), notes: notes || '',
        createdAt: serverTimestamp(), createdBy: userInfo,
        auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now() }],
      })
      setAllocForm({ customerId: '', quantityAllocated: '', allocationDate: new Date().toISOString().split('T')[0], notes: '' })
      setShowAllocForm(false)
      await load()
    } catch (err) {
      alert(`Failed: ${err.message}`)
    }
    setAllocating(false)
  }

  async function updateStatus(newStatus) {
    setUpdatingStatus(true)
    const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
    await updateDoc(doc(db, 'productionBatches', id), {
      status: newStatus, updatedAt: serverTimestamp(),
      auditLog: arrayUnion({ action: `status changed to ${newStatus}`, changedBy: userInfo, changedAt: Timestamp.now() }),
    })
    setBatch(prev => ({ ...prev, status: newStatus }))
    setUpdatingStatus(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete work order ${batch.batchNumber}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const usageSnap = await getDocs(query(collection(db, 'ingredientUsage'), where('batchId', '==', id)))
      await Promise.all(usageSnap.docs.map(d => deleteDoc(d.ref)))
      await deleteDoc(doc(db, 'productionBatches', id))
      if (onClose) onClose()
      else navigate('/production')
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
      setDeleting(false)
    }
  }

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>{t('Loading…')}</p>
  if (!batch) return <p style={{ color: '#dc2626', padding: '1rem' }}>{t('Work Order not found.')}</p>

  const totalAllocated = allocations.reduce((sum, a) => sum + (a.quantityAllocated || 0), 0)
  const available = (batch.quantityProduced || 0) - totalAllocated
  const selectedLot = availableLots.find(l => l.id === usageForm.lotId)

  return (
    <div>
      {!onClose && <button style={backBtn} onClick={() => navigate('/production')}>{t('← Production')}</button>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em' }}>{batch.batchNumber}</div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{batch.productName}</h1>
        </div>
        <span style={badge[batch.status] || badge.pending}>{STATUS_LABELS[batch.status] || batch.status}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {STATUSES.filter(s => s !== batch.status).map(s => (
          <button key={s} style={{ ...statusBtn, borderColor: statusColor(s), color: statusColor(s) }}
            onClick={() => updateStatus(s)} disabled={updatingStatus}>
            → {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: '1rem', overflowX: 'auto' }}>
        {[
          ['overview', t('Overview')],
          ['ingredients', `${t('Ingredients')} (${usageRecords.length})`],
          ['allocations', `${t('Allocations')} (${allocations.length})`],
        ].map(([key, lbl]) => (
          <button key={key}
            style={{ ...tabBtn, borderBottom: tab === key ? '2px solid #1d4ed8' : '2px solid transparent', color: tab === key ? '#1d4ed8' : '#6b7280', marginBottom: '-2px', whiteSpace: 'nowrap' }}
            onClick={() => setTab(key)}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div>
          {['in_production', 'complete', 'released'].includes(batch.status) && usageRecords.length === 0 && (
            <div
              style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setTab('ingredients')}
            >
              <span style={{ fontSize: '0.9rem', color: '#92400e' }}>
                {t('⚠ No ingredient lots logged — required for recall traceability.')}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>{t('Add Lots →')}</span>
            </div>
          )}
          <div style={card}>
            <Row label={t('Planned Date')} value={formatDate(batch.productionDate)} />
            {batch.sopName && <Row label={t('SOP')} value={batch.sopName} />}
            {batch.clientOrderNumber && <Row label={t('Client Order')} value={batch.clientOrderNumber} />}
            <Row label={t('Planned Quantity')} value={(batch.plannedQuantity || batch.quantityProduced) ? `${(batch.plannedQuantity || batch.quantityProduced).toLocaleString()} ${batch.unit}` : '—'} />
            <Row label={t('Quantity Allocated')} value={totalAllocated > 0 ? `${totalAllocated.toLocaleString()} ${batch.unit}` : '—'} />
            <Row label={t('Available')} value={`${available.toLocaleString()} ${batch.unit}`} />
            <Row label={t('Created by')} value={batch.createdBy?.displayName || batch.createdBy?.email} />
          </div>
          {batch.notes && (
            <div style={card}>
              <h2 style={sectionHead}>{t('Notes')}</h2>
              <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0 }}>{batch.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Ingredients Used ── */}
      {tab === 'ingredients' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              {t('Select ingredient → system suggests oldest lot first')}
            </p>
            <button style={btn.primary} onClick={() => { setShowUsageForm(!showUsageForm); setUsageForm({ ingredientId: '', lotId: '', quantityUsed: '' }); setAvailableLots([]) }}>
              {showUsageForm ? t('Cancel') : t('+ Add Ingredient')}
            </button>
          </div>

          {showUsageForm && (
            <form onSubmit={submitUsage} style={{ ...card, background: '#f0f9ff', borderLeft: '4px solid #1d4ed8', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '0.75rem' }}>{t('Add Ingredient')}</h3>

              <label style={label}>{t('Ingredient')}</label>
              <select style={input} value={usageForm.ingredientId} onChange={e => handleIngredientSelect(e.target.value)}>
                <option value="">{t('— Select ingredient —')}</option>
                {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>

              {loadingLots && <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.875rem' }}>{t('Loading lots…')}</p>}

              {!loadingLots && usageForm.ingredientId && availableLots.length === 0 && (
                <div style={{ background: '#fef2f2', borderRadius: 8, padding: '0.6rem 0.875rem', fontSize: '0.85rem', color: '#dc2626', marginBottom: '0.875rem' }}>
                  {t('No available stock for this ingredient.')}
                </div>
              )}

              {availableLots.length > 0 && (
                <>
                  <label style={label}>{t('Lot')} <span style={{ color: '#16a34a', fontSize: '0.8rem' }}>({t('oldest first — FIFO')})</span></label>
                  <select style={input} value={usageForm.lotId} onChange={e => setUsageForm(prev => ({ ...prev, lotId: e.target.value }))}>
                    {availableLots.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.internalLotNumber} — {l.currentQuantity.toLocaleString()} {l.unit} avail · rcvd {l.receivedDate?.toDate ? l.receivedDate.toDate().toLocaleDateString() : ''}
                        {l.supplierLotNumber ? ` (${l.supplierLotNumber})` : ''}
                      </option>
                    ))}
                  </select>

                  {selectedLot && (
                    <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '0.5rem 0.875rem', fontSize: '0.85rem', color: '#15803d', marginBottom: '0.875rem' }}>
                      {t('Available')}: <strong>{selectedLot.currentQuantity.toLocaleString()} {selectedLot.unit}</strong>
                      {selectedLot.supplierLotNumber ? ` · ${t('Supplier lot')}: ${selectedLot.supplierLotNumber}` : ''}
                    </div>
                  )}

                  <label style={label}>{t('Quantity Used')} ({selectedLot?.unit || ''})</label>
                  <input style={{ ...input, fontSize: '1.1rem' }} type="number" min="0.01" step="any"
                    value={usageForm.quantityUsed}
                    onChange={e => setUsageForm(prev => ({ ...prev, quantityUsed: e.target.value }))}
                    placeholder="0"
                    max={selectedLot?.currentQuantity}
                  />

                  <button type="submit" style={btn.primary} disabled={addingUsage}>
                    {addingUsage ? t('Adding…') : t('Add to Batch')}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Usage summary by ingredient */}
          {usageRecords.length === 0 && !showUsageForm && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#92400e' }}>
              {t('⚠ No ingredient lots logged yet. Add at least one lot for recall traceability.')}
            </div>
          )}

          {usageRecords.length > 0 && (
            <div style={{ ...card, background: '#f8fafc', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }}>
                {t('Summary')}
              </h3>
              {groupByIngredient(usageRecords).map(([name, records]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                  <span style={{ color: '#374151' }}>{name}</span>
                  <span style={{ fontWeight: 600, color: '#1d4ed8' }}>
                    {records.reduce((s, r) => s + r.quantityUsed, 0).toLocaleString()} {records[0]?.unit}
                  </span>
                </div>
              ))}
            </div>
          )}

          {usageRecords.map(u => (
            <div key={u.id} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(`/operations/lots/${u.lotId}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#374151' }}>{u.ingredientName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{u.internalLotNumber}</div>
                  {u.supplierLotNumber && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t('Supplier')}: {u.supplierLotNumber}</div>}
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatDateTime(u.usedAt)} · {u.addedBy?.displayName || u.addedBy?.email}</div>
                </div>
                <div style={{ fontWeight: 700, color: '#1d4ed8', textAlign: 'right', flexShrink: 0 }}>
                  {u.quantityUsed} {u.unit}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Allocations ── */}
      {tab === 'allocations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {t('Available')}: <strong>{available.toLocaleString()} {batch.unit}</strong>
            </div>
            <button style={btn.primary} onClick={() => setShowAllocForm(!showAllocForm)}>
              {showAllocForm ? t('Cancel') : t('+ Allocate')}
            </button>
          </div>

          {showAllocForm && (
            <form onSubmit={submitAllocation} style={{ ...card, background: '#f0f9ff', borderLeft: '4px solid #1d4ed8' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '0.75rem' }}>{t('New Allocation')}</h3>
              <label style={label}>{t('Customer *')}</label>
              <select style={input} value={allocForm.customerId} onChange={e => setAllocForm(prev => ({ ...prev, customerId: e.target.value }))}>
                <option value="">{t('— Select customer —')}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.customerName}</option>)}
              </select>
              <div className="form-row">
                <div>
                  <label style={label}>{t('Quantity')} ({batch.unit}) *</label>
                  <input style={input} type="number" min="0.01" step="0.01" value={allocForm.quantityAllocated}
                    onChange={e => setAllocForm(prev => ({ ...prev, quantityAllocated: e.target.value }))} placeholder={`Max ${available}`} />
                </div>
                <div>
                  <label style={label}>{t('Date')}</label>
                  <input style={input} type="date" value={allocForm.allocationDate}
                    onChange={e => setAllocForm(prev => ({ ...prev, allocationDate: e.target.value }))} />
                </div>
              </div>
              <label style={label}>{t('Notes')}</label>
              <input style={input} value={allocForm.notes} onChange={e => setAllocForm(prev => ({ ...prev, notes: e.target.value }))} placeholder={t('Optional notes…')} />
              <button type="submit" style={btn.primary} disabled={allocating}>{allocating ? t('Saving…') : t('Save Allocation')}</button>
            </form>
          )}

          {allocations.length === 0 && !showAllocForm && <p style={muted}>{t('No allocations yet.')}</p>}
          {allocations.map(a => (
            <div key={a.id} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(`/operations/customers/${a.customerId}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#374151' }}>{a.customerName}</div>
                  {a.notes && <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{a.notes}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#1d4ed8' }}>{a.quantityAllocated?.toLocaleString()} {a.unit}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatDate(a.allocationDate)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
        <button
          style={{ background: 'transparent', border: '1px solid #dc2626', color: '#dc2626', borderRadius: 7, padding: '0.4rem 0.875rem', fontSize: '0.825rem', cursor: 'pointer' }}
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? t('Deleting…') : t('Delete Work Order')}
        </button>
      </div>
    </div>
  )
}

function groupByIngredient(records) {
  const map = {}
  records.forEach(r => {
    if (!map[r.ingredientName]) map[r.ingredientName] = []
    map[r.ingredientName].push(r)
  })
  return Object.entries(map)
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function statusColor(s) {
  return { backlog: '#6b7280', queued: '#d97706', in_production: '#1d4ed8', packaged: '#7e22ce', complete: '#16a34a', hold: '#dc2626', scheduled: '#6b7280', released: '#16a34a' }[s] || '#6b7280'
}

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const sectionHead = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const tabBtn = { background: 'none', border: 'none', padding: '0.5rem 0.875rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }
const statusBtn = { background: '#fff', border: '1px solid', borderRadius: 6, padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }
