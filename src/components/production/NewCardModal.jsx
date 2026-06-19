import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { getNextBatchNumber } from '../../utils/batchNumber'
import Modal from '../Modal'
import { btn, input, label } from '../../styles/common'

export default function NewCardModal({ onClose, onCreated }) {
  const { currentUser } = useAuth()
  const [sops, setSops] = useState([])
  const [form, setForm] = useState({ productName: '', sopId: '', sopName: '', plannedDate: '', status: 'backlog', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'sops'), where('status', '==', 'active')))
      .then(snap => setSops(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))))
  }, [])

  const set = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))

  function handleSopChange(e) {
    const sopId = e.target.value
    const sop = sops.find(s => s.id === sopId)
    setForm(prev => ({ ...prev, sopId, sopName: sop?.name || '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.productName.trim() || saving) return
    setSaving(true)
    try {
      const batchNumber = await getNextBatchNumber()
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const docRef = await addDoc(collection(db, 'productionBatches'), {
        batchNumber,
        productName: form.productName.trim(),
        sopId: form.sopId || null,
        sopName: form.sopName || '',
        productionDate: form.plannedDate ? Timestamp.fromDate(new Date(form.plannedDate + 'T00:00:00')) : null,
        status: form.status,
        notes: form.notes.trim(),
        quantityProduced: 0,
        plannedQuantity: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userInfo,
        auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now() }],
      })
      onCreated({ id: docRef.id, batchNumber, productName: form.productName.trim(), sopName: form.sopName, status: form.status, notes: form.notes.trim(), quantityProduced: 0 })
      onClose()
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  return (
    <Modal title="New Production Card" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={label}>Product Name *</label>
        <input style={input} value={form.productName} onChange={set('productName')} placeholder="e.g. Dark Chocolate Bar" required />

        <label style={label}>SOP</label>
        <select style={input} value={form.sopId} onChange={handleSopChange}>
          <option value="">— Select SOP —</option>
          {sops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <label style={label}>Planned Date</label>
        <input style={input} type="date" value={form.plannedDate} onChange={set('plannedDate')} />

        <label style={label}>Initial Status</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem' }}>
          {['backlog', 'queued'].map(s => (
            <button key={s} type="button"
              style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: `2px solid ${form.status === s ? '#1d4ed8' : '#e5e7eb'}`, background: form.status === s ? '#eff6ff' : '#fff', color: form.status === s ? '#1d4ed8' : '#374151', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              onClick={() => setForm(prev => ({ ...prev, status: s }))}>
              {s === 'backlog' ? 'Backlog' : 'In Queue'}
            </button>
          ))}
        </div>

        <label style={label}>Notes</label>
        <textarea style={{ ...input, minHeight: 64, resize: 'vertical', marginBottom: '1rem' }} value={form.notes} onChange={set('notes')} placeholder="Optional notes…" />

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" style={{ ...btn.secondary, flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="submit" style={{ ...btn.primary, flex: 2, opacity: form.productName.trim() ? 1 : 0.4 }} disabled={!form.productName.trim() || saving}>
            {saving ? 'Creating…' : 'Create Card'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
