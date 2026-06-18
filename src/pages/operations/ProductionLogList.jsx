import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDate } from '../../utils/format'
import { card, badge, btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function ProductionLogList() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'productionLogs'), orderBy('createdAt', 'desc'), limit(50)))
      .then(snap => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>{t('Production Runs')}</h1>
        <button style={btn.primary} onClick={() => navigate('/operations/logs/new')}>{t('+ New Run')}</button>
      </div>

      {loading && <p style={muted}>{t('Loading…')}</p>}

      {!loading && logs.length === 0 && (
        <p style={muted}>{t('No production runs yet.')}</p>
      )}

      {logs.map(log => (
        <div
          key={log.id}
          style={{ ...card, cursor: 'pointer', borderLeft: log.deviations ? '4px solid #f59e0b' : '4px solid #e5e7eb' }}
          onClick={() => navigate(`/operations/logs/${log.id}`)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.1rem' }}>
                {log.batchNumber}
              </div>
              <div style={{ fontWeight: 600, color: '#111827' }}>{log.productName || log.batchNumber}</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{log.operator}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {formatDate(log.date || log.startTime)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
              {log.signature?.signedBy && <span style={badge.verified}>{t('Signed')}</span>}
              {log.deviations && <span style={badge.hold}>{t('Deviation')}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
