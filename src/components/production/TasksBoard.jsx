import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Modal from '../Modal'
import NewTaskModal from './NewTaskModal'

const COLUMNS = [
  { key: 'backlog',     label: 'Backlog',      statuses: ['backlog'] },
  { key: 'queued',      label: 'In Queue',     statuses: ['queued'] },
  { key: 'in_progress', label: 'In Progress',  statuses: ['in_progress'] },
  { key: 'complete',    label: 'Complete',     statuses: ['complete'] },
]
const COLUMN_STATUS = { backlog: 'backlog', queued: 'queued', in_progress: 'in_progress', complete: 'complete' }
const STATUS_NEXT = { backlog: 'queued', queued: 'in_progress', in_progress: 'complete' }
const COL_COLOR = { backlog: '#6b7280', queued: '#d97706', in_progress: '#1d4ed8', complete: '#16a34a' }

function colForStatus(status) {
  return COLUMNS.find(c => c.statuses.includes(status))
}

export default function TasksBoard() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(null)
  const [activeDragId, setActiveDragId] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNew, setShowNew] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    getDocs(collection(db, 'tasks')).then(snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  function colTasks(col) {
    return tasks
      .filter(t => col.statuses.includes(t.status))
      .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
  }

  async function advanceTask(task) {
    const next = STATUS_NEXT[task.status]
    if (!next || advancing) return
    setAdvancing(task.id)
    try {
      await updateDoc(doc(db, 'tasks', task.id), { status: next, updatedAt: serverTimestamp() })
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    } catch (err) { alert(err.message) }
    setAdvancing(null)
  }

  async function reorderInColumn(activeId, overId, col) {
    const items = colTasks(col)
    const oldIdx = items.findIndex(t => t.id === activeId)
    const newIdx = items.findIndex(t => t.id === overId)
    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return
    const reordered = arrayMove(items, oldIdx, newIdx)
    const orderMap = new Map(reordered.map((t, i) => [t.id, i]))
    setTasks(prev => prev.map(t => orderMap.has(t.id) ? { ...t, sortOrder: orderMap.get(t.id) } : t))
    const wb = writeBatch(db)
    reordered.forEach((t, i) => wb.update(doc(db, 'tasks', t.id), { sortOrder: i }))
    await wb.commit()
  }

  async function moveToColumn(activeTask, dstColKey, overId) {
    const newStatus = COLUMN_STATUS[dstColKey]
    if (!newStatus) return
    const dstItems = colTasks(COLUMNS.find(c => c.key === dstColKey))
    const overIdx = dstItems.findIndex(t => t.id === overId)
    const sortOrder = overIdx >= 0 ? overIdx : dstItems.length
    setTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, status: newStatus, sortOrder } : t))
    await updateDoc(doc(db, 'tasks', activeTask.id), { status: newStatus, sortOrder, updatedAt: serverTimestamp() })
  }

  function handleDragStart({ active }) { setActiveDragId(active.id) }

  function handleDragEnd({ active, over }) {
    setActiveDragId(null)
    if (!over || active.id === over.id) return
    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return
    const srcCol = colForStatus(activeTask.status)
    if (!srcCol) return
    const overIsCol = COLUMNS.some(c => c.key === over.id)
    const dstColKey = overIsCol ? over.id : colForStatus(tasks.find(t => t.id === over.id)?.status)?.key
    if (!dstColKey) return

    if (srcCol.key === dstColKey) {
      reorderInColumn(active.id, over.id, srcCol)
    } else {
      moveToColumn(activeTask, dstColKey, over.id)
    }
  }

  const activeDragTask = activeDragId ? tasks.find(t => t.id === activeDragId) : null

  return (
    <div>
      <div style={s.toolbar}>
        <button style={s.newBtn} onClick={() => setShowNew(true)}>+ New Task</button>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading…</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={s.board}>
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.key} col={col} tasks={colTasks(col)}
                advancing={advancing} onAdvance={advanceTask} onCardClick={setSelectedTask}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDragTask && <CardGhost task={activeDragTask} />}
          </DragOverlay>
        </DndContext>
      )}

      {selectedTask && (
        <Modal title={selectedTask.title} onClose={() => setSelectedTask(null)} maxWidth={400}>
          <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
        </Modal>
      )}

      {showNew && (
        <Modal title="New Task" onClose={() => setShowNew(false)} maxWidth={420}>
          <NewTaskModal
            onClose={() => setShowNew(false)}
            onCreated={t => { setTasks(prev => [...prev, t]); setShowNew(false) }}
          />
        </Modal>
      )}
    </div>
  )
}

function TaskDetail({ task }) {
  return (
    <div>
      {task.notes && (
        <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.6, marginBottom: '0.75rem' }}>{task.notes}</p>
      )}
      {!task.notes && <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>No notes.</p>}
      {task.createdBy && (
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
          Added by {task.createdBy.displayName || task.createdBy.email}
        </p>
      )}
    </div>
  )
}

function KanbanColumn({ col, tasks, advancing, onAdvance, onCardClick }) {
  const { setNodeRef } = useDroppable({ id: col.key })
  const color = COL_COLOR[col.key]
  return (
    <div style={s.column}>
      <div style={{ ...s.colHead, borderTop: `3px solid ${color}` }}>
        <span style={s.colTitle}>{col.label}</span>
        <span style={{ ...s.colBadge, background: color + '18', color }}>{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} style={s.colBody}>
          {tasks.map(task => (
            <SortableCard
              key={task.id} task={task}
              canAdvance={!!STATUS_NEXT[task.status]} advancing={advancing === task.id}
              onAdvance={() => onAdvance(task)} onCardClick={onCardClick}
            />
          ))}
          {tasks.length === 0 && <div style={s.empty}>—</div>}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableCard({ task, canAdvance, advancing, onAdvance, onCardClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }} {...attributes} {...listeners}>
      <TaskCard task={task} canAdvance={canAdvance} advancing={advancing} onAdvance={onAdvance} onCardClick={onCardClick} />
    </div>
  )
}

function TaskCard({ task, canAdvance, advancing, onAdvance, onCardClick }) {
  return (
    <div style={s.card} onClick={() => onCardClick(task)}>
      <div style={s.taskTitle}>{task.title}</div>
      {task.notes && (
        <div style={{ ...s.meta, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.notes}</div>
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

function CardGhost({ task }) {
  return (
    <div style={{ ...s.card, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', transform: 'rotate(2deg)', cursor: 'grabbing' }}>
      <div style={s.taskTitle}>{task.title}</div>
    </div>
  )
}

const s = {
  toolbar: { display: 'flex', justifyContent: 'flex-end', marginBottom: '0.875rem' },
  newBtn: { background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' },
  board: { display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1.5rem', alignItems: 'flex-start' },
  column: { flex: '1 1 0', minWidth: 148, display: 'flex', flexDirection: 'column', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' },
  colHead: { padding: '0.75rem 0.875rem 0.625rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  colTitle: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#374151' },
  colBadge: { fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 10 },
  colBody: { padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 80 },
  card: { background: '#fff', borderRadius: 8, padding: '0.75rem', border: '1px solid #e5e7eb', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', userSelect: 'none' },
  taskTitle: { fontSize: '0.875rem', fontWeight: 600, color: '#111827', lineHeight: 1.3, marginBottom: '0.2rem' },
  meta: { fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.3 },
  cardFoot: { display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' },
  advBtn: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 5, padding: '0.2rem 0.55rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' },
  empty: { color: '#d1d5db', fontSize: '0.9rem', textAlign: 'center', padding: '1.25rem 0' },
}
