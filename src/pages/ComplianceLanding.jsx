import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { todayString } from '../utils/format'
import { useTranslation } from 'react-i18next'
import Modal from '../components/Modal'
import SlideOver from '../components/SlideOver'
import NewCleaningLog from './cleaning/NewCleaningLog'
import StartInspection from './inspections/StartInspection'

function weekBounds() {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diffToMon)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)]
}

function monthBounds() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const last = new Date(y, now.getMonth() + 1, 0).getDate()
  return [`${y}-${m}-01`, `${y}-${m}-${String(last).padStart(2, '0')}`]
}

export default function ComplianceLanding() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [status, setStatus] = useState(null)
  const [activeModal, setActiveModal] = useState(null)
  // null | 'cleaning' | 'daily_facility' | 'pre_operational' | 'weekly_facility' | 'monthly_facility'

  useEffect(() => {
    async function load() {
      const today = todayString()
      const [wStart, wEnd] = weekBounds()
      const [mStart, mEnd] = monthBounds()

      const [dailySnap, preOpSnap, weeklySnap, monthlySnap, casSnap] = await Promise.all([
        getDocs(query(collection(db, 'inspections'), where('type', '==', 'daily_facility'), where('date', '==', today))),
        getDocs(query(collection(db, 'inspections'), where('type', '==', 'pre_operational'), where('date', '==', today))),
        getDocs(query(collection(db, 'inspections'), where('type', '==', 'weekly_facility'))),
        getDocs(query(collection(db, 'inspections'), where('type', '==', 'monthly_facility'))),
        getDocs(query(collection(db, 'correctiveActions'), where('status', 'in', ['open', 'in_progress']))),
      ])

      const weeklyDoc = weeklySnap.docs.find(d => {
        const dt = d.data().date
        return dt >= wStart && dt <= wEnd
      })
      const monthlyDoc = monthlySnap.docs.find(d => {
        const dt = d.data().date
        return dt >= mStart && dt <= mEnd
      })

      const openCAs = casSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      setStatus({
        dailyDone: !dailySnap.empty,
        dailyId: dailySnap.docs[0]?.id || null,
        preOpDone: !preOpSnap.empty,
        preOpId: preOpSnap.docs[0]?.id || null,
        weeklyDone: !!weeklyDoc,
        weeklyId: weeklyDoc?.id || null,
        monthlyDone: !!monthlyDoc,
        monthlyId: monthlyDoc?.id || null,
        openCACount: openCAs.length,
        overdueCACount: openCAs.filter(ca => ca.dueDate?.toDate() < new Date()).length,
      })
    }
    load()
  }, [])

  function handleInspectionClick(type, done, id) {
    if (done && id) {
      navigate(`/inspections/${id}`)
    } else {
      setActiveModal(type)
    }
  }

  function handleModalClose() {
    setActiveModal(null)
    // Re-load status after form submission to reflect updated state
    setStatus(null)
    // Trigger re-fetch
    ;(async () => {
      const today = todayString()
      const [wStart, wEnd] = weekBounds()
      const [mStart, mEnd] = monthBounds()
      const [dailySnap, preOpSnap, weeklySnap, monthlySnap, casSnap] = await Promise.all([
        getDocs(query(collection(db, 'inspections'), where('type', '==', 'daily_facility'), where('date', '==', today))),
        getDocs(query(collection(db, 'inspections'), where('type', '==', 'pre_operational'), where('date', '==', today))),
        getDocs(query(collection(db, 'inspections'), where('type', '==', 'weekly_facility'))),
        getDocs(query(collection(db, 'inspections'), where('type', '==', 'monthly_facility'))),
        getDocs(query(collection(db, 'correctiveActions'), where('status', 'in', ['open', 'in_progress']))),
      ])
      const weeklyDoc = weeklySnap.docs.find(d => { const dt = d.data().date; return dt >= wStart && dt <= wEnd })
      const monthlyDoc = monthlySnap.docs.find(d => { const dt = d.data().date; return dt >= mStart && dt <= mEnd })
      const openCAs = casSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setStatus({
        dailyDone: !dailySnap.empty, dailyId: dailySnap.docs[0]?.id || null,
        preOpDone: !preOpSnap.empty, preOpId: preOpSnap.docs[0]?.id || null,
        weeklyDone: !!weeklyDoc, weeklyId: weeklyDoc?.id || null,
        monthlyDone: !!monthlyDoc, monthlyId: monthlyDoc?.id || null,
        openCACount: openCAs.length,
        overdueCACount: openCAs.filter(ca => ca.dueDate?.toDate() < new Date()).length,
      })
    })()
  }

  const INSPECTION_TITLES = {
    daily_facility: t('Daily Facility Inspection'),
    pre_operational: t('Pre-Operational Inspection'),
    weekly_facility: t('Weekly Facility Inspection'),
    monthly_facility: t('Monthly Facility Verification'),
  }

  return (
    <div>
      <h1 style={pageTitle}>{t('Compliance')}</h1>

      <Section label={t('Today')}>
        <InspectionRow
          label={t('Daily Facility Inspection')}
          done={status?.dailyDone}
          loading={!status}
          onClick={() => status && handleInspectionClick('daily_facility', status.dailyDone, status.dailyId)}
        />
        <InspectionRow
          label={t('Pre-Operational Inspection')}
          done={status?.preOpDone}
          loading={!status}
          onClick={() => status && handleInspectionClick('pre_operational', status.preOpDone, status.preOpId)}
        />
      </Section>

      <Section label={t('This Week')}>
        <InspectionRow
          label={t('Weekly Facility Inspection')}
          done={status?.weeklyDone}
          loading={!status}
          onClick={() => status && handleInspectionClick('weekly_facility', status.weeklyDone, status.weeklyId)}
        />
      </Section>

      <Section label={t('This Month')}>
        <InspectionRow
          label={t('Monthly Facility Verification')}
          done={status?.monthlyDone}
          loading={!status}
          onClick={() => status && handleInspectionClick('monthly_facility', status.monthlyDone, status.monthlyId)}
        />
      </Section>

      <Section label={t('Actions')}>
        <ActionRow
          icon="🧹"
          label={t('New Cleaning Log')}
          onClick={() => setActiveModal('cleaning')}
        />
        <ActionRow
          icon="⚠️"
          label={
            !status ? t('Corrective Actions') :
            status.openCACount === 0 ? t('Corrective Actions — all clear') :
            t('Corrective Actions — {{count}} open{{overdue}}', {
              count: status.openCACount,
              overdue: status.overdueCACount > 0 ? t(' · {{count}} overdue', { count: status.overdueCACount }) : ''
            })
          }
          warn={status?.overdueCACount > 0}
          onClick={() => navigate('/corrective-actions')}
        />
      </Section>

      {/* Modals */}
      {activeModal === 'cleaning' && (
        <Modal title={t('New Cleaning Log')} onClose={() => setActiveModal(null)}>
          <NewCleaningLog onClose={() => setActiveModal(null)} />
        </Modal>
      )}

      {activeModal && activeModal !== 'cleaning' && (
        <SlideOver title={INSPECTION_TITLES[activeModal]} onClose={handleModalClose}>
          <StartInspection type={activeModal} onClose={handleModalClose} />
        </SlideOver>
      )}
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <p style={sectionLabel}>{label}</p>
      <div style={sectionBox}>{children}</div>
    </div>
  )
}

