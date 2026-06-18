import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDate } from '../../utils/format'
import { card, badge, btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function SOPList() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [sops, setSops] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    getDocs(query(collection(db, 'sops'), orderBy('createdAt', 'desc')))
      .then(snap => {
        setSops(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'all' ? sops : sops.filter(s => s.status === filter)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>{t('SOPs')}</h1>
        <button style={btn.primary} onClick={() => navigate('/operations/sops/new')}>{t('+ New SOP')}</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['active', 'all'].map(f => (
          <button
            key={f}
            style={{ ...filterBtn, background: filter === f ? '#1d4ed8' : '#fff', color: filter === f ? '#fff' : '#374151' }}
            onClick={() => setFilter(f)}
          >
            {f === 'active' ? t('Active') : t('All')}
          </button>
        ))}
      </div>

      {loading && <p style={muted}>{t('Loading…')}</p>}

      {!loading && filtered.length === 0 && (
        <p style={muted}>{t('No SOPs found. Create your first one.')}</p>
      )}

      {filtered.map(sop => (
        <div
          key={sop.id}
          style={{ ...card, cursor: 'pointer' }}
          onClick={() => navigate(`/operations/sops/${sop.id}`)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#111827', marginBottom: '0.2rem' }}>{sop.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{sop.productType}</div>
            </div>
            <span style={badge[sop.status] || badge.active}>{sop.status}</span>
          </div>
          {sop.updatedAt && (
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.4rem' }}>
              {t('Updated')} {formatDate(sop.updatedAt)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const filterBtn = {
  padding: '0.4rem 0.875rem', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer',
}
