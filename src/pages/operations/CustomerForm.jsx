import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { card, btn, input, label } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function CustomerForm() {
  const { id } = useParams()
  const isEdit = id && id !== 'new'
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { currentUser } = useAuth()

  const [form, setForm] = useState({
    customerName: '',
    contactName: '',
    email: '',
    phone: '',
    status: 'active',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    getDoc(doc(db, 'customers', id)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setForm({
          customerName: d.customerName || '',
          contactName: d.contactName || '',
          email: d.email || '',
          phone: d.phone || '',
          status: d.status || 'active',
          notes: d.notes || '',
        })
      }
      setLoading(false)
    })
  }, [id, isEdit])

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.customerName.trim()) {
      alert('Customer name is required.')
      return
    }
    setSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }

      if (isEdit) {
        await updateDoc(doc(db, 'customers', id), {
          ...form,
          updatedAt: serverTimestamp(),
          auditLog: arrayUnion({ action: 'updated', changedBy: userInfo, changedAt: Timestamp.now() }),
        })
        navigate(`/operations/customers/${id}`)
      } else {
        const docRef = await addDoc(collection(db, 'customers'), {
          ...form,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userInfo,
          auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now() }],
        })
        navigate(`/operations/customers/${docRef.id}`)
      }
    } catch (err) {
      alert(`Save failed: ${err.message}`)
      setSaving(false)
    }
  }

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>{t('Loading…')}</p>

  return (
    <div>
      <button style={backBtn} onClick={() => navigate(isEdit ? `/operations/customers/${id}` : '/operations/customers')}>
        {isEdit ? t('← Back to Customer') : t('← Back to Customers')}
      </button>
      <h1 style={pageTitle}>{isEdit ? t('Edit Customer') : t('New Customer')}</h1>

      <form onSubmit={handleSubmit} style={card}>
        <label style={label}>{t('Customer Name *')}</label>
        <input style={input} value={form.customerName} onChange={set('customerName')} placeholder={t('e.g. Sweet Treats Co.')} />

        <label style={label}>{t('Contact Name')}</label>
        <input style={input} value={form.contactName} onChange={set('contactName')} placeholder={t('e.g. Jane Smith')} />

        <label style={label}>{t('Email')}</label>
        <input style={input} type="email" value={form.email} onChange={set('email')} placeholder="contact@example.com" />

        <label style={label}>{t('Phone')}</label>
        <input style={input} type="tel" value={form.phone} onChange={set('phone')} placeholder="(555) 000-0000" />

        <label style={label}>{t('Status')}</label>
        <select style={input} value={form.status} onChange={set('status')}>
          <option value="active">{t('Active')}</option>
          <option value="inactive">{t('Inactive')}</option>
        </select>

        <label style={label}>{t('Notes')}</label>
        <textarea
          style={{ ...input, minHeight: 80, resize: 'vertical' }}
          value={form.notes}
          onChange={set('notes')}
          placeholder={t('Any notes about this customer…')}
        />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" style={btn.primary} disabled={saving}>
            {saving ? t('Saving…') : isEdit ? t('Save Changes') : t('Add Customer')}
          </button>
          <button
            type="button"
            style={btn.secondary}
            onClick={() => navigate(isEdit ? `/operations/customers/${id}` : '/operations/customers')}
          >
            {t('Cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
