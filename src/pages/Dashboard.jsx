import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, where, getDocs,
  doc, getDoc, setDoc, addDoc, updateDoc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { todayString, formatDate } from '../utils/format'
import { getWeekStart, weekLabel, weekStartStr } from '../utils/timecard'
import { card, badge, btn, input } from '../styles/common'

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  in_production: 'In Production',
  complete: 'Complete',
  hold: 'Hold',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { currentUser, isAdmin, hasTimecard } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const today = todayString()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const now = new Date()

    const [
      dailySnap, preOpSnap, openCASnap,
      activeBatchSnap, scheduledBatchSnap, holdBatchSnap,
      todayLogsSnap,
      holdLotsSnap,
      shoppingSnap,
      reviewSettingsSnap, availableLotsSnap,
    ] = await Promise.all([
      getDocs(query(collection(db, 'inspections'), where('type', '==', 'daily_facility'), where('date', '==', today))),
      getDocs(query(collection(db, 'inspections'), where('type', '==', 'pre_operational'), where('date', '==', today))),
      getDocs(query(collection(db, 'correctiveActions'), where('status', 'in', ['open', 'in_progress']))),
      getDocs(query(collection(db, 'productionBatches'), where('status', '==', 'in_production'))),
      getDocs(query(collection(db, 'productionBatches'), where('status', '==', 'scheduled'))),
      getDocs(query(collection(db, 'productionBatches'), where('status', '==', 'hold'))),
      getDocs(query(collection(db, 'productionLogs'), where('startTime', '>=', Timestamp.fromDate(todayStart)))),
      getDocs(query(collection(db, 'ingredientLots'), where('status', '==', 'hold'))),
      getDocs(query(collection(db, 'shoppingList'), where('status', 'in', ['pending', 'ordered']))),
      getDoc(doc(db, 'settings', 'inventoryReview')),
      getDocs(query(collection(db, 'ingredientLots'), where('status', '==', 'available'))),
    ])

    const openCAs = openCASnap.docs.map(d => ({ id: d.id, ...d.data() }))
    const overdueCAs = openCAs.filter(ca => ca.dueDate && ca.dueDate.toDate() < now)

    const activeBatches = activeBatchSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    const todayLogBatchIds = new Set(todayLogsSnap.docs.map(d => d.data().batchId))
    const batchesNeedingLog = new Set(
      activeBatches.filter(b => !todayLogBatchIds.has(b.id)).map(b => b.id)
    )

    const reviewSettings = reviewSettingsSnap.exists() ? reviewSettingsSnap.data() : null
    const daysSinceReview = reviewSettings?.lastReviewedAt
      ? Math.floor((now - reviewSettings.lastReviewedAt.toDate()) / (1000 * 60 * 60 * 24))
      : null
    const reviewDue = daysSinceReview === null || daysSinceReview >= 7

    const availableLots = availableLotsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(l => l.currentQuantity > 0)
      .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))

    const shoppingItems = shoppingSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
        return (b.addedAt?.toDate?.() || 0) - (a.addedAt?.toDate?.() || 0)
      })

    let timecardDue = false
    if (hasTimecard && currentUser) {
      const prevWeek = getWeekStart()
      prevWeek.setDate(prevWeek.getDate() - 7)
      const tcSnap = await getDocs(query(
        collection(db, 'timecards'),
        where('userId', '==', currentUser.uid),
        where('weekStartStr', '==', weekStartStr(prevWeek))
      ))
      timecardDue = tcSnap.empty
    }

    setData({
      dailyDone: !dailySnap.empty,
      preOpDone: !preOpSnap.empty,
      overdueCACount: overdueCAs.length,
      openCACount: openCAs.length,
      activeBatches,
      scheduledBatches: scheduledBatchSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      holdBatches: holdBatchSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      batchesNeedingLog,
      holdLots: holdLotsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      shoppingItems,
      timecardDue,
      reviewDue,
      daysSinceReview,
      availableLots,
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const needsActionCount = !data ? 0 :
    data.overdueCACount + data.holdBatches.length + data.holdLots.length

  return (
    <div>
      <h1 style={pageTitle}>Dashboard</h1>

      {/* Quick Actions */}
      <div style={quickGrid}>
        <QuickBtn label="Start Production Batch" icon="🍬" onClick={() => navigate('/operations/batches/new')} />
        <QuickBtn label="Receive Ingredients" icon="📦" onClick={() => navigate('/operations/receive')} />
        <QuickBtn label="Log Today's Run" icon="📋" onClick={() => navigate('/operations/logs/new')} />
      </div>

      {/* Today's Tasks */}
      <div style={card}>
        <h2 style={sectionTitle}>Today's Tasks</h2>
        {loading ? <p style={muted}>Loading…</p> : (
          <div>
            <TaskRow done={data.dailyDone} label="Daily Facility Inspection" path="/inspections/new/daily_facility" navigate={navigate} />
            <TaskRow done={data.preOpDone} label="Pre-Operational Inspection" path="/inspections/new/pre_operational" navigate={navigate} />
          </div>
        )}
      </div>

      {/* Timecard reminder */}
      {!loading && data.timecardDue && (
        <div style={{ ...card, borderLeft: '4px solid #7c3aed', cursor: 'pointer' }} onClick={() => navigate('/timecard')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>⏱ Timecard due</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.15rem' }}>
                {weekLabel((() => { const d = getWeekStart(); d.setDate(d.getDate() - 7); return d })())} hasn't been submitted yet.
              </div>
            </div>
            <span style={{ color: '#7c3aed', fontSize: '0.85rem', fontWeight: 600 }}>Submit →</span>
          </div>
        </div>
      )}

      {/* Needs Action */}
      {!loading && needsActionCount > 0 && (
        <div style={{ ...card, borderLeft: '4px solid #dc2626' }}>
          <h2 style={sectionTitle}>Needs Action</h2>
          {data.overdueCACount > 0 && (
            <IssueRow color="#dc2626"
              label={`${data.overdueCACount} overdue corrective action${data.overdueCACount > 1 ? 's' : ''}`}
              onClick={() => navigate('/corrective-actions')} />
          )}
          {data.openCACount > data.overdueCACount && (
            <IssueRow color="#d97706"
              label={`${data.openCACount - data.overdueCACount} open corrective action${data.openCACount - data.overdueCACount > 1 ? 's' : ''}`}
              onClick={() => navigate('/corrective-actions')} />
          )}
          {data.holdBatches.map(b => (
            <IssueRow key={b.id} color="#d97706"
              label={`Batch ${b.batchNumber} on hold — ${b.productName}`}
              onClick={() => navigate(`/operations/batches/${b.id}`)} />
          ))}
          {data.holdLots.map(l => (
            <IssueRow key={l.id} color="#d97706"
              label={`Lot ${l.internalLotNumber} on hold — ${l.ingredientName}`}
              onClick={() => navigate(`/operations/lots/${l.id}`)} />
          ))}
        </div>
      )}

      {/* Active Batches */}
      {!loading && (data.activeBatches.length > 0 || data.scheduledBatches.length > 0) && (
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={{ ...sectionTitle, marginBottom: 0 }}>Active Batches</h2>
            <button style={linkBtn} onClick={() => navigate('/operations/batches')}>View All</button>
          </div>
          {[...data.activeBatches, ...data.scheduledBatches].map(b => {
            const needsLog = data.batchesNeedingLog.has(b.id)
            return (
              <div key={b.id} onClick={() => navigate(`/operations/batches/${b.id}`)}
                style={rowStyle}>
                <div>
                  <span style={subLabel}>{b.batchNumber}</span>
                  <span style={rowLabel}>{b.productName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {needsLog && <span style={logNeededBadge}>Log needed</span>}
                  <span style={badge[b.status] || badge.pending}>{STATUS_LABELS[b.status] || b.status}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Shopping List */}
      {!loading && (
        <ShoppingList items={data.shoppingItems} currentUser={currentUser} onUpdate={load} />
      )}

      {/* Inventory Review */}
      {!loading && (
        <InventoryReview
          reviewDue={data.reviewDue}
          daysSinceReview={data.daysSinceReview}
          availableLots={data.availableLots}
          currentUser={currentUser}
          navigate={navigate}
          onComplete={load}
        />
      )}
    </div>
  )
}

// ── Shopping List ─────────────────────────────────────────────────────────────

function ShoppingList({ items, currentUser, onUpdate }) {
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(null) // item id being updated

  async function addItem(e) {
    e.preventDefault()
    if (!text.trim()) return
    setAdding(true)
    try {
      await addDoc(collection(db, 'shoppingList'), {
        text: text.trim(),
        status: 'pending',
        addedBy: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email,
          email: currentUser.email,
        },
        addedAt: serverTimestamp(),
      })
      setText('')
      await onUpdate()
    } catch (err) {
      alert(`Failed: ${err.message}`)
    }
    setAdding(false)
  }

  async function setStatus(id, status) {
    setBusy(id)
    try {
      await updateDoc(doc(db, 'shoppingList', id), { status })
      await onUpdate()
    } catch (err) {
      alert(`Failed: ${err.message}`)
    }
    setBusy(null)
  }

  return (
    <div style={card}>
      <h2 style={sectionTitle}>Shopping List</h2>
      <form onSubmit={addItem} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          style={{ ...input, marginBottom: 0, flex: 1, fontSize: '0.95rem', padding: '0.55rem 0.75rem' }}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add item…"
        />
        <button type="submit" disabled={adding || !text.trim()}
          style={{ ...btn.primary, padding: '0.55rem 1rem', fontSize: '0.9rem' }}>
          Add
        </button>
      </form>
      {items.length === 0 && <p style={muted}>Nothing on the list.</p>}
      {items.map(item => (
        <div key={item.id} style={{ ...rowStyle, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.9rem', color: '#111827' }}>{item.text}</span>
            {item.status === 'ordered' && (
              <span style={orderedBadge}>Ordered</span>
            )}
            <span style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.1rem' }}>
              {item.addedBy?.displayName || item.addedBy?.email}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.1rem' }}>
            {item.status === 'pending' && (
              <button style={smBtn} disabled={busy === item.id}
                onClick={() => setStatus(item.id, 'ordered')}>
                Ordered
              </button>
            )}
            <button
              style={{ ...smBtn, background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
              disabled={busy === item.id}
              onClick={() => setStatus(item.id, 'done')}>
              ✓ Done
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Inventory Review ──────────────────────────────────────────────────────────

function InventoryReview({ reviewDue, daysSinceReview, availableLots, currentUser, navigate, onComplete }) {
  const [completing, setCompleting] = useState(false)

  async function markComplete() {
    setCompleting(true)
    try {
      await setDoc(doc(db, 'settings', 'inventoryReview'), {
        lastReviewedAt: serverTimestamp(),
        lastReviewedBy: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email,
          email: currentUser.email,
        },
      })
      await onComplete()
    } catch (err) {
      alert(`Failed: ${err.message}`)
    }
    setCompleting(false)
  }

  return (
    <div style={{ ...card, borderLeft: `4px solid ${reviewDue ? '#f59e0b' : '#e5e7eb'}` }}>
      <div style={cardHeader}>
        <h2 style={{ ...sectionTitle, marginBottom: 0 }}>Inventory Review</h2>
        {reviewDue
          ? <span style={dueBadge}>DUE</span>
          : <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {daysSinceReview === 0 ? 'Reviewed today' : `${daysSinceReview}d ago`}
            </span>
        }
      </div>

      {reviewDue ? (
        <>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.5rem 0 0.75rem' }}>
            Walk the floor and verify quantities. Tap a lot to adjust if needed.
          </p>
          {availableLots.length === 0
            ? <p style={muted}>No inventory on hand.</p>
            : availableLots.map(lot => (
                <div key={lot.id} onClick={() => navigate(`/operations/lots/${lot.id}`)} style={rowStyle}>
                  <div>
                    <span style={rowLabel}>{lot.ingredientName}</span>
                    <span style={subLabel}>{lot.internalLotNumber} · {lot.storageLocation}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.9rem' }}>
                    {lot.currentQuantity.toLocaleString()} {lot.unit}
                  </span>
                </div>
              ))
          }
          <button style={{ ...btn.success, width: '100%', marginTop: '0.75rem', fontSize: '0.95rem', padding: '0.75rem' }}
            onClick={markComplete} disabled={completing}>
            {completing ? 'Saving…' : '✓ Mark Review Complete'}
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            {availableLots.length} lot{availableLots.length !== 1 ? 's' : ''} on hand
          </span>
          <button style={linkBtn} onClick={() => navigate('/operations/lots')}>View Lots</button>
        </div>
      )}
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function QuickBtn({ label, icon, onClick }) {
  return (
    <button onClick={onClick} style={quickBtn}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', lineHeight: 1.2 }}>{label}</span>
    </button>
  )
}

function TaskRow({ done, label, path, navigate }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.1rem' }}>{done ? '✅' : '⏳'}</span>
        <span style={{ fontSize: '0.95rem', color: done ? '#6b7280' : '#111827' }}>{label}</span>
      </div>
      {!done && <button style={startBtn} onClick={() => navigate(path)}>Start</button>}
    </div>
  )
}

function IssueRow({ color, label, onClick }) {
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '0.9rem', color: '#374151' }}>{label}</span>
      <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: '0.8rem' }}>→</span>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#111827' }
const sectionTitle = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }
const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }
const rowLabel = { fontSize: '0.9rem', color: '#374151', display: 'block' }
const subLabel = { fontSize: '0.72rem', color: '#9ca3af', display: 'block' }
const quickGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }
const quickBtn = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: '0.4rem', padding: '1rem 0.5rem',
  background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10,
  cursor: 'pointer', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}
const startBtn = {
  background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer',
}
const linkBtn = {
  background: 'transparent', border: 'none', color: '#1d4ed8',
  fontSize: '0.8rem', cursor: 'pointer', padding: 0,
}
const smBtn = {
  background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb',
  borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer',
}
const logNeededBadge = {
  fontSize: '0.7rem', background: '#fef3c7', color: '#92400e',
  padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 600,
}
const dueBadge = {
  fontSize: '0.72rem', background: '#fef3c7', color: '#92400e',
  padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 600,
}
const orderedBadge = {
  fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af',
  padding: '0.1rem 0.4rem', borderRadius: 4, marginLeft: '0.4rem', fontWeight: 600,
}
