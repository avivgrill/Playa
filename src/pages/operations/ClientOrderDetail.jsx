import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, where, updateDoc, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../utils/format'
import { card, badge, btn, input, label } from '../../styles/common'
import { useTranslation } from 'react-i18next'

const STATUSES = ['open', 'in_production', 'fulfilled', 'cancelled']
const STATUS_COLORS = { open: '#d97706', in_production: '#1d4ed8', fulfilled: '#16a34a', cancelled: '#9ca3af' }

export default function ClientOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { currentUser, isAdmin } = useAuth()
  const [order, setOrder] = useState(null)
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  async function load() {
    const snap = await getDoc(doc(db, 'clientOrders', id))
    if (snap.exists()) setOrder({ id: snap.id, ...snap.data() })

    const woSnap = await getDocs(query(collection(db, 'productionBatches'), where('clientOrderId', '==', id)))
    setWorkOrders(woSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)))
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function updateStatus(newStatus) {
    setUpdatingStatus(true)
    const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
    await updateDoc(doc(db, 'clientOrders', id), {
      status: newStatus, updatedAt: serverTimestamp(),
      auditLog: arrayUnion({ action: `status → ${newStatus}`, changedBy: userInfo, changedAt: Timestamp.now() }),
    })
    setOrder(prev => ({ ...prev, status: newStatus }))
    setUpdatingStatus(false)
  }

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>{t('Loading…')}</p>
  if (!order) return <p style={{ color: '#dc2626', padding: '1rem' }}>{t('Order not found.')}</p>

  const statusColor = STATUS_COLORS[order.status] || '#9ca3af'

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/operations/client-orders')}>{t('← Client Orders')}</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em' }}>{order.orderNumber}</div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{order.product}</h1>
          {order.customerName && <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{order.customerName}</div>}
        </div>
        <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', background: statusColor + '20', color: statusColor }}>
          {order.status || 'open'}
        </div>
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {STATUSES.filter(s => s !== order.status).map(s => (
            <button key={s} style={{ ...statusBtn, borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] }}
              onClick={() => updateStatus(s)} disabled={updatingStatus}>
              → {s}
            </button>
          ))}
        </div>
      )}

      <div style={card}>
        <Row label={t('Product')} value={order.product} />
        {order.customerName && <Row label={t('Customer')} value={order.customerName} />}
        {order.orderedQuantity > 0 && <Row label={t('Ordered Quantity')} value={`${order.orderedQuantity.toLocaleString()} ${order.unit}`} />}
        {order.dueDate && <Row label={t('Due Date')} value={formatDate(order.dueDate)} />}
        {order.poNumber && <Row label={t('PO Number')} value={order.poNumber} />}
        <Row label={t('Created by')} value={order.createdBy?.displayName || order.createdBy?.email} />
      </div>

      {order.notes && (
        <div style={card}>
          <h2 style={sectionHead}>{t('Notes')}</h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0 }}>{order.notes}</p>
        </div>
      )}

      {/* Linked Work Orders */}
      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={sectionHead}>{t('Work Orders')} ({workOrders.length})</h2>
          <button style={btn.primary} onClick={() => navigate(`/operations/batches/new?clientOrderId=${id}`)}>
            {t('+ New Work Order')}
          </button>
        </div>
        {workOrders.length === 0 && <p style={muted}>{t('No work orders yet.')}</p>}
        {workOrders.map(wo => (
          <div key={wo.id} style={{ ...card, cursor: 'pointer', borderLeft: '4px solid #1d4ed8' }}
            onClick={() => navigate(`/operations/batches/${wo.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#9ca3af' }}>{wo.batchNumber}</div>
                <div style={{ fontWeight: 600, color: '#374151' }}>{wo.productName}</div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{wo.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const sectionHead = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem', margin: 0 }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const statusBtn = { background: '#fff', border: '1px solid', borderRadius: 6, padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }
