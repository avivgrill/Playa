import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, formatDateTime } from '../../utils/format'
import { card, badge, btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'

const STATUS_COLORS = { available: '#16a34a', hold: '#d97706', used: '#9ca3af', recalled: '#dc2626' }

export default function IngredientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const [ingredient, setIngredient] = useState(null)
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [lotFilter, setLotFilter] = useState('available')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const [ingSnap, lotsSnap] = await Promise.all([
        getDoc(doc(db, 'ingredients', id)),
        getDocs(query(collection(db, 'ingredientLots'), where('ingredientId', '==', id))),
      ])
      if (ingSnap.exists()) setIngredient({ id: ingSnap.id, ...ingSnap.data() })
      const lotList = lotsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.receivedDate?.toDate?.() || 0) - (a.receivedDate?.toDate?.() || 0))
      setLots(lotList)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleDelete() {
    if (!window.confirm(`Delete "${ingredient.name}"? This cannot be undone.`)) return
    setDeleting(true)
    await deleteDoc(doc(db, 'ingredients', id))
    navigate('/operations/ingredients')
  }

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>{t('Loading…')}</p>
  if (!ingredient) return <p style={{ color: '#dc2626', padding: '1rem' }}>{t('Ingredient not found.')}</p>

  const availableLots = lots.filter(l => l.status === 'available')
  const totalAvailable = availableLots.reduce((sum, l) => sum + (l.currentQuantity || 0), 0)
  const filteredLots = lotFilter === 'all' ? lots : lots.filter(l => l.status === lotFilter)

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/operations/ingredients')}>{t('← Ingredients')}</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{ingredient.name}</h1>
        <span style={badge[ingredient.status] || badge.active}>{ingredient.status}</span>
      </div>

      <div style={card}>
        <Row label={t('Category')} value={ingredient.category} />
        {ingredient.supplier && <Row label={t('Supplier')} value={ingredient.supplier} />}
        <Row label={t('Unit')} value={ingredient.unit} />
        {ingredient.allergenFlag && (
          <Row label={t('Allergens')} value={ingredient.allergens?.join(', ') || 'Yes'} />
        )}
        {ingredient.notes && <Row label={t('Notes')} value={ingredient.notes} />}
      </div>

      {/* Stock Summary */}
      <div style={{ ...card, background: totalAvailable > 0 ? '#f0fdf4' : '#fef2f2', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <Stat label={t('Available')} value={`${totalAvailable.toLocaleString()} ${ingredient.unit}`} color={totalAvailable > 0 ? '#15803d' : '#dc2626'} />
        <Stat label={t('Available Lots')} value={availableLots.length} />
        <Stat label={t('Total Lots')} value={lots.length} />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button style={btn.primary} onClick={() => navigate(`/operations/receive?ingredientId=${id}`)}>
          {t('Receive Stock')}
        </button>
        <button style={btn.secondary} onClick={() => navigate(`/operations/ingredients/${id}/edit`)}>
          {t('Edit')}
        </button>
        {isAdmin && (
          <button style={{ ...btn.danger, fontSize: '0.9rem', padding: '0.65rem 1rem' }} onClick={handleDelete} disabled={deleting}>
            {deleting ? t('Deleting…') : t('Delete')}
          </button>
        )}
      </div>

      <h2 style={sectionHead}>{t('Lots')}</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {['available', 'hold', 'used', 'recalled', 'all'].map(f => (
          <button key={f}
            style={{ ...filterBtn, background: lotFilter === f ? '#1d4ed8' : '#fff', color: lotFilter === f ? '#fff' : '#374151' }}
            onClick={() => setLotFilter(f)}>
            {f === 'all' ? t('All') : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filteredLots.length === 0 && <p style={muted}>{t('No lots found.')}</p>}

      {filteredLots.map(lot => (
        <div key={lot.id} style={{ ...card, cursor: 'pointer', borderLeft: `4px solid ${STATUS_COLORS[lot.status] || '#d1d5db'}` }}
          onClick={() => navigate(`/operations/lots/${lot.id}`)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>{lot.internalLotNumber}</div>
              {lot.supplierLotNumber && <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{t('Supplier')}: {lot.supplierLotNumber}</div>}
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{t('Received')} {formatDate(lot.receivedDate)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: STATUS_COLORS[lot.status] || '#374151' }}>
                {lot.currentQuantity?.toLocaleString()} {lot.unit}
              </div>
              <span style={badge[lot.status] || badge.available}>{lot.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 500, textAlign: 'right', maxWidth: '65%' }}>{value}</span>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: color || '#1d4ed8' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const sectionHead = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: '0.75rem 0 0.5rem' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const filterBtn = { padding: '0.35rem 0.7rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }
