import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion, Timestamp, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, formatDateTime } from '../../utils/format'
import PhotoUpload from '../../components/PhotoUpload'
import { card, btn, badge, input, label } from '../../styles/common'
import { useTranslation } from 'react-i18next'
import TranslateButton from '../../components/TranslateButton'

export default function CorrectiveActionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const [ca, setCa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)

  const [actionTaken, setActionTaken] = useState('')
  const [verNotes, setVerNotes] = useState('')
  const [verPhoto, setVerPhoto] = useState(null)
  const [signerName, setSignerName] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'correctiveActions', id)).then(snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setCa(data)
        setActionTaken(data.correctiveActionTaken || '')
        setVerNotes(data.verificationNotes || '')
        setAssignedTo(data.assignedTo?.email || '')
        if (data.dueDate) setDueDate(data.dueDate.toDate().toISOString().slice(0, 10))
      }
      setLoading(false)
    })
    getDocs(collection(db, 'users')).then(snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [id])

  const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }

  async function save(updates, auditAction) {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'correctiveActions', id), {
        ...updates,
        auditLog: arrayUnion({ action: auditAction, changedBy: userInfo, changedAt: Timestamp.now(), changes: {} }),
      })
      setCa(prev => ({ ...prev, ...updates }))
    } catch (err) {
      console.error(err)
      alert('Error saving. Please try again.')
    }
    setSaving(false)
  }

  async function handleSaveAssignment() {
    const assignee = users.find(u => u.email === assignedTo)
    const dueDateTs = dueDate ? new Date(dueDate + 'T00:00:00') : null
    await save({
      assignedTo: assignee ? { uid: assignee.id, displayName: assignee.displayName || assignee.email, email: assignee.email } : null,
      dueDate: dueDateTs ? { toDate: () => dueDateTs, seconds: dueDateTs.getTime() / 1000 } : null,
    }, 'updated')
  }

  async function handleStatusChange(newStatus) {
    await save({ status: newStatus, correctiveActionTaken: actionTaken }, 'status_changed')
    setCa(prev => ({ ...prev, status: newStatus }))
  }

  async function handleSignOff() {
    if (!signerName.trim()) return
    await save({
      status: 'verified',
      verificationNotes: verNotes,
      verificationPhotoUrl: verPhoto?.url || null,
      verificationPhotoPath: verPhoto?.path || null,
      supervisorSignOff: { uid: currentUser.uid, displayName: signerName.trim(), signedAt: serverTimestamp() },
    }, 'verified')
  }

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>{t('Loading…')}</p>
  if (!ca) return <p style={{ color: '#dc2626', padding: '1rem' }}>{t('Not found.')}</p>

  const isVerified = ca.status === 'verified'
  const isComplete = ca.status === 'complete' || isVerified

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/corrective-actions')}>{t('← Corrective Actions')}</button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b7280' }}>{ca.caNumber}</span>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem' }}>{ca.sourceItemLabel}</h1>
        </div>
        <span style={badge[ca.status] || badge.open}>{ca.status?.replace('_', ' ')}</span>
      </div>

      {/* Source + Description */}
      <div style={card}>
        <p style={sHead}>{t('Source')}</p>
        <Row label={t('From inspection')} value={
          <Link to={`/inspections/${ca.sourceId}`} style={{ color: '#1d4ed8', fontSize: '0.875rem' }}>{t('View Inspection →')}</Link>
        } />
        <Row label={t('Item')} value={ca.sourceItemLabel} />
        <Row label={t('Description')} value={ca.description} />
        <TranslateButton text={ca.description} style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }} />
        <Row label={t('Created')} value={formatDateTime(ca.createdAt)} />
      </div>

      {/* Assignment */}
      {!isVerified && (
        <div style={card}>
          <p style={sHead}>{t('Assignment')}</p>
          <label style={label}>{t('Assign to')}</label>
          {users.length > 0 ? (
            <select style={{ ...input, marginBottom: '0.875rem' }} value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
              <option value="">{t('— Unassigned —')}</option>
              {users.map(u => <option key={u.id} value={u.email}>{u.displayName || u.email}</option>)}
            </select>
          ) : (
            <input style={input} type="email" placeholder={t('Employee email')} value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
          )}
          <label style={label}>{t('Due date')}</label>
          <input style={input} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <button style={{ ...btn.secondary, fontSize: '0.875rem' }} onClick={handleSaveAssignment} disabled={saving}>
            {t('Save Assignment')}
          </button>
        </div>
      )}

      {isVerified && (ca.assignedTo || ca.dueDate) && (
        <div style={card}>
          <p style={sHead}>{t('Assignment')}</p>
          {ca.assignedTo && <Row label={t('Assigned to')} value={ca.assignedTo.displayName || ca.assignedTo.email} />}
          {ca.dueDate && <Row label={t('Due date')} value={formatDate(ca.dueDate)} />}
        </div>
      )}

      {/* Action Taken */}
      <div style={card}>
        <p style={sHead}>{t('Corrective Action Taken')}</p>
        {isComplete ? (
          <p style={{ fontSize: '0.9rem', color: '#374151' }}>{ca.correctiveActionTaken || '—'}</p>
        ) : (
          <>
            <textarea
              style={{ ...input, minHeight: 100, resize: 'vertical' }}
              placeholder={t('Describe what was done to correct the issue…')}
              value={actionTaken}
              onChange={e => setActionTaken(e.target.value)}
            />
            <TranslateButton text={actionTaken} style={{ marginBottom: '0.875rem' }} />
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                style={{ ...btn.secondary, flex: 1 }}
                onClick={() => handleStatusChange('in_progress')}
                disabled={saving || !actionTaken.trim()}
              >
                {t('Mark In Progress')}
              </button>
              <button
                style={{ ...btn.primary, flex: 1 }}
                onClick={() => handleStatusChange('complete')}
                disabled={saving || !actionTaken.trim()}
              >
                {t('Mark Complete')}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Verification */}
      {ca.status === 'complete' && !isVerified && (
        <div style={{ ...card, borderLeft: '4px solid #7c3aed' }}>
          <p style={sHead}>{t('Supervisor Sign-Off')}</p>
          <label style={label}>{t('Verification notes')}</label>
          <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} placeholder={t('Notes on verification…')} value={verNotes} onChange={e => setVerNotes(e.target.value)} />
          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>{t('Verification photo (optional)')}</label>
            <PhotoUpload storagePath="corrective-actions/verification" onUpload={setVerPhoto} currentUrl={verPhoto?.url} />
          </div>
          <label style={label}>{t('Your full name (signature)')}</label>
          <input style={input} type="text" placeholder={t('Full name')} value={signerName} onChange={e => setSignerName(e.target.value)} />
          <button
            style={{ ...btn.success, width: '100%', opacity: signerName.trim() ? 1 : 0.4 }}
            disabled={!signerName.trim() || saving}
            onClick={handleSignOff}
          >
            {saving ? t('Saving…') : t('✓ Verify & Sign Off')}
          </button>
        </div>
      )}

      {isVerified && (
        <div style={{ ...card, borderLeft: '4px solid #16a34a' }}>
          <p style={sHead}>{t('Verification')}</p>
          {ca.verificationNotes && <Row label={t('Notes')} value={ca.verificationNotes} />}
          {ca.supervisorSignOff && <Row label={t('Signed by')} value={ca.supervisorSignOff.displayName} />}
          {ca.verificationPhotoUrl && (
            <img src={ca.verificationPhotoUrl} alt="Verification" style={{ marginTop: '0.5rem', maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'cover' }} />
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem', gap: '0.5rem' }}>
      <span style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const sHead = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.75rem' }
