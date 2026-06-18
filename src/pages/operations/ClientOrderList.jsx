import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDate } from '../../utils/format'
import { card, badge, btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'

const STATUS_COLORS = {
  open: '#d97706', in_production: '#1d4ed8', fulfilled: '#16a34a', cancelled: '#9ca3af',
}

export default function ClientOrderList() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    getDocs(query(collection(db, 'clientOrders'), orderBy('createdAt', 'desc')))
      .then(snap => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter || (filter === 'open' && !o.status))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>{t('Client Orders')}</h1>
        <button style={btn.primary} onClick={() => navigate('/operations/client-orders/new')}>{t('+ New Order')}</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['open', 'in_production', 'fulfilled', 'all'].map(f => (
          <button
            key={f}
            style={{ ...filterBtn, background: filter === f ? '#1d4ed8' : '#fff', color: filter === f ? '#fff' : '#374151' }}
            onClick={() => setFilter(f)}
          >
            {f === 'open' ? t('Open') : f === 'in_production' ? t('In Production') : f === 'fulfilled' ? t('Fulfilled') : t('All')}
          </button>
        ))}
      </div>

      {loading && <p style={muted}>{t('Loading…')}</p>}
      {!loading && filtered.length === 0 && <p style={muted}>{t('No orders found.')}</p>}

      {filtered.map(o => (
        <div
          key={o.id}
          style={{ ...card, cursor: 'pointer', borderLeft: `4px solid ${STATUS_COLORS[o.status] || '#d1d5db'}` }}
          onClick={() => navigate(`/operations/client-orders/${o.id}`)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.85rem', marginBottom: '0.15rem' }}>
                {o.orderNumber}
              </div>
              <div style={{ fontWeight: 600, color: '#374151' }}>{o.customerName || '—'}</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{o.product}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: STATUS_COLORS[o.status] ? STATUS_COLORS[o.status] + '20' : '#f3f4f6', color: STATUS_COLORS[o.status] || '#6b7280' }}>
                {o.status || 'open'}
              </div>
              {o.orderedQuantity > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {o.orderedQuantity.toLocaleString()} {o.unit}
                </div>
              )}
              {o.dueDate && (
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                  {t('Due')}: {formatDate(o.dueDate)}
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
