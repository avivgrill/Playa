import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { card, btn, input, label } from '../../styles/common'

export default function SOPForm() {
  const { id } = useParams()
  const isEdit = id && id !== 'new'
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [form, setForm] = useState({
    name: '',
    productType: '',
    instructions: '',
    notes: '',
    status: 'active',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    getDoc(doc(db, 'sops', id)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setForm({
          name: d.name || '',
          productType: d.productType || '',
          instructions: d.instructions || '',
          notes: d.notes || '',
          status: d.status || 'active',
        })
      }
      setLoading(false)
    })
  }, [id, isEdit])

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.productType.trim()) {
      alert('Name and Product Type are required.')
      return
    }
    setSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }

      if (isEdit) {
        await updateDoc(doc(db, 'sops', id), {
          ...form,
          updatedAt: serverTimestamp(),
          auditLog: arrayUnion({ action: 'updated', changedBy: userInfo, changedAt: Timestamp.now() }),
        })
        navigate(`/operations/sops/${id}`)
      } else {
        const docRef = await addDoc(collection(db, 'sops'), {
          ...form,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userInfo,
          auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now() }],
        })
        navigate(`/operations/sops/${docRef.id}`)
      }
    } catch (err) {
      alert(`Save failed: ${err.message}`)
      setSaving(false)
    }
  }

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>Loading…</p>

  return (
    <div>
      <button style={backBtn} onClick={() => navigate(isEdit ? `/operations/sops/${id}` : '/operations/sops')}>
        ← {isEdit ? 'Back to SOP' : 'Back to SOPs'}
      </button>
      <h1 style={pageTitle}>{isEdit ? 'Edit SOP' : 'New SOP'}</h1>

      <form onSubmit={handleSubmit} style={card}>
        <label style={label}>SOP Name *</label>
        <input style={input} value={form.name} onChange={set('name')} placeholder="e.g. Chocolate Bar Production" />

        <label style={label}>Product Type *</label>
        <input style={input} value={form.productType} onChange={set('productType')} placeholder="e.g. Chocolate, Candy, All Products" />

        <label style={label}>Instructions</label>
        <textarea
          style={{ ...input, minHeight: 140, resize: 'vertical' }}
          value={form.instructions}
          onChange={set('instructions')}
          placeholder="Step-by-step production instructions…"
        />

        <label style={label}>Notes</label>
        <textarea
          style={{ ...input, minHeight: 80, resize: 'vertical' }}
          value={form.notes}
          onChange={set('notes')}
          placeholder="Additional notes, references, or special requirements…"
        />

        <label style={label}>Status</label>
        <select style={input} value={form.status} onChange={set('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" style={btn.primary} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create SOP'}
          </button>
          <button
            type="button"
            style={btn.secondary}
            onClick={() => navigate(isEdit ? `/operations/sops/${id}` : '/operations/sops')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
