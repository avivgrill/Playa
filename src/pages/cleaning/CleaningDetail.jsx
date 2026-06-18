import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateTime } from '../../utils/format'
import { card, btn, badge, input, label } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function CleaningDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const [log, setLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verNotes, setVerNotes] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'cleaningLogs', id)).then(snap => {
      if (snap.exists()) setLog({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
  }, [id])

  async function handleVerify() {
    if (verifying) return
    setVerifying(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const update = {
        verificationStatus: 'verified',
        verification: { verifiedBy: userInfo, verifiedAt: serverTimestamp(), notes: verNotes.trim() },
        auditLog: arrayUnion({ action: 'verified', changedBy: userInfo, changedAt: Timestamp.now(), changes: { verificationStatus: { from: 'pending', to: 'verified' } } }),
      }
      await updateDoc(doc(db, 'cleaningLogs', id), update)
      setLog(prev => ({ ...prev, verificationStatus: 'verified', verification: { verifiedBy: userInfo, notes: verNotes.trim() } }))
    } catch (err) {
      console.error(err)
      alert('Error saving. Please try again.')
    }
    setVerifying(false)
  }

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>{t('Loading…')}</p>
  if (!log) return <p style={{ color: '#dc2626', padding: '1rem' }}>{t('Cleaning Log not found.')}</p>

  const verified = log.verificationStatus === 'verified'

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/cleaning')}>{t('← Cleaning History')}</button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{log.area}</h1>
        <span style={verified ? badge.verified : badge.pending}>{verified ? t('Verified') : t('Pending')}</span>
      </div>

      <div style={card}>
        <Row label={t('Equipment')} value={log.equipment} />
        <Row label={t('Chemical')} value={log.chemical} />
        {log.concentration && <Row label={t('Concentration')} value={log.concentration} />}
        <Row label={t('Completed by')} value={log.createdBy?.displayName || log.createdBy?.email} />
        <Row label={t('Date / Time')} value={formatDateTime(log.completedAt)} />
        {log.notes && <Row label={t('Notes')} value={log.notes} />}
      </div>

      {log.photoUrl && (
        <div style={card}>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>{t('Photo')}</p>
          <img src={log.photoUrl} alt="Cleaning photo" style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 8, objectFit: 'cover' }} />
        </div>
      )}

      {verified ? (
        <div style={{ ...card, borderLeft: '4px solid #16a34a' }}>
          <p style={sectionHead}>{t('Verification')}</p>
          <Row label={t('Verified by')} value={log.verification?.verifiedBy?.displayName || log.verification?.verifiedBy?.email} />
          {log.verification?.notes && <Row label={t('Notes')} value={log.verification.notes} />}
        </div>
      ) : (
        <div style={card}>
          <p style={sectionHead}>{t('Supervisor Verification')}</p>
          <label style={label}>{t('Verification notes (optional)')}</label>
          <textarea
            style={{ ...input, minHeight: 80, resize: 'vertical' }}
            placeholder={t('Any notes or observations…')}
            value={verNotes}
            onChange={e => setVerNotes(e.target.value)}
          />
          <button style={{ ...btn.success, width: '100%' }} onClick={handleVerify} disabled={verifying}>
            {verifying ? t('Saving…') : t('✓ Verify & Sign Off')}
          </button>
        </div>
      )}
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

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const sectionHead = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.75rem' }
