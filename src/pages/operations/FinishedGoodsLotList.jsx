import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDate } from '../../utils/format'
import { card, btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'

const STATUS_COLORS = { hold: '#dc2626', released: '#16a34a', depleted: '#9ca3af' }

export default function FinishedGoodsLotList() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getDocs(query(collection(db, 'finishedGoodsLots'), orderBy('createdDate', 'desc')))
      .then(snap => {
        setLots(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? lots : lots.filter(l => l.status === filter)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>{t('Finished Goods Lots')}</h1>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['all', 'hold', 'released', 'depleted'].map(f => (
          <button
            key={f}
            style={{ ...filterBtn, background: filter === f ? '#1d4ed8' : '#fff', color: filter === f ? '#fff' : '#374151' }}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? t('All') : f === 'hold' ? t('Hold') : f === 'released' ? t('Released') : t('Depleted')}
          </button>
        ))}
      </div>

      {loading && <p style={muted}>{t('Loading…')}</p>}
      {!loading && filtered.length === 0 && <p style={muted}>{t('No FG lots found.')}</p>}

      {filtered.map(lot => (
        <div
          key={lot.id}
          style={{ ...card, cursor: 'pointer', borderLeft: `4px solid ${STATUS_COLORS[lot.status] || '#d1d5db'}` }}
          onClick={() => navigate(`/operations/fg-lots/${lot.id}`)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.85rem', marginBottom: '0.15rem' }}>
                {lot.fgLotNumber}
              </div>
              <div style={{ fontWeight: 600, color: '#374151' }}>{lot.product || '—'}</div>
              {lot.createdDate && (
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatDate(lot.createdDate)}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: (STATUS_COLORS[lot.status] || '#9ca3af') + '20', color: STATUS_COLORS[lot.status] || '#9ca3af' }}>
                {lot.status || '—'}
              </div>
              {lot.quantityProduced > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {lot.quantityProduced.toLocaleString()} {lot.unit}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const filterBtn = { padding: '0.4rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer' }
