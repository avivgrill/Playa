import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { card, btn, input, label } from '../../styles/common'

const CATEGORIES = ['Base', 'Inclusions', 'Flavor', 'Preservative', 'Packaging', 'Other']
const UNITS = ['lbs', 'oz', 'kg', 'g', 'units', 'cases', 'bags', 'gallons', 'liters']
const ALLERGENS = ['Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soybeans', 'Sesame']

export default function IngredientForm() {
  const { id } = useParams()
  const isEdit = id && id !== 'new'
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [form, setForm] = useState({ name: '', category: 'Base', supplier: '', unit: 'lbs', status: 'active', notes: '' })
  const [allergens, setAllergens] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    getDoc(doc(db, 'ingredients', id)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setForm({ name: d.name || '', category: d.category || 'Base', supplier: d.supplier || '', unit: d.unit || 'lbs', status: d.status || 'active', notes: d.notes || '' })
        setAllergens(d.allergens || [])
      }
      setLoading(false)
    })
  }, [id, isEdit])

  const set = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))

  function toggleAllergen(a) {
    setAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { alert('Ingredient name is required.'); return }
    setSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const data = { ...form, allergens, allergenFlag: allergens.length > 0 }

      if (isEdit) {
        await updateDoc(doc(db, 'ingredients', id), {
          ...data, updatedAt: serverTimestamp(),
          auditLog: arrayUnion({ action: 'updated', changedBy: userInfo, changedAt: Timestamp.now() }),
        })
        navigate(`/operations/ingredients/${id}`)
      } else {
        const ref = await addDoc(collection(db, 'ingredients'), {
          ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: userInfo,
          auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now() }],
        })
        navigate(`/operations/ingredients/${ref.id}`)
      }
    } catch (err) {
      alert(`Save failed: ${err.message}`)
      setSaving(false)
    }
  }

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>Loading…</p>

  return (
    <div>
      <button style={backBtn} onClick={() => navigate(isEdit ? `/operations/ingredients/${id}` : '/operations/ingredients')}>
        ← {isEdit ? 'Back' : 'Ingredients'}
      </button>
      <h1 style={pageTitle}>{isEdit ? 'Edit Ingredient' : 'New Ingredient'}</h1>

      <form onSubmit={handleSubmit} style={card}>
        <label style={label}>Ingredient Name *</label>
        <input style={input} value={form.name} onChange={set('name')} placeholder="e.g. Dark Chocolate Chips" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={label}>Category</label>
            <select style={input} value={form.category} onChange={set('category')}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Unit of Measure</label>
            <select style={input} value={form.unit} onChange={set('unit')}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <label style={label}>Supplier</label>
        <input style={input} value={form.supplier} onChange={set('supplier')} placeholder="Supplier name" />

        <label style={label}>Allergens</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
          {ALLERGENS.map(a => (
            <label key={a} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.3rem 0.65rem', border: `1px solid ${allergens.includes(a) ? '#f59e0b' : '#d1d5db'}`, borderRadius: 20, background: allergens.includes(a) ? '#fef3c7' : '#fff', color: allergens.includes(a) ? '#92400e' : '#374151' }}>
              <input type="checkbox" checked={allergens.includes(a)} onChange={() => toggleAllergen(a)} style={{ width: 14, height: 14 }} />
              {a}
            </label>
          ))}
        </div>

        <label style={label}>Status</label>
        <select style={input} value={form.status} onChange={set('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <label style={label}>Notes</label>
        <textarea style={{ ...input, minHeight: 70, resize: 'vertical' }} value={form.notes} onChange={set('notes')} placeholder="Optional notes…" />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" style={btn.primary} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Ingredient'}
          </button>
          <button type="button" style={btn.secondary} onClick={() => navigate(isEdit ? `/operations/ingredients/${id}` : '/operations/ingredients')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
