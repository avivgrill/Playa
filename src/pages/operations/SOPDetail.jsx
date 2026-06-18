import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateTime } from '../../utils/format'
import { card, badge, btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'
import TranslateButton from '../../components/TranslateButton'

export default function SOPDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const [sop, setSop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'sops', id)).then(snap => {
      if (snap.exists()) setSop({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
  }, [id])

  async function toggleStatus() {
    const newStatus = sop.status === 'active' ? 'inactive' : 'active'
    setToggling(true)
    const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
    await updateDoc(doc(db, 'sops', id), {
      status: newStatus,
      updatedAt: serverTimestamp(),
      auditLog: arrayUnion({ action: `set to ${newStatus}`, changedBy: userInfo, changedAt: Timestamp.now() }),
    })
    setSop(prev => ({ ...prev, status: newStatus }))
    setToggling(false)
  }

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>{t('Loading…')}</p>
  if (!sop) return <p style={{ color: '#dc2626', padding: '1rem' }}>{t('SOP not found.')}</p>

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/operations/sops')}>{t('← SOPs')}</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{sop.name}</h1>
        <span style={badge[sop.status] || badge.active}>{sop.status}</span>
      </div>

      <div style={card}>
        <Row label={t('Product Type')} value={sop.productType} />
        <Row label={t('Status')} value={sop.status} />
        <Row label={t('Created by')} value={sop.createdBy?.displayName || sop.createdBy?.email} />
        <Row label={t('Created')} value={formatDateTime(sop.createdAt)} />
        <Row label={t('Last updated')} value={formatDateTime(sop.updatedAt)} />
      </div>

      {sop.instructions && (
        <div style={card}>
          <h2 style={sectionHead}>{t('Instructions')}</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#374151', margin: 0, fontFamily: 'inherit', lineHeight: 1.6 }}>
            {sop.instructions}
          </pre>
          <TranslateButton text={sop.instructions} style={{ marginTop: '0.75rem' }} />
        </div>
      )}

      {sop.notes && (
        <div style={card}>
          <h2 style={sectionHead}>{t('Notes')}</h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0, lineHeight: 1.6 }}>{sop.notes}</p>
          <TranslateButton text={sop.notes} style={{ marginTop: '0.75rem' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        <button style={btn.primary} onClick={() => navigate(`/operations/sops/${id}/edit`)}>
          {t('Edit SOP')}
        </button>
        <button
          style={sop.status === 'active' ? btn.secondary : btn.success}
          onClick={toggleStatus}
          disabled={toggling}
        >
          {toggling ? '…' : sop.status === 'active' ? t('Deactivate') : t('Activate')}
        </button>
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
const sectionHead = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }
