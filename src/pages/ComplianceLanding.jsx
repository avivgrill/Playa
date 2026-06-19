import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { todayString } from '../utils/format'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import Modal from '../components/Modal'
import { btn, input, label } from '../styles/common'

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
  const { currentUser } = useAuth()
  const [status, setStatus] = useState(null)
  const [showCleaningModal, setShowCleaningModal] = useState(false)
  const [cleaningForm, setCleaningForm] = useState({ area: '', equipment: '', chemical: '', concentration: '', notes: '' })
  const [cleaningSaving, setCleaningSaving] = useState(false)

  const setC = f => e => setCleaningForm(prev => ({ ...prev, [f]: e.target.value }))
  const canSubmitCleaning = cleaningForm.area.trim() && cleaningForm.equipment.trim() && cleaningForm.chemical.trim()

  async function submitCleaning(e) {
    e.preventDefault()
    if (!canSubmitCleaning || cleaningSaving) return
    setCleaningSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      await addDoc(collection(db, 'cleaningLogs'), {
        area: cleaningForm.area.trim(),
        equipment: cleaningForm.equipment.trim(),
        chemical: cleaningForm.chemical.trim(),
        concentration: cleaningForm.concentration.trim(),
        notes: cleaningForm.notes.trim(),
        photoUrl: null, photoPath: null,
        completedAt: serverTimestamp(),
        createdBy: userInfo,
        verificationStatus: 'pending',
        verification: null,
        auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now(), changes: {} }],
      })
      setCleaningForm({ area: '', equipment: '', chemical: '', concentration: '', notes: '' })
      setShowCleaningModal(false)
    } catch (err) {
      alert('Error saving. Please try again.')
    }
    setCleaningSaving(false)
  }

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

  function go(type, done, id) {
    if (done && id) {
      navigate(`/inspections/${id}`)
    } else {
      navigate(`/inspections/new/${type}`)
    }
  }

  return (
    <div>
      <h1 style={pageTitle}>{t('Compliance')}</h1>

      <Section label={t('Today')}>
        <InspectionRow
          label={t('Daily Facility Inspection')}
          done={status?.dailyDone}
          loading={!status}
          onClick={() => status && go('daily_facility', status.dailyDone, status.dailyId)}
        />
        <InspectionRow
          label={t('Pre-Operational Inspection')}
          done={status?.preOpDone}
          loading={!status}
          onClick={() => status && go('pre_operational', status.preOpDone, status.preOpId)}
        />
      </Section>

      <Section label={t('This Week')}>
        <InspectionRow
          label={t('Weekly Facility Inspection')}
          done={status?.weeklyDone}
          loading={!status}
          onClick={() => status && go('weekly_facility', status.weeklyDone, status.weeklyId)}
        />
      </Section>

      <Section label={t('This Month')}>
        <InspectionRow
          label={t('Monthly Facility Verification')}
          done={status?.monthlyDone}
          loading={!status}
          onClick={() => status && go('monthly_facility', status.monthlyDone, status.monthlyId)}
        />
      </Section>

      <Section label={t('Actions')}>
        <ActionRow
          icon="🧹"
          label={t('New Cleaning Log')}
          onClick={() => setShowCleaningModal(true)}
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

      {showCleaningModal && (
        <Modal title={t('New Cleaning Log')} onClose={() => setShowCleaningModal(false)}>
          <form onSubmit={submitCleaning}>
            <CleaningField label={t('Area *')} value={cleaningForm.area} onChange={setC('area')} placeholder={t('e.g. Kitchen, Mixing Room')} />
            <CleaningField label={t('Equipment *')} value={cleaningForm.equipment} onChange={setC('equipment')} placeholder={t('e.g. Mixer, Kettle')} />
            <CleaningField label={t('Chemical Used *')} value={cleaningForm.chemical} onChange={setC('chemical')} placeholder={t('e.g. Sanidate, Bleach solution')} />
            <CleaningField label={t('Concentration / Dilution')} value={cleaningForm.concentration} onChange={setC('concentration')} placeholder={t('e.g. 200 ppm')} />
            <CleaningField label={t('Notes')} value={cleaningForm.notes} onChange={setC('notes')} textarea />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" style={{ ...btn.secondary, flex: 1 }} onClick={() => setShowCleaningModal(false)}>{t('Cancel')}</button>
              <button type="submit" style={{ ...btn.primary, flex: 2, opacity: canSubmitCleaning ? 1 : 0.4 }} disabled={!canSubmitCleaning || cleaningSaving}>
                {cleaningSaving ? t('Saving…') : t('Submit')}
              </button>
            </div>
          </form>
        </Modal>
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

function CleaningField({ label: lbl, value, onChange, placeholder, textarea }) {
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <label style={label}>{lbl}</label>
      {textarea
        ? <textarea style={{ ...input, minHeight: 64, resize: 'vertical', marginBottom: 0 }} value={value} onChange={onChange} placeholder={placeholder} />
        : <input style={{ ...input, marginBottom: 0 }} type="text" value={value} onChange={onChange} placeholder={placeholder} />}
    </div>
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
