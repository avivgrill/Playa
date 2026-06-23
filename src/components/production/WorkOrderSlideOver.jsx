import { useState, useEffect } from 'react'
import { collection, doc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { db } from '../../firebase/config'
import { formatDate } from '../../utils/format'
import { btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'
import SlideOver from '../SlideOver'
import StartProductionModal from './StartProductionModal'

const STATUS_NEXT = { backlog: 'queued', scheduled: 'queued', queued: 'in_production', in_production: 'packaged', packaged: 'complete' }
const STATUS_LABEL = { backlog: 'Backlog', queued: 'In Queue', in_production: 'In Progress', packaged: 'Packaged', complete: 'Complete', hold: 'Hold' }
const STATUS_COLOR = { backlog: '#6b7280', queued: '#d97706', in_production: '#1d4ed8', packaged: '#7e22ce', complete: '#16a34a', hold: '#dc2626' }

export default function WorkOrderSlideOver({ batch: initialBatch, onClose, onUpdated }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [batch, setBatch] = useState(initialBatch)
  const [usage, setUsage] = useState([])
  const [advancing, setAdvancing] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'ingredientUsage'), where('batchId', '==', batch.id)))
      .then(snap => setUsage(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [batch.id])

  async function advance() {
    const next = STATUS_NEXT[batch.status]
    if (!next || advancing) return
    if (next === 'in_production') { setShowStartModal(true); return }
    setAdvancing(true)
    try {
      await updateDoc(doc(db, 'productionBatches', batch.id), { status: next, updatedAt: serverTimestamp() })
      const updated = { ...batch, status: next }
      setBatch(updated)
      onUpdated(updated)
    } catch (err) { alert(err.message) }
    setAdvancing(false)
  }

  function handleProductionStarted(updated) {
    setBatch(updated)
    onUpdated(updated)
    setShowStartModal(false)
  }

  const statusColor = STATUS_COLOR[batch.status] || '#6b7280'
  const nextStatus = STATUS_NEXT[batch.status]

  return (
    <>
      <SlideOver onClose={onClose}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.04em' }}>{batch.batchNumber}</span>
          <span style={{ background: statusColor + '1a', color: statusColor, fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: 99 }}>
            {t(STATUS_LABEL[batch.status] || batch.status)}
          </span>
        </div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', marginBottom: '1.25rem', lineHeight: 1.2 }}>{batch.productName}</h2>

        <div style={detailGrid}>
          {batch.productionDate && (
            <Detail label={t('Planned Date')} value={formatDate(batch.productionDate)} />
          )}
          {batch.sopName && (
            <Detail label={t('SOP')} value={batch.sopName} />
          )}
          {batch.quantityProduced > 0 && (
            <Detail label={t('Quantity')} value={`${batch.quantityProduced.toLocaleString()} ${batch.unit}`} />
          )}
          {(batch.plannedQuantity > 0 && !batch.quantityProduced) && (
            <Detail label={t('Planned Qty')} value={`${batch.plannedQuantity.toLocaleString()} ${batch.unit}`} />
          )}
        </div>

        {batch.notes ? (
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 }}>
            {batch.notes}
          </div>
        ) : null}

        {usage.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={sectionLabel}>{t('Ingredients Used')}</div>
            {usage.map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.4rem 0', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                <span>
                  {u.ingredientName}
                  {u.internalLotNumber && <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: '0.4rem' }}>{u.internalLotNumber}</span>}
                </span>
                <span style={{ fontWeight: 600 }}>{u.quantityUsed} {u.unit}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          {nextStatus && batch.status !== 'hold' && (
            <button style={{ ...btn.primary, flex: 1 }} onClick={advance} disabled={advancing}>
              {advancing ? '…' : `→ ${t(STATUS_LABEL[nextStatus] || nextStatus)}`}
            </button>
          )}
          <button
            style={{ ...btn.secondary, whiteSpace: 'nowrap' }}
            onClick={() => { onClose(); navigate(`/operations/batches/${batch.id}`) }}
          >
            {t('Full Page →')}
          </button>
        </div>
      </SlideOver>

      {showStartModal && (
        <StartProductionModal
          batch={batch}
          onClose={() => setShowStartModal(false)}
          onConfirmed={handleProductionStarted}
        />
      )}
    </>
  )
}

function Detail({ label, value }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '0.625rem 0.75rem' }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', display: 'block', marginBottom: '0.2rem' }}>{label}</span>
      <span style={{ fontSize: '0.9rem', color: '#111827', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

const detailGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }
const sectionLabel = { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: '0.5rem' }
