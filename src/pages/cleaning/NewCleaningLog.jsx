import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import PhotoUpload from '../../components/PhotoUpload'
import { card, btn, input, label } from '../../styles/common'

export default function NewCleaningLog() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [form, setForm] = useState({ area: '', equipment: '', chemical: '', concentration: '', notes: '' })
  const [photo, setPhoto] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  const canSubmit = form.area.trim() && form.equipment.trim() && form.chemical.trim()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      await addDoc(collection(db, 'cleaningLogs'), {
        area: form.area.trim(),
        equipment: form.equipment.trim(),
        chemical: form.chemical.trim(),
        concentration: form.concentration.trim(),
        notes: form.notes.trim(),
        photoUrl: photo?.url || null,
        photoPath: photo?.path || null,
        completedAt: serverTimestamp(),
        createdBy: userInfo,
        verificationStatus: 'pending',
        verification: null,
        auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now(), changes: {} }],
      })
      navigate('/cleaning')
    } catch (err) {
      console.error(err)
      alert('Error saving. Please try again.')
    }
    setSubmitting(false)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <button style={backBtn} onClick={() => navigate('/cleaning')}>← Cleaning Logs</button>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>New Cleaning Log</h1>

      <form onSubmit={handleSubmit} style={card}>
        <Field label="Area cleaned *" value={form.area} onChange={set('area')} placeholder="e.g. Production floor, Break room" />
        <Field label="Equipment cleaned *" value={form.equipment} onChange={set('equipment')} placeholder="e.g. Mixer #2, Conveyor belt" />
        <Field label="Cleaning chemical *" value={form.chemical} onChange={set('chemical')} placeholder="e.g. Quat sanitizer" />
        <Field label="Concentration / dilution" value={form.concentration} onChange={set('concentration')} placeholder="e.g. 200 ppm" />
        <Field label="Notes" value={form.notes} onChange={set('notes')} placeholder="Any additional notes" textarea />

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={label}>Photo (optional)</label>
          <PhotoUpload storagePath="cleaning" onUpload={setPhoto} currentUrl={photo?.url} />
        </div>

        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <strong style={{ color: '#374151' }}>Submitted by:</strong> {currentUser.displayName || currentUser.email}
        </div>

        <button
          type="submit"
          style={{ ...btn.primary, width: '100%', opacity: canSubmit ? 1 : 0.4 }}
          disabled={!canSubmit || submitting}
        >
          {submitting ? 'Saving…' : 'Submit Cleaning Log'}
        </button>
      </form>
    </div>
  )
}

function Field({ label: lbl, value, onChange, placeholder, textarea }) {
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.3rem' }}>{lbl}</label>
      {textarea ? (
        <textarea style={{ ...input, minHeight: 80, resize: 'vertical', marginBottom: 0 }} value={value} onChange={onChange} placeholder={placeholder} />
      ) : (
        <input style={{ ...input, marginBottom: 0 }} type="text" value={value} onChange={onChange} placeholder={placeholder} />
      )}
    </div>
  )
}

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