function InspectionRow({ label, done, loading, onClick }) {
  const { t } = useTranslation()
  return (
    <button onClick={onClick} style={row} disabled={loading}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
        {loading ? '·' : done ? '✅' : '⭕'}
      </span>
      <span style={{ flex: 1, fontSize: '0.95rem', color: '#111827', fontWeight: done ? 400 : 500 }}>
        {label}
      </span>
      <span style={done ? doneBadge : pendingBadge}>
        {loading ? '' : done ? t('View') : t('Start')}
      </span>
    </button>
  )
}

function ActionRow({ icon, label, warn, onClick }) {
  return (
    <button onClick={onClick} style={{ ...row, borderBottom: 'none' }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '0.95rem', color: warn ? '#dc2626' : '#111827', fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>→</span>
    </button>
  )
}

const pageTitle = { fontSize: '1.4rem', fontWeight: 700, color: '#111827', marginBottom: '1.25rem' }
const sectionLabel = {
  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: '#9ca3af', margin: '0 0 0.4rem',
}
const sectionBox = {
  background: '#fff', borderRadius: 10,
  boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden',
  border: '1px solid #f3f4f6',
}
const row = {
  display: 'flex', alignItems: 'center', gap: '0.75rem',
  width: '100%', padding: '0.875rem 1rem',
  background: 'transparent', border: 'none',
  borderBottom: '1px solid #f3f4f6',
  cursor: 'pointer', textAlign: 'left',
}
const doneBadge = {
  fontSize: '0.75rem', fontWeight: 600,
  background: '#f0fdf4', color: '#16a34a',
  border: '1px solid #bbf7d0', borderRadius: 6,
  padding: '0.2rem 0.6rem', flexShrink: 0,
}
const pendingBadge = {
  fontSize: '0.75rem', fontWeight: 600,
  background: '#eff6ff', color: '#1d4ed8',
  border: '1px solid #bfdbfe', borderRadius: 6,
  padding: '0.2rem 0.6rem', flexShrink: 0,
}
