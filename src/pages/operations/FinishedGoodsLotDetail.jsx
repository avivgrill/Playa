import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, formatDateTime } from '../../utils/format'
import { card, btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'

const STATUS_COLORS = { hold: '#dc2626', released: '#16a34a', depleted: '#9ca3af' }

export default function FinishedGoodsLotDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { currentUser, isAdmin } = useAuth()
  const [lot, setLot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [releasing, setReleasing] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'finishedGoodsLots', id)).then(snap => {
      if (snap.exists()) setLot({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
  }, [id])

  async function handleRelease() {
    if (!window.confirm(t('Release this FG Lot for distribution?'))) return
    setReleasing(true)
    const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
    await updateDoc(doc(db, 'finishedGoodsLots', id), {
      status: 'released', qcReleaseStatus: 'released',
      releasedAt: serverTimestamp(), releasedBy: userInfo,
      auditLog: arrayUnion({ action: 'QC released', changedBy: userInfo, changedAt: Timestamp.now() }),
    })
    setLot(prev => ({ ...prev, status: 'released', qcReleaseStatus: 'released' }))
    setReleasing(false)
  }

  async function handlePutOnHold() {
    if (!window.confirm(t('Put this FG Lot back on hold?'))) return
    const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
    await updateDoc(doc(db, 'finishedGoodsLots', id), {
      status: 'hold', qcReleaseStatus: 'pending',
      updatedAt: serverTimestamp(),
      auditLog: arrayUnion({ action: 'put on hold', changedBy: userInfo, changedAt: Timestamp.now() }),
    })
    setLot(prev => ({ ...prev, status: 'hold', qcReleaseStatus: 'pending' }))
  }

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>{t('Loading…')}</p>
  if (!lot) return <p style={{ color: '#dc2626', padding: '1rem' }}>{t('FG Lot not found.')}</p>

  const statusColor = STATUS_COLORS[lot.status] || '#9ca3af'

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/operations/fg-lots')}>{t('← FG Lots')}</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em' }}>{lot.fgLotNumber}</div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{lot.product || t('Finished Goods Lot')}</h1>
        </div>
        <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', background: statusColor + '20', color: statusColor }}>
          {lot.status || 'hold'}
        </div>
      </div>

      {isAdmin && lot.status === 'hold' && (
        <button style={{ ...btn.primary, marginBottom: '1rem', background: '#16a34a', borderColor: '#16a34a' }} onClick={handleRelease} disabled={releasing}>
          {releasing ? t('Releasing…') : t('Release for Distribution')}
        </button>
      )}
      {isAdmin && lot.status === 'released' && (
        <button style={{ ...btn.secondary, marginBottom: '1rem', color: '#dc2626', borderColor: '#dc2626' }} onClick={handlePutOnHold}>
          {t('Put on Hold')}
        </button>
      )}

      <div style={card}>
        <Row label={t('FG Lot Number')} value={lot.fgLotNumber} />
        <Row label={t('Product')} value={lot.product || '—'} />
        {lot.actualQuantity > 0 && <Row label={t('Actual Quantity')} value={`${lot.actualQuantity?.toLocaleString()} ${lot.unit}`} />}
        {lot.wasteQuantity > 0 && <Row label={t('Waste Quantity')} value={`${lot.wasteQuantity?.toLocaleString()} ${lot.unit}`} />}
        <Row label={t('Quantity Produced')} value={lot.quantityProduced > 0 ? `${lot.quantityProduced.toLocaleString()} ${lot.unit}` : '—'} />
        <Row label={t('Available')} value={lot.quantityAvailable > 0 ? `${lot.quantityAvailable.toLocaleString()} ${lot.unit}` : '—'} />
        <Row label={t('QC Status')} value={lot.qcReleaseStatus || 'pending'} />
        <Row label={t('Created')} value={lot.createdDate ? formatDate(lot.createdDate) : '—'} />
        {lot.releasedAt && <Row label={t('Released')} value={formatDateTime(lot.releasedAt)} />}
        {lot.releasedBy && <Row label={t('Released by')} value={lot.releasedBy?.displayName || lot.releasedBy?.email} />}
      </div>

      {lot.notes && (
        <div style={card}>
          <h2 style={sectionHead}>{t('Notes')}</h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0 }}>{lot.notes}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        {lot.workOrderId && (
          <button style={linkBtn} onClick={() => navigate(`/operations/batches/${lot.workOrderId}`)}>
            {t('View Work Order →')}
          </button>
        )}
        {lot.productionRunId && (
          <button style={linkBtn} onClick={() => navigate(`/operations/logs/${lot.productionRunId}`)}>
            {t('View Production Run →')}
          </button>
        )}
        {lot.clientOrderId && (
          <button style={linkBtn} onClick={() => navigate(`/operations/client-orders/${lot.clientOrderId}`)}>
            {t('View Client Order →')}
          </button>
        )}
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
const linkBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', padding: 0 }
