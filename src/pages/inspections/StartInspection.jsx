import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { DAILY_FACILITY_ITEMS, PRE_OP_ITEMS } from '../../data/checklists'
import { getNextCANumber } from '../../utils/caNumber'
import PhotoUpload from '../../components/PhotoUpload'
import { card, btn, input, label } from '../../styles/common'

export default function StartInspection() {
  const { type } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const checklist = type === 'daily_facility' ? DAILY_FACILITY_ITEMS : PRE_OP_ITEMS
  const title = type === 'daily_facility' ? 'Daily Facility Inspection' : 'Pre-Operational Inspection'

  const [items, setItems] = useState(checklist.map(i => ({ ...i, result: null, notes: '', photoUrl: null, photoPath: null })))
  const [step, setStep] = useState('checklist')
  const [signerName, setSignerName] = useState(currentUser.displayName || '')
  const [submitting, setSubmitting] = useState(false)
  const [createdCAs, setCreatedCAs] = useState([])

  useEffect(() => {
    const dirty = items.some(i => i.result !== null)
    if (!dirty) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [items])

  const setResult = (idx, result) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, result } : item))

  const setNotes = (idx, notes) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, notes } : item))

  const setPhoto = (idx, { url, path }) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, photoUrl: url, photoPath: path } : item))

  const failed = items.filter(i => i.result === 'fail')
  const allAnswered = items.every(i => i.result !== null)
  const canReview = allAnswered && failed.every(i => i.notes.trim())

  async function handleSubmit() {
    if (!signerName.trim() || submitting) return
    setSubmitting(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const today = new Date().toISOString().slice(0, 10)

      const inspRef = await addDoc(collection(db, 'inspections'), {
        type,
        status: 'completed',
        overallResult: failed.length > 0 ? 'fail' : 'pass',
        date: today,
        startedAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        createdBy: userInfo,
        items,
        failedItemCount: failed.length,
        signature: { signedBy: signerName.trim(), signedAt: serverTimestamp() },
        auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now(), changes: {} }],
      })

      const caNumbers = []
      for (const item of failed) {
        const caNumber = await getNextCANumber()
        await addDoc(collection(db, 'correctiveActions'), {
          caNumber,
          sourceType: 'inspection',
          sourceId: inspRef.id,
          sourceItemLabel: item.label,
          description: item.notes,
          assignedTo: null,
          dueDate: null,
          status: 'open',
          correctiveActionTaken: '',
          verificationNotes: '',
          verificationPhotoUrl: null,
          verificationPhotoPath: null,
          supervisorSignOff: null,
          createdAt: serverTimestamp(),
          createdBy: userInfo,
          auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now(), changes: {} }],
        })
        caNumbers.push(caNumber)
      }

      setCreatedCAs(caNumbers)
      setStep('done')
    } catch (err) {
      console.error(err)
      alert('Error submitting. Please try again.')
    }
    setSubmitting(false)
  }

  if (step === 'done') return (
    <div style={{ maxWidth: 560, margin: '2rem auto' }}>
      <div style={{ ...card, textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Inspection Submitted</h2>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          {failed.length === 0 ? 'All items passed.' : `${failed.length} corrective action${failed.length > 1 ? 's' : ''} created.`}
        </p>
        {createdCAs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
            {createdCAs.map(ca => (
              <span key={ca} style={{ background: '#fef9c3', color: '#a16207', padding: '0.3rem 0.75rem', borderRadius: 99, fontSize: '0.875rem', fontWeight: 600 }}>{ca}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {createdCAs.length > 0 && (
            <button style={btn.primary} onClick={() => navigate('/corrective-actions')}>View Corrective Actions</button>
          )}
          <button style={btn.secondary} onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  )

  if (step === 'sign') return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={card}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Sign & Submit</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem' }}>Type your full name to sign this inspection record.</p>

        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Pass', count: items.filter(i => i.result === 'pass').length, color: '#16a34a' },
            { label: 'Fail', count: failed.length, color: '#dc2626' },
            { label: 'N/A', count: items.filter(i => i.result === 'na').length, color: '#9ca3af' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {failed.length > 0 && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '0.6rem 0.875rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#92400e' }}>
            ⚠️ {failed.length} corrective action{failed.length > 1 ? 's' : ''} will be created automatically
          </div>
        )}

        <label style={label}>Your full name</label>
        <input style={input} type="text" placeholder="Full name" value={signerName} onChange={e => setSignerName(e.target.value)} autoFocus />

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={btn.secondary} onClick={() => setStep('review')}>← Back</button>
          <button
            style={{ ...btn.primary, flex: 1, opacity: signerName.trim() ? 1 : 0.5 }}
            disabled={!signerName.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting…' : 'Confirm & Submit'}
          </button>
        </div>
      </div>
    </div>
  )

  if (step === 'review') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <button style={backBtn} onClick={() => setStep('checklist')}>← Back</button>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{title} — Review</h2>
      </div>

      <div style={card}>
        {items.map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.6rem 0', borderBottom: '1px solid #f3f4f6',
            borderLeft: `3px solid ${item.result === 'pass' ? '#16a34a' : item.result === 'fail' ? '#dc2626' : '#d1d5db'}`,
            paddingLeft: '0.75rem',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', color: '#374151' }}>{item.label}</div>
              {item.notes && <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>{item.notes}</div>}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.result === 'pass' ? '#16a34a' : item.result === 'fail' ? '#dc2626' : '#9ca3af', whiteSpace: 'nowrap' }}>
              {item.result === 'na' ? 'N/A' : item.result?.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {failed.length > 0 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#92400e' }}>
          ⚠️ {failed.length} corrective action{failed.length > 1 ? 's' : ''} will be created automatically
        </div>
      )}

      <button style={{ ...btn.primary, width: '100%' }} onClick={() => setStep('sign')}>Sign & Submit →</button>
    </div>
  )

  // Checklist step
  const answeredCount = items.filter(i => i.result !== null).length
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <button style={backBtn} onClick={() => navigate(-1)}>← Back</button>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1 }}>{title}</h2>
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{answeredCount}/{items.length}</span>
      </div>

      {items.map((item, idx) => (
        <div key={item.id} style={{ ...card, borderLeft: item.result ? `4px solid ${item.result === 'pass' ? '#16a34a' : item.result === 'fail' ? '#dc2626' : '#d1d5db'}` : `4px solid #e5e7eb` }}>
          <div style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>{item.label}</div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: item.result === 'fail' ? '0.75rem' : 0 }}>
            {[['pass', 'PASS', '#16a34a'], ['fail', 'FAIL', '#dc2626'], ['na', 'N/A', '#6b7280']].map(([val, lbl, color]) => (
              <button
                key={val}
                style={{
                  flex: 1, padding: '0.75rem 0', border: `2px solid ${item.result === val ? color : '#e5e7eb'}`,
                  borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                  background: item.result === val ? color : '#fff',
                  color: item.result === val ? '#fff' : '#6b7280',
                }}
                onClick={() => setResult(idx, val)}
              >
                {lbl}
              </button>
            ))}
          </div>

          {item.result === 'fail' && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#92400e', marginBottom: '0.5rem' }}>
                ⚠️ A corrective action will be created — notes required
              </div>
              <textarea
                style={{ ...input, marginBottom: 0, minHeight: 80, resize: 'vertical' }}
                placeholder="Describe the issue…"
                value={item.notes}
                onChange={e => setNotes(idx, e.target.value)}
              />
            </div>
          )}

          {item.result && (
            <div style={{ marginTop: '0.5rem' }}>
              <PhotoUpload
                storagePath="inspections/items"
                onUpload={(data) => setPhoto(idx, data)}
                currentUrl={item.photoUrl}
              />
            </div>
          )}
        </div>
      ))}

      <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
        {!allAnswered && <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Answer all {items.length} items to continue</p>}
        {allAnswered && !canReview && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Add notes for all failed items to continue</p>}
        <button
          style={{ ...btn.primary, width: '100%', opacity: canReview ? 1 : 0.4 }}
          disabled={!canReview}
          onClick={() => setStep('review')}
        >
          Review & Submit →
        </button>
      </div>
    </div>
  )
}

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }
