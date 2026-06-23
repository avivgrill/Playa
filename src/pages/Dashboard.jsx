import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, where, getDocs,
  doc, addDoc, updateDoc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { todayString, formatDate } from '../utils/format'
import { getWeekStart, weekLabel, weekStartStr } from '../utils/timecard'
import { card, badge, btn, input } from '../styles/common'
import { useTranslation } from 'react-i18next'
import Modal from '../components/Modal'
import NewCleaningLog from './cleaning/NewCleaningLog'
import StartInspection from './inspections/StartInspection'
import BatchForm from './operations/BatchForm'
import ReceiveInventory from './operations/ReceiveInventory'
import BatchDetail from './operations/BatchDetail'

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  in_production: 'In Production',
  complete: 'Complete',
  hold: 'Hold',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { currentUser, isAdmin, hasTimecard } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState(null)
  const [activeBatchId, setActiveBatchId] = useState(null)
  // null | 'cleaning' | 'newBatch' | 'receiveInventory' | 'daily_facility' | 'pre_operational'

  async function load() {
    const today = todayString()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const now = new Date()

    const [
      dailySnap, preOpSnap, openCASnap,
      activeBatchSnap, scheduledBatchSnap, holdBatchSnap,
      holdLotsSnap,
      shoppingSnap,
      remindersSnap,
    ] = await Promise.all([
      getDocs(query(collection(db, 'inspections'), where('type', '==', 'daily_facility'), where('date', '==', today))),
      getDocs(query(collection(db, 'inspections'), where('type', '==', 'pre_operational'), where('date', '==', today))),
      getDocs(query(collection(db, 'correctiveActions'), where('status', 'in', ['open', 'in_progress']))),
      getDocs(query(collection(db, 'productionBatches'), where('status', '==', 'in_production'))),
      getDocs(query(collection(db, 'productionBatches'), where('status', '==', 'scheduled'))),
      getDocs(query(collection(db, 'productionBatches'), where('status', '==', 'hold'))),
      getDocs(query(collection(db, 'ingredientLots'), where('status', '==', 'hold'))),
      getDocs(query(collection(db, 'shoppingList'), where('status', 'in', ['pending', 'ordered']))),
      getDocs(query(collection(db, 'reminders'), where('status', '==', 'open'))),
    ])

    const openCAs = openCASnap.docs.map(d => ({ id: d.id, ...d.data() }))
    const overdueCAs = openCAs.filter(ca => ca.dueDate && ca.dueDate.toDate() < now)
    const activeBatches = activeBatchSnap.docs.map(d => ({ id: d.id, ...d.data() }))

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

    const reminders = remindersSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.addedAt?.toDate?.() || 0) - (a.addedAt?.toDate?.() || 0))

    setData({
      dailyDone: !dailySnap.empty,
      preOpDone: !preOpSnap.empty,
      overdueCACount: overdueCAs.length,
      openCACount: openCAs.length,
      activeBatches,
      scheduledBatches: scheduledBatchSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      holdBatches: holdBatchSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      holdLots: holdLotsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      shoppingItems,
      reminders,
      timecardDue,
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const needsActionCount = !data ? 0 :
    data.overdueCACount + data.holdBatches.length + data.holdLots.length

  const now = new Date()
  const greetingKey = now.getHours() < 12 ? 'Good morning, {{name}}.' : now.getHours() < 17 ? 'Good afternoon, {{name}}.' : 'Good evening, {{name}}.'
  const firstName = currentUser?.displayName?.split(' ')[0] || currentUser?.email?.split('@')[0] || ''

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={pageTitle}>{t(greetingKey, { name: firstName || '' }).replace(', .', '.')}</h1>
        <p style={dateLabel}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Zone 1: Status bar */}
      {!loading && data && (
        <div style={statusBar}>
          <StatusChip
            done={data.dailyDone} warn={false}
            label={t('Daily')} sublabel={data.dailyDone ? t('Done') : t('Needed')}
            onClick={() => data.dailyDone ? navigate('/inspections') : setActiveModal('daily_facility')}
          />
          <StatusChip
            done={data.preOpDone} warn={false}
            label={t('Pre-Op')} sublabel={data.preOpDone ? t('Done') : t('Needed')}
            onClick={() => data.preOpDone ? navigate('/inspections') : setActiveModal('pre_operational')}
          />
          <StatusChip
            done={data.openCACount === 0}
            warn={data.overdueCACount > 0}
            label={t('CAs')}
            sublabel={data.openCACount === 0 ? t('Clear') : data.overdueCACount > 0 ? t('{{count}} open · {{overdue}} overdue', { count: data.openCACount, overdue: data.overdueCACount }) : t('{{count}} open', { count: data.openCACount })}
            onClick={() => navigate('/corrective-actions')}
          />
          <StatusChip
            done={data.activeBatches.length > 0}
            warn={false}
            label={t('Batches')}
            sublabel={data.activeBatches.length > 0 ? t('{{count}} running', { count: data.activeBatches.length }) : t('None active')}
            onClick={() => navigate('/production')}
            neutral={data.activeBatches.length === 0}
          />
        </div>
      )}

      {/* Zone 2: Needs Action */}
      {!loading && needsActionCount > 0 && (
        <div style={{ ...card, borderLeft: '4px solid #dc2626', marginBottom: '1rem' }}>
          <h2 style={sectionTitle}>{t('Needs Action')}</h2>
          {data.overdueCACount > 0 && (
            <IssueRow color="#dc2626"
              label={data.overdueCACount === 1 ? t('overdue corrective action') : t('overdue corrective actions')}
              count={data.overdueCACount}
              onClick={() => navigate('/corrective-actions')} />
          )}
          {data.openCACount > data.overdueCACount && (
            <IssueRow color="#d97706"
              label={(data.openCACount - data.overdueCACount) === 1 ? t('open corrective action') : t('open corrective actions')}
              count={data.openCACount - data.overdueCACount}
              onClick={() => navigate('/corrective-actions')} />
          )}
          {data.holdBatches.map(b => (
            <IssueRow key={b.id} color="#d97706"
              label={`${b.batchNumber} · ` + t('on hold — {{product}}', { product: b.productName })}
              onClick={() => navigate(`/operations/batches/${b.id}`)} />
          ))}
          {data.holdLots.map(l => (
            <IssueRow key={l.id} color="#d97706"
              label={`${l.internalLotNumber} · ` + t('on hold — {{product}}', { product: l.ingredientName })}
              onClick={() => navigate(`/operations/lots/${l.id}`)} />
          ))}
        </div>
      )}

      {/* Zone 3: Today's tasks + Quick actions (two-column on desktop) */}
      <div style={twoCol}>
        <div style={{ ...card, marginBottom: 0 }}>
          <h2 style={sectionTitle}>{t("Today's Tasks")}</h2>
          {loading ? <p style={muted}>{t('Loading…')}</p> : (
            <div>
              <TaskRow done={data.dailyDone} label={t('Daily Facility Inspection')} onStart={() => setActiveModal('daily_facility')} navigate={navigate} />
              <TaskRow done={data.preOpDone} label={t('Pre-Op Inspection')} onStart={() => setActiveModal('pre_operational')} navigate={navigate} />
              {data.timecardDue && (
                <TaskRow done={false} label={t("Submit Last Week's Timecard")} path="/timecard" navigate={navigate} />
              )}
            </div>
          )}
        </div>

        <div style={quickPanel}>
          <h2 style={sectionTitle}>{t('Quick Actions')}</h2>
          <div className="form-row" style={{ gap: '0.5rem' }}>
            <QuickBtn label={t('New Batch')} icon="🍬" onClick={() => setActiveModal('newBatch')} />
            <QuickBtn label={t('Receive Stock')} icon="📦" onClick={() => setActiveModal('receiveInventory')} />
            <QuickBtn label={t('Cleaning Log')} icon="🧹" onClick={() => setActiveModal('cleaning')} />
          </div>
        </div>
      </div>

      {/* Zone 4: Active Batches */}
      {!loading && (data?.activeBatches.length > 0 || data?.scheduledBatches.length > 0) && (
        <div style={card}>
          <div style={cardHeader}>
            <h2 style={{ ...sectionTitle, marginBottom: 0 }}>{t('Active Batches')}</h2>
            <button style={linkBtn} onClick={() => navigate('/operations/batches')}>{t('View All')}</button>
          </div>
          {[...data.activeBatches, ...data.scheduledBatches].map(b => (
            <div key={b.id} onClick={() => setActiveBatchId(b.id)} style={rowStyle}>
              <div>
                <span style={subLabel}>{b.batchNumber}</span>
                <span style={rowLabel}>{b.productName}</span>
              </div>
              <span style={badge[b.status] || badge.pending}>{STATUS_LABELS[b.status] || b.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Zone 5: Reminders + Shopping List */}
      <div style={twoCol}>
        {!loading && <Reminders items={data.reminders} currentUser={currentUser} onUpdate={load} />}
        {!loading && <ShoppingList items={data.shoppingItems} currentUser={currentUser} onUpdate={load} />}
      </div>

      {/* Modals */}
      {activeModal === 'cleaning' && (
        <Modal title={t('New Cleaning Log')} onClose={() => setActiveModal(null)}>
          <NewCleaningLog onClose={() => setActiveModal(null)} />
        </Modal>
      )}
      {activeModal === 'newBatch' && (
        <Modal title={t('New Work Order')} onClose={() => setActiveModal(null)} maxWidth={560}>
          <BatchForm onClose={() => setActiveModal(null)} onCreated={() => setActiveModal(null)} />
        </Modal>
      )}
      {activeModal === 'receiveInventory' && (
        <Modal title={t('Receive Inventory')} onClose={() => setActiveModal(null)} maxWidth={560}>
          <ReceiveInventory onClose={() => setActiveModal(null)} />
        </Modal>
      )}
      {(activeModal === 'daily_facility' || activeModal === 'pre_operational') && (
        <Modal
          title={activeModal === 'daily_facility' ? t('Daily Facility Inspection') : t('Pre-Operational Inspection')}
          onClose={() => { setActiveModal(null); load() }}
          maxWidth={640}
        >
          <StartInspection type={activeModal} onClose={() => { setActiveModal(null); load() }} />
        </Modal>
      )}
      {activeBatchId && (
        <Modal onClose={() => setActiveBatchId(null)} maxWidth={720}>
          <BatchDetail id={activeBatchId} onClose={() => setActiveBatchId(null)} />
        </Modal>
      )}
    </div>
  )
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ done, warn, neutral, label, sublabel, onClick }) {
  const bg = warn ? '#fef2f2' : done ? '#f0fdf4' : neutral ? '#f9fafb' : '#fffbeb'
  const border = warn ? '#fecaca' : done ? '#bbf7d0' : neutral ? '#e5e7eb' : '#fcd34d'
  const iconColor = warn ? '#dc2626' : done ? '#16a34a' : neutral ? '#9ca3af' : '#d97706'
  const icon = warn ? '⚠' : done ? '✓' : neutral ? '—' : '○'
  return (
    <button onClick={onClick} style={{ ...statusChip, background: bg, border: `1.5px solid ${border}` }}>
      <span style={{ fontSize: '1.1rem', color: iconColor, fontWeight: 700, lineHeight: 1 }}>{icon}</span>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827' }}>{label}</div>
        <div style={{ fontSize: '0.7rem', color: warn ? '#dc2626' : done ? '#16a34a' : '#6b7280' }}>{sublabel}</div>
      </div>
    </button>
  )
}

// ── Reminders ─────────────────────────────────────────────────────────────────

function Reminders({ items, currentUser, onUpdate }) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(null)

  async function addReminder(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'reminders'), {
        text: text.trim(),
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate + 'T00:00:00')) : null,
        status: 'open',
        addedBy: { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email },
        addedAt: serverTimestamp(),
      })
      setText(''); setDueDate(''); setAdding(false); await onUpdate()
    } catch (err) { alert(`Failed: ${err.message}`) }
    setSaving(false)
  }

  async function markDone(id) {
    setBusy(id)
    try {
      await updateDoc(doc(db, 'reminders', id), { status: 'done', doneAt: serverTimestamp() })
      await onUpdate()
    } catch (err) { alert(`Failed: ${err.message}`) }
    setBusy(null)
  }

  return (
    <div style={card}>
      <div style={cardHeader}>
        <h2 style={sectionTitle}>{t('Reminders')}</h2>
        <button style={linkBtn} onClick={() => setAdding(a => !a)}>{adding ? t('Cancel') : t('+ Add')}</button>
      </div>
      {adding && (
        <form onSubmit={addReminder} style={{ marginBottom: '0.75rem' }}>
          <input style={{ ...input, marginBottom: '0.5rem', fontSize: '0.9rem', padding: '0.55rem 0.75rem' }}
            value={text} onChange={e => setText(e.target.value)} placeholder={t('Reminder text…')} autoFocus />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="date" style={{ ...input, marginBottom: 0, flex: 1, fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
              value={dueDate} onChange={e => setDueDate(e.target.value)} />
            <button type="submit" disabled={saving || !text.trim()}
              style={{ ...btn.primary, padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              {saving ? '…' : t('Add')}
            </button>
          </div>
        </form>
      )}
      {items.length === 0 && !adding && <p style={muted}>{t('No open reminders.')}</p>}
      {items.map(item => {
        const due = item.dueDate?.toDate?.()
        const overdue = due && due < new Date()
        return (
          <div key={item.id} style={{ ...rowStyle, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.9rem', color: '#111827' }}>{item.text}</span>
              <span style={{ display: 'block', fontSize: '0.72rem', color: overdue ? '#dc2626' : '#9ca3af', marginTop: '0.1rem' }}>
                {item.addedBy?.displayName || item.addedBy?.email}
                {due && ` · ${overdue ? 'Due ' : ''}${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </span>
            </div>
            <button style={{ ...smBtn, background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
              disabled={busy === item.id} onClick={() => markDone(item.id)}>
              {t('✓ Done')}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Shopping List ─────────────────────────────────────────────────────────────

function ShoppingList({ items, currentUser, onUpdate }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(null)

  async function addItem(e) {
    e.preventDefault()
    if (!text.trim()) return
    setAdding(true)
    try {
      await addDoc(collection(db, 'shoppingList'), {
        text: text.trim(), status: 'pending',
        addedBy: { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email },
        addedAt: serverTimestamp(),
      })
      setText(''); await onUpdate()
    } catch (err) { alert(`Failed: ${err.message}`) }
    setAdding(false)
  }

  async function setStatus(id, status) {
    setBusy(id)
    try { await updateDoc(doc(db, 'shoppingList', id), { status }); await onUpdate() }
    catch (err) { alert(`Failed: ${err.message}`) }
    setBusy(null)
  }

  return (
    <div style={card}>
      <h2 style={sectionTitle}>{t('Shopping List')}</h2>
      <form onSubmit={addItem} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input style={{ ...input, marginBottom: 0, flex: 1, fontSize: '0.95rem', padding: '0.55rem 0.75rem' }}
          value={text} onChange={e => setText(e.target.value)} placeholder={t('Add item…')} />
        <button type="submit" disabled={adding || !text.trim()}
          style={{ ...btn.primary, padding: '0.55rem 1rem', fontSize: '0.9rem' }}>{t('Add')}</button>
      </form>
      {items.length === 0 && <p style={muted}>{t('Nothing on the list.')}</p>}
      {items.map(item => (
        <div key={item.id} style={{ ...rowStyle, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.9rem', color: '#111827' }}>{item.text}</span>
            {item.status === 'ordered' && <span style={orderedBadge}>{t('Ordered')}</span>}
            <span style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.1rem' }}>
              {item.addedBy?.displayName || item.addedBy?.email}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.1rem' }}>
            {item.status === 'pending' && (
              <button style={smBtn} disabled={busy === item.id} onClick={() => setStatus(item.id, 'ordered')}>{t('Ordered')}</button>
            )}
            <button style={{ ...smBtn, background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
              disabled={busy === item.id} onClick={() => setStatus(item.id, 'done')}>{t('✓ Done')}</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuickBtn({ label, icon, onClick }) {
  return (
    <button onClick={onClick} style={quickBtn}>
      <span style={{ fontSize: '1.4rem' }}>{icon}</span>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', lineHeight: 1.2, textAlign: 'center' }}>{label}</span>
    </button>
  )
}

function TaskRow({ done, label, path, navigate, onStart }) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1rem' }}>{done ? '✅' : '⏳'}</span>
        <span style={{ fontSize: '0.875rem', color: done ? '#9ca3af' : '#111827', textDecoration: done ? 'line-through' : 'none' }}>{label}</span>
      </div>
      {!done && <button style={startBtn} onClick={onStart || (() => navigate(path))}>{t('Start →')}</button>}
    </div>
  )
}

function IssueRow({ color, label, count, onClick }) {
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '0.875rem', color: '#374151', flex: 1 }}>{count !== undefined ? `${count} ` : ''}{label}</span>
      <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>→</span>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageTitle = { fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.1rem', color: '#111827' }
const dateLabel = { fontSize: '0.85rem', color: '#9ca3af', margin: 0 }
const sectionTitle = { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: '0.5rem' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }
const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }
const rowLabel = { fontSize: '0.9rem', color: '#374151', display: 'block' }
const subLabel = { fontSize: '0.72rem', color: '#9ca3af', display: 'block' }
const statusBar = { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }
const statusChip = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.5rem 0.75rem', borderRadius: 10, cursor: 'pointer',
  border: 'none', background: '#fff', minWidth: 80,
}
const twoCol = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '0.75rem', marginBottom: '0', alignItems: 'start',
}
const quickPanel = { ...card, marginBottom: 0 }
const quickGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }
const quickBtn = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: '0.35rem', padding: '0.75rem 0.5rem',
  background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 10,
  cursor: 'pointer',
}
const startBtn = {
  background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.3rem 0.75rem', fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap',
}
const linkBtn = {
  background: 'transparent', border: 'none', color: '#1d4ed8',
  fontSize: '0.8rem', cursor: 'pointer', padding: 0,
}
const smBtn = {
  background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb',
  borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer',
}
const orderedBadge = {
  fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af',
  padding: '0.1rem 0.4rem', borderRadius: 4, marginLeft: '0.4rem', fontWeight: 600,
}
