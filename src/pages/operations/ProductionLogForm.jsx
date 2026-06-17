import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { collection, getDocs, addDoc, getDoc, doc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { card, btn, input, label } from '../../styles/common'

const now = () => {
  const d = new Date()
  return d.toISOString().slice(0, 16)
}

export default function ProductionLogForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser } = useAuth()

  const [batches, setBatches] = useState([])
  const [step, setStep] = useState('form')
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sigName, setSigName] = useState('')

  const [form, setForm] = useState({
    batchId: searchParams.get('batchId') || '',
    batchNumber: '',
    productName: '',
    sopId: '',
    sopName: '',
    operator: currentUser?.displayName || currentUser?.email || '',
    startTime: now(),
    endTime: '',
    equipment: '',
    notes: '',
    deviations: '',
  })

  useEffect(() => {
    getDocs(query(collection(db, 'productionBatches'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setBatches(list)
        const preselect = list.find(b => b.id === form.batchId)
        if (preselect) {
          setForm(prev => ({
            ...prev,
            batchNumber: preselect.batchNumber,
            productName: preselect.productName,
            sopId: preselect.sopId || '',
            sopName: preselect.sopName || '',
          }))
        }
      })
  }, [])

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  function handleBatchChange(e) {
    const batchId = e.target.value
    const selected = batches.find(b => b.id === batchId)
    setForm(prev => ({
      ...prev,
      batchId,
      batchNumber: selected?.batchNumber || '',
      productName: selected?.productName || '',
      sopId: selected?.sopId || '',
      sopName: selected?.sopName || '',
    }))
  }

  async function handlePhotoAdd(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fileRef = ref(storage, `productionLogs/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      setPhotos(prev => [...prev, { url, path: fileRef.fullPath }])
    } catch {
      alert('Photo upload failed.')
    }
    setUploading(false)
    e.target.value = ''
  }

  function removePhoto(i) {
    setPhotos(prev => prev.filter((_, j) => j !== i))
  }

  async function handleSubmit() {
    if (!sigName.trim()) { alert('Please enter your name to sign.'); return }
    setSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const startDt = form.startTime ? new Date(form.startTime) : new Date()
      const endDt = form.endTime ? new Date(form.endTime) : null

      const docRef = await addDoc(collection(db, 'productionLogs'), {
        batchId: form.batchId,
        batchNumber: form.batchNumber,
        productName: form.productName,
        sopId: form.sopId || null,
        sopName: form.sopName || null,
        operator: form.operator,
        startTime: Timestamp.fromDate(startDt),
        endTime: endDt ? Timestamp.fromDate(endDt) : null,
        equipment: form.equipment,
        notes: form.notes,
        deviations: form.deviations,
        photoUrls: photos.map(p => p.url),
        photoPaths: photos.map(p => p.path),
        signature: { signedBy: sigName.trim(), signedAt: Timestamp.now() },
        createdAt: serverTimestamp(),
        createdBy: userInfo,
        auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now() }],
      })
      navigate(`/operations/logs/${docRef.id}`)
    } catch (err) {
      alert(`Submit failed: ${err.message}`)
      setSaving(false)
    }
  }

  if (step === 'sign') {
    return (
      <div>
        <button style={backBtn} onClick={() => setStep('form')}>← Back to Form</button>
        <h1 style={pageTitle}>Sign Production Log</h1>
        <div style={card}>
          <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '1rem' }}>
            By signing, I confirm the information in this production log is accurate and complete.
          </p>
          <label style={labelStyle}>Type your full name to sign</label>
          <input
            style={inputStyle}
            value={sigName}
            onChange={e => setSigName(e.target.value)}
            placeholder="Your full name"
            autoFocus
          />
          <button style={btn.success} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit & Sign'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/operations/logs')}>← Production Logs</button>
      <h1 style={pageTitle}>New Production Log</h1>

      <div style={card}>
        <label style={labelStyle}>Production Batch *</label>
        <select style={inputStyle} value={form.batchId} onChange={handleBatchChange}>
          <option value="">— Select batch —</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>{b.batchNumber} – {b.productName}</option>
          ))}
        </select>

        {form.sopName && (
          <div style={{ marginBottom: '0.875rem', padding: '0.6rem 0.875rem', background: '#f0fdf4', borderRadius: 8, fontSize: '0.875rem', color: '#15803d' }}>
            SOP: {form.sopName}
          </div>
        )}

        <label style={labelStyle}>Operator</label>
        <input style={inputStyle} value={form.operator} onChange={set('operator')} placeholder="Your name" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Start Time</label>
            <input style={inputStyle} type="datetime-local" value={form.startTime} onChange={set('startTime')} />
          </div>
          <div>
            <label style={labelStyle}>End Time</label>
            <input style={inputStyle} type="datetime-local" value={form.endTime} onChange={set('endTime')} />
          </div>
        </div>

        <label style={labelStyle}>Equipment Used</label>
        <input style={inputStyle} value={form.equipment} onChange={set('equipment')} placeholder="e.g. Mixer #2, Tempering Machine" />

        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={form.notes}
          onChange={set('notes')}
          placeholder="Production notes…"
        />

        <label style={labelStyle}>Deviations</label>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical', borderColor: form.deviations ? '#f59e0b' : '#d1d5db' }}
          value={form.deviations}
          onChange={set('deviations')}
          placeholder="Any deviations from the SOP or expected process? Leave blank if none."
        />

        <label style={labelStyle}>Photos</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={p.url} alt="Production photo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
          ))}
          {photos.length < 10 && (
            <label style={{ ...addPhotoBtn, opacity: uploading ? 0.6 : 1 }}>
              {uploading ? '…' : '📷\nAdd'}
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoAdd} disabled={uploading} />
            </label>
          )}
        </div>

        <button
          style={btn.primary}
          onClick={() => {
            if (!form.batchId) { alert('Please select a batch.'); return }
            setStep('sign')
          }}
        >
          Review & Sign →
        </button>
      </div>
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }
const inputStyle = {
  display: 'block', width: '100%', padding: '0.7rem 0.875rem',
  border: '1px solid #d1d5db', borderRadius: 8, fontSize: '1rem',
  marginBottom: '0.875rem', background: '#fff',
}
const addPhotoBtn = {
  width: 80, height: 80, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  border: '1.5px dashed #93c5fd', borderRadius: 8,
  cursor: 'pointer', color: '#1d4ed8', fontSize: '0.7rem',
  textAlign: 'center', whiteSpace: 'pre', background: '#eff6ff',
}
