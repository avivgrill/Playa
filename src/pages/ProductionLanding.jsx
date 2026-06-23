import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CandyProductionBoard from '../components/production/CandyProductionBoard'
import PackagingBoard from '../components/production/PackagingBoard'
import TasksBoard from '../components/production/TasksBoard'
import PickupOrders from '../components/production/PickupOrders'

const TABS = [
  { key: 'candy',     label: 'Candy Production' },
  { key: 'packaging', label: 'Packaging / Co-Packing' },
  { key: 'tasks',     label: 'Tasks' },
]

export default function ProductionLanding() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('candy')

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>{t('Production')}</h1>
          <div style={s.quickLinks}>
            <Link to="/operations/sops" style={s.qLink}>{t('SOPs')}</Link>
            <span style={s.dot}>·</span>
            <Link to="/operations/batches" style={s.qLink}>{t('All Work Orders')}</Link>
          </div>
        </div>
      </div>

      <div style={s.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            style={activeTab === tab.key ? s.tabActive : s.tab}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={s.boardWrap}>
        {activeTab === 'candy'     && <CandyProductionBoard />}
        {activeTab === 'packaging' && <PackagingBoard />}
        {activeTab === 'tasks'     && <TasksBoard />}
      </div>

      <PickupOrders />
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 },
  quickLinks: { display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' },
  qLink: { fontSize: '0.8rem', color: '#1d4ed8', textDecoration: 'none' },
  dot: { fontSize: '0.8rem', color: '#d1d5db' },
  tabBar: { display: 'flex', gap: '0.25rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1.25rem' },
  tab: {
    background: 'transparent', border: 'none', borderBottom: '2px solid transparent',
    marginBottom: '-2px', padding: '0.6rem 1rem',
    fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', cursor: 'pointer',
  },
  tabActive: {
    background: 'transparent', border: 'none', borderBottom: '2px solid #1d4ed8',
    marginBottom: '-2px', padding: '0.6rem 1rem',
    fontSize: '0.875rem', fontWeight: 700, color: '#1d4ed8', cursor: 'pointer',
  },
  boardWrap: { minHeight: 400 },
}
