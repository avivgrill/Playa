import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { card } from '../../styles/common'
import { formatHours, punchHours } from '../../utils/timecard'
import { formatDateTime } from '../../utils/format'
import { useTranslation } from 'react-i18next'

export default function TimecardAdmin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [timecards, setTimecards] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterWeek, setFilterWeek] = useState('all')

  useEffect(() => {
    getDocs(collection(db, 'timecards')).then(snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          if (b.weekStartStr !== a.weekStartStr) return b.weekStartStr.localeCompare(a.weekStartStr)
          return (a.userName || '').localeCompare(b.userName || '')
        })
      setTimecards(list)
      setLoading(false)
    })
  }, [])

  const weeks = [...new Set(timecards.map(t => t.weekStartStr))].sort((a, b) => b.localeCompare(a))
  const filtered = filterWeek === 'all' ? timecards : timecards.filter(t => t.weekStartStr === filterWeek)

  // Total hours per person for filtered view
  const totals = filtered.reduce((acc, tc) => {
    acc[tc.userId] = (acc[tc.userId] || 0) + tc.totalHours
    return acc
  }, {})

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/dashboard')}>{t('← Dashboard')}</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>{t('All Timecards')}</h1>
        <select
          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '0.4rem 0.6rem', fontSize: '0.875rem', background: '#fff' }}
          value={filterWeek} onChange={e => setFilterWeek(e.target.value)}>
          <option value="all">{t('All weeks')}</option>
          {weeks.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={muted}>{t('Loading…')}</p>
      ) : filtered.length === 0 ? (
        <p style={muted}>{t('No timecards submitted yet.')}</p>
      ) : (
        filtered.map(tc => (
          <div key={tc.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>{tc.userName || tc.userEmail}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {tc.weekLabel} · {t('submitted')} {formatDateTime(tc.submittedAt)}
                </div>
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1d4ed8' }}>{formatHours(tc.totalHours)}</span>
            </div>

            <PunchSummary punches={tc.punches} />

            {tc.notes ? <p style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic', margin: '0.5rem 0 0' }}>{tc.notes}</p> : null}
            {tc.photoUrl && (
              <a href={tc.photoUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', color: '#1d4ed8' }}>
                {t('View time card photo →')}
              </a>
            )}
          </div>
        ))
      )}
    </div>
  )
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function calcSlotHours(slots) {
  const filled = (slots || []).filter(Boolean)
  let total = 0
  for (let i = 0; i + 1 < filled.length; i += 2) total += punchHours(filled[i], filled[i + 1])
  return total
}

function PunchSummary({ punches }) {
  const { t } = useTranslation()
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      {DAYS.filter(day => punches.some(p => p.day === day)).map(day => {
        const p = punches.find(p => p.day === day)
        const slots = p?.slots || (p?.in ? [p.in, p.out] : [])
        const filled = slots.filter(Boolean)
        const dh = calcSlotHours(slots)
        return (
          <div key={day} style={punchRowStyle}>
            <span style={{ width: 32, flexShrink: 0, fontWeight: 600, color: '#374151', fontSize: '0.82rem' }}>{day}</span>
            <span style={{ flex: 1, color: '#6b7280', fontSize: '0.82rem' }}>
              {filled.join(' · ')}
            </span>
            <span style={{ fontWeight: 500, fontSize: '0.82rem', color: '#1d4ed8' }}>{formatHours(dh)}</span>
          </div>
        )
      })}
    </div>
  )
}

const punchRowStyle = { display: 'flex', gap: '0.75rem', padding: '0.3rem 0', fontSize: '0.85rem', color: '#6b7280', borderBottom: '1px solid #f9fafb' }

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
