import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDateTime } from '../../utils/format'
import { card, badge } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function CleaningHistory() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'cleaningLogs'), orderBy('completedAt', 'desc'), limit(100)))
      .then(snap => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('All Cleaning Logs')}</h1>
        <button
          style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', fontSize: '0.875rem', cursor: 'pointer' }}
          onClick={() => navigate('/cleaning/new')}
        >
          {t('+ New Cleaning Log')}
        </button>
      </div>

      {loading ? <p style={{ color: '#9ca3af' }}>{t('Loading…')}</p> : logs.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '2rem' }}>{t('No cleaning logs yet.')}</p>
      ) : logs.map(log => (
        <div key={log.id} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(`/cleaning/${log.id}`)}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{log.area}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {log.equipment} · {log.chemical}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                {log.createdBy?.displayName || log.createdBy?.email} · {formatDateTime(log.completedAt)}
              </div>
            </div>
            <span style={log.verificationStatus === 'verified' ? badge.verified : badge.pending}>
              {log.verificationStatus === 'verified' ? t('Verified') : t('Pending')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
