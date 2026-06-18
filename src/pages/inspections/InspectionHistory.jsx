import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDateTime } from '../../utils/format'
import { card, badge } from '../../styles/common'
import { useTranslation } from 'react-i18next'

const TYPE_LABELS = {
  daily_facility: 'Daily Facility Inspection',
  pre_operational: 'Pre-Operational Inspection',
  weekly_facility: 'Weekly Facility Inspection',
  monthly_facility: 'Monthly Facility Verification',
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'daily_facility', label: 'Daily' },
  { value: 'pre_operational', label: 'Pre-Op' },
  { value: 'weekly_facility', label: 'Weekly' },
  { value: 'monthly_facility', label: 'Monthly' },
]

export default function InspectionHistory() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getDocs(query(collection(db, 'inspections'), orderBy('completedAt', 'desc'), limit(100)))
      .then(snap => {
        setInspections(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'all' ? inspections : inspections.filter(i => i.type === filter)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('Inspection History')}</h1>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {FILTERS.map(f => (
          <button key={f.value} style={filterBtn(filter === f.value)} onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button style={newBtn('#1d4ed8')} onClick={() => navigate('/inspections/new/daily_facility')}>+ Daily</button>
        <button style={newBtn('#0891b2')} onClick={() => navigate('/inspections/new/pre_operational')}>+ Pre-Op</button>
        <button style={newBtn('#7c3aed')} onClick={() => navigate('/inspections/new/weekly_facility')}>+ Weekly</button>
        <button style={newBtn('#059669')} onClick={() => navigate('/inspections/new/monthly_facility')}>+ Monthly</button>
      </div>

      {loading ? <p style={{ color: '#9ca3af' }}>{t('Loading…')}</p> : filtered.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '2rem' }}>{t('No records match your filters.')}</p>
      ) : filtered.map(insp => (
        <div key={insp.id} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(`/inspections/${insp.id}`)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                {TYPE_LABELS[insp.type] || insp.type}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {insp.createdBy?.displayName || insp.createdBy?.email} · {formatDateTime(insp.completedAt)}
              </div>
              {insp.failedItemCount > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.2rem' }}>
                  {t('{{count}} item(s) failed', { count: insp.failedItemCount })}
                </div>
              )}
            </div>
            <span style={insp.overallResult === 'pass' ? badge.pass : badge.fail}>
              {insp.overallResult === 'pass' ? t('PASS') : t('FAIL')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

const filterBtn = (active) => ({
  background: active ? '#1d4ed8' : '#fff',
  color: active ? '#fff' : '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '0.35rem 0.75rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
})

const newBtn = (bg) => ({
  background: bg, color: '#fff', border: 'none',
  borderRadius: 8, padding: '0.5rem 0.875rem',
  fontSize: '0.8rem', cursor: 'pointer',
})
