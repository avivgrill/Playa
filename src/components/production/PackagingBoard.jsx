import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Modal from '../Modal'
import NewPackagingOrderModal from './NewPackagingOrderModal'
import CompletePackagingModal from './CompletePackagingModal'

const COLUMNS = [
  { key: 'backlog',   label: 'Backlog',       statuses: ['backlog'] },
  { key: 'queued',    label: 'In Queue',      statuses: ['queued'] },
  { key: 'wrapping',  label: 'Being Wrapped', statuses: ['wrapping'] },
  { key: 'complete',  label: 'Complete',      statuses: ['complete'] },
]
const COLUMN_STATUS = { backlog: 'backlog', queued: 'queued', wrapping: 'wrapping', complete: 'complete' }
const STATUS_NEXT = { backlog: 'queued', queued: 'wrapping', wrapping: 'complete' }
const COL_COLOR = { backlog: '#6b7280', queued: '#d97706', wrapping: '#7e22ce', complete: '#16a34a' }

function colForStatus(status) {
  return COLUMNS.find(c => c.statuses.includes(status))
}

export default function PackagingBoard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(null)
  const [activeDragId, setActiveDragId] = useState(null)
  const [pendingComplete, setPendingComplete] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showNew, setShowNew] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    getDocs(collection(db, 'packagingOrders')).then(snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  function colOrders(col) {
    return orders
      .filter(o => col.statuses.includes(o.status))
      .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
  }

  async function advanceOrder(order) {
    const next = STATUS_NEXT[order.status]
    if (!next || advancing) return
    if (next === 'complete') { setPendingComplete(order); return }
    setAdvancing(order.id)
    try {
      await updateDoc(doc(db, 'packagingOrders', order.id), { status: next, updatedAt: serverTimestamp() })
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o))
    } catch (err) { alert(err.message) }
    setAdvancing(null)
  }

  async function reorderInColumn(activeId, overId, col) {
    const items = colOrders(col)
    const oldIdx = items.findIndex(o => o.id === activeId)
    const newIdx = items.findIndex(o => o.id === overId)
    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return
    const reordered = arrayMove(items, oldIdx, newIdx)
    const orderMap = new Map(reordered.map((o, i) => [o.id, i]))
    setOrders(prev => prev.map(o => orderMap.has(o.id) ? { ...o, sortOrder: orderMap.get(o.id) } : o))
    const wb = writeBatch(db)
    reordered.forEach((o, i) => wb.update(doc(db, 'packagingOrders', o.id), { sortOrder: i }))
    await wb.commit()
  }

  async function moveToColumn(activeOrder, dstColKey, overId) {
    const newStatus = COLUMN_STATUS[dstColKey]
    if (!newStatus) return
    const dstItems = colOrders(COLUMNS.find(c => c.key === dstColKey))
    const overIdx = dstItems.findIndex(o => o.id === overId)
    const sortOrder = overIdx >= 0 ? overIdx : dstItems.length
    setOrders(prev => prev.map(o => o.id === activeOrder.id ? { ...o, status: newStatus, sortOrder } : o))
    await updateDoc(doc(db, 'packagingOrders', activeOrder.id), { status: newStatus, sortOrder, updatedAt: serverTimestamp() })
  }

  function handleDragStart({ active }) { setActiveDragId(active.id) }

  function handleDragEnd({ active, over }) {
    setActiveDragId(null)
    if (!over || active.id === over.id) return
    const activeOrder = orders.find(o => o.id === active.id)
    if (!activeOrder) return
    const srcCol = colForStatus(activeOrder.status)
    if (!srcCol) return
    const overIsCol = COLUMNS.some(c => c.key === over.id)
    const dstColKey = overIsCol ? over.id : colForStatus(orders.find(o => o.id === over.id)?.status)?.key
    if (!dstColKey) return

    if (srcCol.key === dstColKey) {
      reorderInColumn(active.id, over.id, srcCol)
    } else if (dstColKey === 'complete' && srcCol.key !== 'complete') {
      setPendingComplete(activeOrder)
    } else {
      moveToColumn(activeOrder, dstColKey, over.id)
    }
  }

  function handleCompleteConfirmed(updated) {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
    setPendingComplete(null)
  }

  function handleCreated(newOrder) {
    setOrders(prev => [...prev, newOrder])
    setShowNew(false)
  }

  const activeOrder = activeDragId ? orders.find(o => o.id === activeDragId) : null

  return (
    <div>
      <div style={s.toolbar}>
        <button style={s.newBtn} onClick={() => setShowNew(true)}>+ New Packaging Order</button>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading…</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={s.board}>
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.key} col={col} orders={colOrders(col)}
                advancing={advancing} onAdvance={advanceOrder} onCardClick={setSelectedOrder}
              />
            ))}
          </div>
          <DragOverlay>
            {activeOrder && <CardGhost order={activeOrder} />}
          </DragOverlay>
        </DndContext>
      )}

      {pendingComplete && (
        <Modal title="Complete Packaging" onClose={() => setPendingComplete(null)} maxWidth={400}>
          <CompletePackagingModal
            order={pendingComplete}
            onClose={() => setPendingComplete(null)}
            onConfirmed={handleCompleteConfirmed}
          />
        </Modal>
      )}

      {selectedOrder && (
        <Modal title={`Order — ${selectedOrder.clientName || selectedOrder.candyName}`} onClose={() => setSelectedOrder(null)} maxWidth={480}>
          <OrderDetail
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onDeleted={id => { setOrders(prev => prev.filter(o => o.id !== id)); setSelectedOrder(null) }}
          />
        </Modal>
      )}

      {showNew && (
        <Modal title="New Packaging Order" onClose={() => setShowNew(false)} maxWidth={520}>
          <NewPackagingOrderModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
        </Modal>
      )}
    </div>
  )
}

