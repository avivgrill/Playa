import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { card, badge, btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function IngredientList() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    getDocs(query(collection(db, 'ingredients'), orderBy('name', 'asc')))
      .then(snap => {
        setIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'all' ? ingredients : ingredients.filter(i => i.status === filter)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>{t('Ingredients')}</h1>
        <button style={btn.primary} onClick={() => navigate('/operations/ingredients/new')}>{t('+ New')}</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['active', 'all'].map(f => (
          <button key={f}
            style={{ ...filterBtn, background: filter === f ? '#1d4ed8' : '#fff', color: filter === f ? '#fff' : '#374151' }}
            onClick={() => setFilter(f)}>
            {f === 'active' ? t('Active') : t('All')}
          </button>
        ))}
      </div>

      {loading && <p style={muted}>{t('Loading…')}</p>}
      {!loading && filtered.length === 0 && <p style={muted}>{t('No ingredients found.')}</p>}

      {filtered.map(ing => (
        <div key={ing.id} style={{ ...card, cursor: 'pointer' }}
          onClick={() => navigate(`/operations/ingredients/${ing.id}`)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#111827' }}>{ing.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {ing.category}{ing.supplier ? ` · ${ing.supplier}` : ''} · {ing.unit}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
              <span style={badge[ing.status] || badge.active}>{ing.status}</span>
              {ing.allergenFlag && (
                <span style={allergenBadge}>{t('⚠ Allergen')}</span>
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
const allergenBadge = { background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: 99, fontSize: '0.7rem', fontWeight: 600 }
