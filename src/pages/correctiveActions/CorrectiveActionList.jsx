import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDate } from '../../utils/format'
import { card, badge } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function CorrectiveActionList() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [cas, setCas] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('open')

  useEffect(() => {
    async function load() {
      const snap = await getDocs(query(collection(db, 'correctiveActions'), orderBy('createdAt', 'desc')))
      setCas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const open = cas.filter(ca => ca.status === 'open' || ca.status === 'in_progress')
  const displayed = tab === 'open' ? open : cas

  const isOverdue = (ca) => ca.dueDate && ca.dueDate.toDate() < now && ca.status !== 'verified'

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>{t('Corrective Actions')}</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <TabBtn active={tab === 'open'} onClick={() => setTab('open')}>
          {t('Open')} {!loading && open.length > 0 && <span style={countBadge(open.some(c => isOverdue(c)))}>{open.length}</span>}
        </TabBtn>
        <TabBtn active={tab === 'all'} onClick={() => setTab('all')}>{t('All')}</TabBtn>
      </div>

      {loading ? <p style={{ color: '#9ca3af' }}>{t('Loading…')}</p> : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
          {tab === 'open' ? t('✅ No open corrective actions.') : t('No corrective actions yet.')}
        </div>
      ) : displayed.map(ca => {
        const overdue = isOverdue(ca)
        return (
          <div key={ca.id} style={{ ...card, cursor: 'pointer', borderLeft: `4px solid ${overdue ? '#dc2626' : '#e5e7eb'}` }}
            onClick={() => navigate(`/corrective-actions/${ca.id}`)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#6b7280' }}>{ca.caNumber}</span>
                  {overdue && <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#b91c1c', padding: '0.1rem 0.4rem', borderRadius: 99, fontWeight: 700 }}>{t('OVERDUE')}</span>}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ca.sourceItemLabel}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {ca.assignedTo ? t('Assigned: {{name}}', { name: ca.assignedTo.displayName || ca.assignedTo.email }) : t('Unassigned')}
                  {ca.dueDate && ` · ${t('Due: {{date}}', { date: formatDate(ca.dueDate) })}`}
                </div>
              </div>
              <span style={badge[ca.status] || badge.open}>{ca.status?.replace('_', ' ')}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.875rem', cursor: 'pointer',
        background: active ? '#1d4ed8' : '#fff',
        color: active ? '#fff' : '#374151',
        border: active ? 'none' : '1px solid #d1d5db',
        display: 'flex', alignItems: 'center', gap: '0.4rem',
      }}
    >
      {children}
    </button>
  )
}

const countBadge = (urgent) => ({
  background: urgent ? '#dc2626' : '#e5e7eb',
  color: urgent ? '#fff' : '#374151',
  borderRadius: 99, padding: '0 0.4rem', fontSize: '0.7rem', fontWeight: 700,
})