const FORMAT_LABELS = {
  bulk_packaged: 'Bulk Packaged',
  flow_wrapped: 'Flow Wrapped',
  flow_wrap_boxed: 'Flow Wrap + Boxed',
  flow_wrap_boxed_display: 'Flow Wrap + Boxed + Display Box',
}

function OrderDetail({ order, onDeleted }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm('Delete this packaging order? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'packagingOrders', order.id))
      onDeleted(order.id)
    } catch (err) {
      alert(err.message)
      setDeleting(false)
    }
  }

  return (
    <div>
      {order.batchNumber && <Row label="Batch #" value={order.batchNumber} />}
      {order.candyName && <Row label="Product" value={order.candyName} />}
      {order.quantity != null && <Row label="Quantity" value={`${order.quantity} ${order.unit}`} />}
      {order.packagingFormat && <Row label="Format" value={FORMAT_LABELS[order.packagingFormat] || order.packagingFormat} />}
      {order.clientName && <Row label="Client" value={order.clientName} />}
      {order.packagingInstructions && (
        <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={rowLabel}>Instructions</span>
          <p style={{ fontSize: '0.875rem', color: '#374151', marginTop: '0.25rem', lineHeight: 1.5 }}>{order.packagingInstructions}</p>
        </div>
      )}
      {order.finalCount != null && (
        <Row label="Final Count" value={`${order.finalCount.toLocaleString()} ${order.finalUnit}`} />
      )}
      {order.createdBy && <Row label="Created by" value={order.createdBy.displayName || order.createdBy.email} />}
      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
        <button
          style={{ background: 'transparent', border: '1px solid #dc2626', color: '#dc2626', borderRadius: 7, padding: '0.4rem 0.875rem', fontSize: '0.825rem', cursor: 'pointer' }}
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete Order'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem', gap: '1rem' }}>
      <span style={rowLabel}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 500, textAlign: 'right', flex: 1 }}>{value}</span>
    </div>
  )
}

