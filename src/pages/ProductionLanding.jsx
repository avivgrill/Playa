import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useTranslation } from 'react-i18next'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import StartProductionModal from '../components/production/StartProductionModal'
import WorkOrderSlideOver from '../components/production/WorkOrderSlideOver'
import Modal from '../components/Modal'
import BatchForm from './operations/BatchForm'

const COLUMNS = [
  { key: 'backlog',       label: 'Backlog',      statuses: ['backlog', 'scheduled', 'hold'] },
  { key: 'queued',        label: 'In Queue',     statuses: ['queued'] },
  { key: 'in_production', label: 'In Progress',  statuses: ['in_production'] },
  { key: 'packaged',      label: 'Packaged',     statuses: ['packaged'] },
  { key: 'complete',      label: 'Complete',     statuses: ['complete', 'released'] },
]
const COLUMN_STATUS = { backlog: 'backlog', queued: 'queued', in_production: 'in_production', packaged: 'packaged', complete: 'complete' }
const STATUS_NEXT = { backlog: 'queued', scheduled: 'queued', queued: 'in_production', in_production: 'packaged', packaged: 'complete' }
const COL_COLOR = { backlog: '#6b7280', queued: '#d97706', in_production: '#1d4ed8', packaged: '#7e22ce', complete: '#16a34a' }

function colForStatus(status) {
  return COLUMNS.find(c => c.statuses.includes(status))
}

export default function ProductionLanding() {
  const { t } = useTranslation()
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(null)
  const [activeDragId, setActiveDragId] = useState(null)
  const [pendingMove, setPendingMove] = useState(null)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [showNewBatch, setShowNewBatch] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    getDocs(collection(db, 'productionBatches')).then(snap => {
      setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  function colBatches(col) {
    return batches
      .filter(b => col.statuses.includes(b.status))
      .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
  }

  async function advanceBatch(batch) {
    const next = STATUS_NEXT[batch.status]
    if (!next || advancing) return
    if (next === 'in_production') {
      setPendingMove({ batch })
      return
    }
    setAdvancing(batch.id)
    try {
      await updateDoc(doc(db, 'productionBatches', batch.id), { status: next, updatedAt: serverTimestamp() })
      setBatches(prev => prev.map(b => b.id === batch.id ? { ...b, status: next } : b))
    } catch (err) { alert(err.message) }
    setAdvancing(null)
  }

  async function reorderInColumn(activeId, overId, col) {
    const items = colBatches(col)
    const oldIdx = items.findIndex(b => b.id === activeId)
    const newIdx = items.findIndex(b => b.id === overId)
    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return
    const reordered = arrayMove(items, oldIdx, newIdx)
    const orderMap = new Map(reordered.map((b, i) => [b.id, i]))
    setBatches(prev => prev.map(b => orderMap.has(b.id) ? { ...b, sortOrder: orderMap.get(b.id) } : b))
    const wb = writeBatch(db)
    reordered.forEach((b, i) => wb.update(doc(db, 'productionBatches', b.id), { sortOrder: i }))
    await wb.commit()
  }

  async function moveToColumn(activeBatch, dstColKey, overId) {
    const newStatus = COLUMN_STATUS[dstColKey]
    if (!newStatus) return
    const dstItems = colBatches(COLUMNS.find(c => c.key === dstColKey))
    const overIdx = dstItems.findIndex(b => b.id === overId)
    const sortOrder = overIdx >= 0 ? overIdx : dstItems.length
    setBatches(prev => prev.map(b => b.id === activeBatch.id ? { ...b, status: newStatus, sortOrder } : b))
    await updateDoc(doc(db, 'productionBatches', activeBatch.id), { status: newStatus, sortOrder, updatedAt: serverTimestamp() })
  }

  function handleDragStart({ active }) { setActiveDragId(active.id) }

  function handleDragEnd({ active, over }) {
    setActiveDragId(null)
    if (!over || active.id === over.id) return
    const activeBatch = batches.find(b => b.id === active.id)
    if (!activeBatch) return
    const srcCol = colForStatus(activeBatch.status)
    if (!srcCol) return
    const overIsCol = COLUMNS.some(c => c.key === over.id)
    const dstColKey = overIsCol ? over.id : colForStatus(batches.find(b => b.id === over.id)?.status)?.key
    if (!dstColKey) return

    if (srcCol.key === dstColKey) {
      reorderInColumn(active.id, over.id, srcCol)
    } else if (dstColKey === 'in_production' && srcCol.key !== 'in_production') {
      setPendingMove({ batch: activeBatch })
    } else {
      moveToColumn(activeBatch, dstColKey, over.id)
    }
  }

  function handleProductionStarted(updatedBatch) {
    setBatches(prev => prev.map(b => b.id === updatedBatch.id ? updatedBatch : b))
    setPendingMove(null)
  }

  function handleBatchUpdated(updatedBatch) {
    setBatches(prev => prev.map(b => b.id === updatedBatch.id ? updatedBatch : b))
    // keep slide-over open with updated data
    setSelectedBatch(updatedBatch)
  }

  function handleBatchCreated(newBatch) {
    setBatches(prev => [...prev, newBatch])
    setShowNewBatch(false)
  }

  function handleCardClick(batch) {
    setSelectedBatch(batch)
  }

  const activeBatch = activeDragId ? batches.find(b => b.id === activeDragId) : null

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>{t('Production')}</h1>
          <div style={s.quickLinks}>
            <Link to="/operations/client-orders" style={s.qLink}>{t('Client Orders')}</Link>
            <span style={s.dot}>·</span>
            <Link to="/operations/fg-lots" style={s.qLink}>{t('FG Lots')}</Link>
            <span style={s.dot}>·</span>
            <Link to="/operations/sops" style={s.qLink}>{t('SOPs')}</Link>
          </div>
        </div>
        <button style={s.newBtn} onClick={() => setShowNewBatch(true)}>
          + {t('New Work Order')}
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>{t('Loading…')}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={s.board}>
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.key} col={col} batches={colBatches(col)}
                advancing={advancing} onAdvance={advanceBatch} onCardClick={handleCardClick}
              />
            ))}
          </div>
          <DragOverlay>
            {activeBatch && <CardGhost batch={activeBatch} />}
          </DragOverlay>
        </DndContext>
      )}

      {pendingMove && (
        <StartProductionModal
          batch={pendingMove.batch}
          onClose={() => setPendingMove(null)}
          onConfirmed={handleProductionStarted}
        />
      )}

      {selectedBatch && (
        <WorkOrderSlideOver
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
          onUpdated={handleBatchUpdated}
        />
      )}

      {showNewBatch && (
        <Modal title={t('New Work Order')} onClose={() => setShowNewBatch(false)} maxWidth={560}>
          <BatchForm onClose={() => setShowNewBatch(false)} onCreated={handleBatchCreated} />
        </Modal>
      )}
    </div>
  )
}

