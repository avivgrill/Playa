import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDate, formatDateTime } from '../../utils/format'
import { card, badge, btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [customer, setCustomer] = useState(null)
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [custSnap, allocSnap] = await Promise.all([
        getDoc(doc(db, 'customers', id)),
        getDocs(query(collection(db, 'batchAllocations'), where('customerId', '==', id), orderBy('allocationDate', 'desc'))),
      ])
      if (custSnap.exists()) setCustomer({ id: custSnap.id, ...custSnap.data() })
      setAllocations(allocSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>{t('Loading…')}</p>
  if (!customer) return <p style={{ color: '#dc2626', padding: '1rem' }}>{t('Customer not found.')}</p>

  const totalAllocated = allocations.reduce((sum, a) => sum + (a.quantityAllocated || 0), 0)
  const uniqueBatches = [...new Set(allocations.map(a => a.batchId))].length

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/operations/customers')}>{t('← Customers')}</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{customer.customerName}</h1>
        <span style={badge[customer.status] || badge.active}>{customer.status}</span>
      </div>

      <div style={card}>
        {customer.contactName && <Row label={t('Contact')} value={customer.contactName} />}
        {customer.email && <Row label={t('Email')} value={customer.email} />}
        {customer.phone && <Row label={t('Phone')} value={customer.phone} />}
        <Row label={t('Added')} value={formatDateTime(customer.createdAt)} />
        {customer.notes && <Row label={t('Notes')} value={customer.notes} />}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <button style={btn.primary} onClick={() => navigate(`/operations/customers/${id}/edit`)}>
          {t('Edit')}
        </button>
      </div>

      {/* Allocation Summary */}
      <div style={{ ...card, background: '#f8fafc', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <Stat label={t('Total Batches')} value={uniqueBatches} />
        <Stat label={t('Allocations')} value={allocations.length} />
        <Stat label={t('Units Allocated')} value={totalAllocated > 0 ? totalAllocated.toLocaleString() : '—'} />
      </div>

      <h2 style={sectionHead}>{t('Allocation History')}</h2>

      {allocations.length === 0 && <p style={muted}>{t('No allocations yet.')}</p>}

      {allocations.map(a => (
        <div
          key={a.id}
          style={{ ...card, cursor: 'pointer' }}
          onClick={() => navigate(`/operations/batches/${a.batchId}`)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{a.batchNumber}</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{a.productName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: '#1d4ed8', fontSize: '0.9rem' }}>
                {a.quantityAllocated?.toLocaleString()} {a.unit}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatDate(a.allocationDate)}</div>
            </div>
          </div>
          {a.notes && <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.4rem' }}>{a.notes}</div>}
        </div>
      ))}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d4ed8' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const sectionHead = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: '1rem 0 0.5rem' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