function KanbanColumn({ col, orders, advancing, onAdvance, onCardClick }) {
  const { setNodeRef } = useDroppable({ id: col.key })
  const color = COL_COLOR[col.key]
  return (
    <div style={s.column}>
      <div style={{ ...s.colHead, borderTop: `3px solid ${color}` }}>
        <span style={s.colTitle}>{col.label}</span>
        <span style={{ ...s.colBadge, background: color + '18', color }}>{orders.length}</span>
      </div>
      <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} style={s.colBody}>
          {orders.map(order => (
            <SortableCard
              key={order.id} order={order}
              canAdvance={!!STATUS_NEXT[order.status]} advancing={advancing === order.id}
              onAdvance={() => onAdvance(order)} onCardClick={onCardClick}
            />
          ))}
          {orders.length === 0 && <div style={s.empty}>—</div>}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableCard({ order, canAdvance, advancing, onAdvance, onCardClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }} {...attributes} {...listeners}>
      <OrderCard order={order} canAdvance={canAdvance} advancing={advancing} onAdvance={onAdvance} onCardClick={onCardClick} />
    </div>
  )
}

const FORMAT_SHORT = {
  bulk_packaged: 'Bulk',
  flow_wrapped: 'Flow Wrap',
  flow_wrap_boxed: 'Flow Wrap + Box',
  flow_wrap_boxed_display: 'Flow Wrap + Box + Display',
}

function OrderCard({ order, canAdvance, advancing, onAdvance, onCardClick }) {
  return (
    <div style={s.card} onClick={() => onCardClick(order)}>
      {order.batchNumber && <div style={s.batchNum}>{order.batchNumber}</div>}
      <div style={s.clientName}>{order.candyName || '—'}</div>
      {order.clientName && <div style={{ ...s.meta, marginBottom: '0.1rem' }}>📦 {order.clientName}</div>}
      {order.packagingFormat && <div style={{ ...s.meta, color: '#7e22ce' }}>{FORMAT_SHORT[order.packagingFormat] || order.packagingFormat}</div>}
      {order.quantity != null && (
        <div style={{ ...s.meta, marginTop: '0.1rem' }}>{order.quantity} {order.unit}</div>
      )}
      {order.finalCount != null && (
        <div style={{ ...s.meta, marginTop: '0.25rem', color: '#16a34a', fontWeight: 600 }}>
          ✓ {order.finalCount.toLocaleString()} {order.finalUnit}
        </div>
      )}
      {canAdvance && (
        <div style={s.cardFoot} onClick={e => e.stopPropagation()}>
          <button style={s.advBtn} onClick={onAdvance} disabled={advancing}>
            {advancing ? '…' : '→'}
          </button>
        </div>
      )}
    </div>
  )
}

function CardGhost({ order }) {
  return (
    <div style={{ ...s.card, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', transform: 'rotate(2deg)', cursor: 'grabbing' }}>
      {order.batchNumber && <div style={s.batchNum}>{order.batchNumber}</div>}
      <div style={s.clientName}>{order.candyName || order.clientName}</div>
    </div>
  )
}

const rowLabel = { color: '#6b7280', flexShrink: 0 }

const s = {
  toolbar: { display: 'flex', justifyContent: 'flex-end', marginBottom: '0.875rem' },
  newBtn: { background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' },
  board: { display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1.5rem', alignItems: 'flex-start' },
  column: { flex: '1 1 0', minWidth: 148, display: 'flex', flexDirection: 'column', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' },
  colHead: { padding: '0.75rem 0.875rem 0.625rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  colTitle: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#374151' },
  colBadge: { fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 10 },
  colBody: { padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 80 },
  card: { background: '#fff', borderRadius: 8, padding: '0.75rem', border: '1px solid #e5e7eb', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', userSelect: 'none' },
  batchNum: { fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '0.2rem' },
  clientName: { fontSize: '0.85rem', fontWeight: 600, color: '#111827', lineHeight: 1.3, marginBottom: '0.2rem' },
  meta: { fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.3 },
  cardFoot: { display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' },
  advBtn: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 5, padding: '0.2rem 0.55rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' },
  empty: { color: '#d1d5db', fontSize: '0.9rem', textAlign: 'center', padding: '1.25rem 0' },
}