function KanbanColumn({ col, batches, advancing, onAdvance, onCardClick }) {
  const { t } = useTranslation()
  const { setNodeRef } = useDroppable({ id: col.key })
  const color = COL_COLOR[col.key]
  return (
    <div style={s.column}>
      <div style={{ ...s.colHead, borderTop: `3px solid ${color}` }}>
        <span style={s.colTitle}>{t(col.label)}</span>
        <span style={{ ...s.colBadge, background: color + '18', color }}>{batches.length}</span>
      </div>
      <SortableContext items={batches.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} style={s.colBody}>
          {batches.map(batch => (
            <SortableCard
              key={batch.id} batch={batch}
              canAdvance={!!STATUS_NEXT[batch.status]} advancing={advancing === batch.id}
              onAdvance={() => onAdvance(batch)} onCardClick={onCardClick}
            />
          ))}
          {batches.length === 0 && <div style={s.empty}>—</div>}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableCard({ batch, canAdvance, advancing, onAdvance, onCardClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: batch.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }} {...attributes} {...listeners}>
      <BatchCard batch={batch} canAdvance={canAdvance} advancing={advancing} onAdvance={onAdvance} onCardClick={onCardClick} />
    </div>
  )
}

function BatchCard({ batch, canAdvance, advancing, onAdvance, onCardClick }) {
  const { t } = useTranslation()
  const isHold = batch.status === 'hold'
  return (
    <div style={s.card} onClick={() => onCardClick(batch)}>
      <div style={s.batchNum}>{batch.batchNumber}</div>
      <div style={s.productName}>{batch.productName}</div>
      {(batch.quantityProduced > 0 || batch.sopName) && (
        <div style={s.meta}>
          {batch.quantityProduced > 0 ? `${batch.quantityProduced.toLocaleString()} ${batch.unit}` : ''}
          {batch.sopName ? (batch.quantityProduced > 0 ? ` · ${batch.sopName}` : batch.sopName) : ''}
        </div>
      )}
      {isHold && <span style={s.holdBadge}>{t('Hold')}</span>}
      {canAdvance && !isHold && (
        <div style={s.cardFoot} onClick={e => e.stopPropagation()}>
          <button style={s.advBtn} onClick={onAdvance} disabled={advancing}>
            {advancing ? '…' : '→'}
          </button>
        </div>
      )}
    </div>
  )
}

function CardGhost({ batch }) {
  return (
    <div style={{ ...s.card, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', transform: 'rotate(2deg)', cursor: 'grabbing' }}>
      <div style={s.batchNum}>{batch.batchNumber}</div>
      <div style={s.productName}>{batch.productName}</div>
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '1rem' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 },
  quickLinks: { display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' },
  qLink: { fontSize: '0.8rem', color: '#1d4ed8', textDecoration: 'none' },
  dot: { fontSize: '0.8rem', color: '#d1d5db' },
  newBtn: { background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  board: { display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1.5rem', alignItems: 'flex-start' },
  column: { flex: '1 1 0', minWidth: 148, display: 'flex', flexDirection: 'column', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' },
  colHead: { padding: '0.75rem 0.875rem 0.625rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  colTitle: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#374151' },
  colBadge: { fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 10 },
  colBody: { padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 80 },
  card: { background: '#fff', borderRadius: 8, padding: '0.75rem', border: '1px solid #e5e7eb', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', userSelect: 'none' },
  batchNum: { fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '0.2rem' },
  productName: { fontSize: '0.85rem', fontWeight: 600, color: '#111827', lineHeight: 1.3, marginBottom: '0.3rem' },
  meta: { fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.3 },
  holdBadge: { display: 'inline-block', marginTop: '0.4rem', fontSize: '0.65rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', borderRadius: 4, padding: '0.1rem 0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  cardFoot: { display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' },
  advBtn: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 5, padding: '0.2rem 0.55rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' },
  empty: { color: '#d1d5db', fontSize: '0.9rem', textAlign: 'center', padding: '1.25rem 0' },
}
