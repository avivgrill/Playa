import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDate } from '../../utils/format'
import { card, badge, btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'

const STATUS_COLORS = { available: '#16a34a', hold: '#d97706', used: '#9ca3af', recalled: '#dc2626' }

export default function LotList() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getDocs(query(collection(db, 'ingredientLots'), orderBy('createdAt', 'desc')))
      .then(snap => {
        setLots(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  const filtered = lots
    .filter(l => {
      if (filter === 'active') return (l.currentQuantity ?? 0) > 0
      if (filter === 'used') return l.status === 'used'
      if (filter === 'recalled') return l.status === 'recalled'
      return true // 'all'
    })
    .filter(l => {
      if (typeFilter === 'ingredients') return !l.type || l.type === 'raw_ingredient'
      if (typeFilter === 'finished_candy') return l.type === 'finished_candy'
      if (typeFilter === 'packaged_goods') return l.type === 'packaged_goods'
      return true // 'all'
    })
    .filter(l => {
      if (!search.trim()) return true
      const s = search.toLowerCase()
      return (
        l.ingredientName?.toLowerCase().includes(s) ||
        l.internalLotNumber?.toLowerCase().includes(s) ||
        l.supplierLotNumber?.toLowerCase().includes(s)
      )
    })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>{t('Ingredient Lots')}</h1>
        <button style={btn.primary} onClick={() => navigate('/operations/receive')}>{t('Receive')}</button>
      </div>

      <input
        style={{ ...searchInput, marginBottom: '0.75rem' }}
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('Search ingredient, lot number…')}
      />

      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        {[['active', t('Active')], ['used', t('Used')], ['recalled', t('Recalled')], ['all', t('All')]].map(([f, lbl]) => (
          <button key={f}
            style={{ ...filterBtn, background: filter === f ? '#1d4ed8' : '#fff', color: filter === f ? '#fff' : '#374151' }}
            onClick={() => setFilter(f)}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[['all', t('All Types')], ['ingredients', t('Ingredients')], ['finished_candy', t('Finished Candy')], ['packaged_goods', t('Packaged Goods')]].map(([f, lbl]) => (
          <button key={f}
            style={{ ...filterBtn, background: typeFilter === f ? '#374151' : '#fff', color: typeFilter === f ? '#fff' : '#374151', fontSize: '0.75rem' }}
            onClick={() => setTypeFilter(f)}>
            {lbl}
          </button>
        ))}
      </div>

      {loading && <p style={muted}>{t('Loading…')}</p>}
      {!loading && filtered.length === 0 && <p style={muted}>{t('No lots found.')}</p>}

      {filtered.map(lot => (
        <div key={lot.id} style={{ ...card, cursor: 'pointer', borderLeft: `4px solid ${STATUS_COLORS[lot.status] || '#d1d5db'}` }}
          onClick={() => navigate(`/operations/lots/${lot.id}`)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#111827' }}>{lot.ingredientName}</span>
                {lot.type === 'finished_candy' && <span style={typeBadge('#d97706')}>Finished Candy</span>}
                {lot.type === 'packaged_goods' && <span style={typeBadge('#7e22ce')}>Packaged</span>}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.1rem' }}>{lot.internalLotNumber}</div>
              {lot.supplierLotNumber && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{lot.type === 'finished_candy' || lot.type === 'packaged_goods' ? t('Batch') : t('Supplier')}: {lot.supplierLotNumber}</div>}
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t('Received')} {formatDate(lot.receivedDate)}</div>
              {lot.expirationDate && (
                <div style={{ fontSize: '0.75rem', color: new Date(lot.expirationDate) < new Date() ? '#dc2626' : '#9ca3af', fontWeight: new Date(lot.expirationDate) < new Date() ? 600 : 400 }}>
                  {t('Exp')} {lot.expirationDate}{new Date(lot.expirationDate) < new Date() ? ' ⚠' : ''}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 700, color: STATUS_COLORS[lot.status] || '#374151' }}>
                {lot.currentQuantity?.toLocaleString()} {lot.unit}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{t('of')} {lot.originalQuantity?.toLocaleString()} {t('received')}</div>
              <span style={{ ...badge[lot.status], marginTop: '0.25rem', display: 'inline-block' }}>{lot.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const filterBtn = { padding: '0.35rem 0.65rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }
const typeBadge = color => ({ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 10, background: color + '18', color })
const searchInput = {
  display: 'block', width: '100%', padding: '0.7rem 0.875rem',
  border: '1px solid #d1d5db', borderRadius: 8, fontSize: '1rem', background: '#fff',
}
