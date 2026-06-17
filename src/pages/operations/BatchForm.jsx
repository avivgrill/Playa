import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { getNextBatchNumber } from '../../utils/batchNumber'
import { card, btn, input, label } from '../../styles/common'

export default function BatchForm() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [sops, setSops] = useState([])
  const [form, setForm] = useState({
    productName: '',
    sopId: '',
    sopName: '',
    productionDate: new Date().toISOString().split('T')[0],
    quantityProduced: '',
    unit: 'lbs',
    status: 'scheduled',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'sops'), where('status', '==', 'active'), orderBy('name', 'asc')))
      .then(snap => setSops(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  function handleSopChange(e) {
    const sopId = e.target.value
    const selected = sops.find(s => s.id === sopId)
    setForm(prev => ({ ...prev, sopId, sopName: selected ? selected.name : '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.productName.trim()) {
      alert('Product name is required.')
      return
    }
    setSaving(true)
    try {
      const batchNumber = await getNextBatchNumber()
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const productionDate = form.productionDate ? new Date(form.productionDate + 'T00:00:00') : new Date()

      const docRef = await addDoc(collection(db, 'productionBatches'), {
        batchNumber,
        productName: form.productName.trim(),
        sopId: form.sopId || null,
        sopName: form.sopName || null,
        productionDate: Timestamp.fromDate(productionDate),
        quantityProduced: form.quantityProduced ? Number(form.quantityProduced) : 0,
        unit: form.unit,
        status: form.status,
        notes: form.notes,
        createdAt: serverTimestamp(),
        createdBy: userInfo,
        auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now() }],
      })
      navigate(`/operations/batches/${docRef.id}`)
    } catch (err) {
      alert(`Save failed: ${err.message}`)
      setSaving(false)
    }
  }

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/operations/batches')}>← Batches</button>
      <h1 style={pageTitle}>New Production Batch</h1>

      <form onSubmit={handleSubmit} style={card}>
        <label style={label}>Product Name *</label>
        <input style={input} value={form.productName} onChange={set('productName')} placeholder="e.g. Dark Chocolate Bar" />

        <label style={label}>SOP</label>
        <select style={input} value={form.sopId} onChange={handleSopChange}>
          <option value="">— Select SOP (optional) —</option>
          {sops.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <label style={label}>Production Date</label>
        <input style={input} type="date" value={form.productionDate} onChange={set('productionDate')} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={label}>Quantity Produced</label>
            <input style={input} type="number" min="0" value={form.quantityProduced} onChange={set('quantityProduced')} placeholder="0" />
          </div>
          <div>
            <label style={label}>Unit</label>
            <select style={input} value={form.unit} onChange={set('unit')}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
              <option value="units">units</option>
              <option value="cases">cases</option>
              <option value="oz">oz</option>
            </select>
          </div>
        </div>

        <label style={label}>Status</label>
        <select style={input} value={form.status} onChange={set('status')}>
          <option value="scheduled">Scheduled</option>
          <option value="in_production">In Production</option>
          <option value="complete">Complete</option>
          <option value="hold">Hold</option>
          <option value="released">Released</option>
        </select>

        <label style={label}>Notes</label>
        <textarea
          style={{ ...input, minHeight: 80, resize: 'vertical' }}
          value={form.notes}
          onChange={set('notes')}
          placeholder="Any additional notes…"
        />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" style={btn.primary} disabled={saving}>
            {saving ? 'Creating…' : 'Create Batch'}
          </button>
          <button type="button" style={btn.secondary} onClick={() => navigate('/operations/batches')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
