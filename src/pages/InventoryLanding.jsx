import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useTranslation } from 'react-i18next'
import SlideOver from '../components/SlideOver'
import ReceiveInventory from './operations/ReceiveInventory'

export default function InventoryLanding() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [status, setStatus] = useState(null)
  const [showReceive, setShowReceive] = useState(false)

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, 'ingredientLots'), where('status', '==', 'available'))),
      getDocs(query(collection(db, 'ingredientLots'), where('status', '==', 'hold'))),
      getDocs(query(collection(db, 'ingredients'), where('status', '==', 'active'))),
    ]).then(([available, hold, ingredients]) => {
      setStatus({ available: available.size, hold: hold.size, ingredients: ingredients.size })
    })
  }, [])

  return (
    <div>
      <h1 style={pageTitle}>{t('Inventory')}</h1>

      {status && (
        <div style={statusRow}>
          <StatChip label={t('Available Lots')} value={status.available} color="#16a34a" onClick={() => navigate('/operations/lots')} />
          <StatChip label={t('Ingredients')} value={status.ingredients} color="#1d4ed8" onClick={() => navigate('/operations/ingredients')} />
          {status.hold > 0 && <StatChip label={t('On Hold')} value={status.hold} color="#dc2626" onClick={() => navigate('/operations/lots')} />}
        </div>
      )}

      <SectionHeader title={t('Receiving')} />
      <div style={grid}>
        <ActionCard icon="📦" title={t('Receive Inventory')} desc={t('Log incoming ingredient lots')} primary onClick={() => setShowReceive(true)} />
        <ActionCard icon="📊" title={t('Inventory Table')} desc={t('View and edit current stock levels')} onClick={() => navigate('/operations/inventory')} />
      </div>

      <SectionHeader title={t('Ingredients & Lots')} />
      <div style={grid}>
        <ActionCard icon="🧪" title={t('Ingredients')} desc={t('Manage ingredient master records')} onClick={() => navigate('/operations/ingredients')} />
        <ActionCard icon="🏷️" title={t('Ingredient Lots')} desc={t('Browse all received lots')} onClick={() => navigate('/operations/lots')} />
      </div>

      <SectionHeader title={t('Traceability')} />
      <div style={grid}>
        <ActionCard icon="🔍" title={t('Recall Trace')} desc={t('Trace a lot through production and customers')} onClick={() => navigate('/operations/recall')} />
      </div>

      {showReceive && (
        <SlideOver title={t('Receive Inventory')} onClose={() => setShowReceive(false)}>
          <ReceiveInventory onClose={() => setShowReceive(false)} />
        </SlideOver>
      )}
    </div>
  )
}

function StatChip({ label, value, color, onClick }) {
  return (
    <button onClick={onClick} style={{ ...chip }}>
      <span style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{label}</span>
    </button>
  )
}

function SectionHeader({ title }) {
  return <h2 style={sectionHead}>{title}</h2>
}

function ActionCard({ icon, title, desc, primary, onClick }) {
  return (
    <button onClick={onClick} style={{ ...card, borderLeft: primary ? '3px solid #1d4ed8' : '3px solid transparent' }}>
      <span style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{icon}</span>
      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{title}</span>
      <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem', lineHeight: 1.3 }}>{desc}</span>
    </button>
  )
}

const pageTitle = { fontSize: '1.4rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }
const statusRow = { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }
const chip = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '0.6rem 1.25rem', background: '#fff', border: '1.5px solid #e5e7eb',
  borderRadius: 10, cursor: 'pointer', minWidth: 80,
}
const sectionHead = { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', margin: '1.25rem 0 0.5rem' }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.625rem' }
const card = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
  padding: '0.875rem', background: '#fff', borderRadius: 10,
  boxShadow: '0 1px 3px rgba(0,0,0,0.07)', cursor: 'pointer',
  border: '1px solid #f3f4f6',
}
