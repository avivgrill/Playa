import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, addDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { getNextClientOrderNumber } from '../../utils/clientOrderNumber'
import { card, btn, input, label } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function ClientOrderForm() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState({
    customerId: '', customerName: '',
    product: '', orderedQuantity: '', unit: 'lbs',
    dueDate: '', poNumber: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'customers'), where('status', '==', 'active')))
      .then(snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.customerName?.localeCompare(b.customerName))))
  }, [])

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  function handleCustomerChange(e) {
    const customerId = e.target.value
    const c = customers.find(x => x.id === customerId)
    setForm(prev => ({ ...prev, customerId, customerName: c?.customerName || '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.product.trim()) { alert(t('Product is required.')); return }
    setSaving(true)
    try {
      const orderNumber = await getNextClientOrderNumber()
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const dueDate = form.dueDate ? Timestamp.fromDate(new Date(form.dueDate + 'T00:00:00')) : null

      const ref = await addDoc(collection(db, 'clientOrders'), {
        orderNumber,
        customerId: form.customerId || '',
        customerName: form.customerName || '',
        product: form.product.trim(),
        orderedQuantity: form.orderedQuantity ? Number(form.orderedQuantity) : 0,
        unit: form.unit,
        dueDate,
        poNumber: form.poNumber || '',
        status: 'open',
        notes: form.notes,
        createdAt: serverTimestamp(),
        createdBy: userInfo,
        auditLog: [{ action: 'created', changedBy: userInfo, changedAt: Timestamp.now() }],
      })
      navigate(`/operations/client-orders/${ref.id}`)
    } catch (err) {
      alert(`Save failed: ${err.message}`)
      setSaving(false)
    }
  }

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/operations/client-orders')}>{t('← Client Orders')}</button>
      <h1 style={pageTitle}>{t('New Client Order')}</h1>

      <form onSubmit={handleSubmit} style={card}>
        <label style={label}>{t('Customer')}</label>
        <select style={input} value={form.customerId} onChange={handleCustomerChange}>
          <option value="">{t('— Select customer (optional) —')}</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.customerName}</option>)}
        </select>

        <label style={label}>{t('Product *')}</label>
        <input style={input} value={form.product} onChange={set('product')} placeholder={t('e.g. Dark Chocolate Bar')} />

        <div className="form-row">
          <div>
            <label style={label}>{t('Ordered Quantity')}</label>
            <input style={input} type="number" min="0" value={form.orderedQuantity} onChange={set('orderedQuantity')} placeholder="0" />
          </div>
          <div>
            <label style={label}>{t('Unit')}</label>
            <select style={input} value={form.unit} onChange={set('unit')}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
              <option value="units">units</option>
              <option value="cases">cases</option>
              <option value="oz">oz</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div>
            <label style={label}>{t('Due Date')}</label>
            <input style={input} type="date" value={form.dueDate} onChange={set('dueDate')} />
          </div>
          <div>
            <label style={label}>{t('PO Number')}</label>
            <input style={input} value={form.poNumber} onChange={set('poNumber')} placeholder={t('Optional')} />
          </div>
        </div>

        <label style={label}>{t('Notes')}</label>
        <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={set('notes')} placeholder={t('Any additional notes…')} />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" style={btn.primary} disabled={saving}>
            {saving ? t('Creating…') : t('Create Order')}
          </button>
          <button type="button" style={btn.secondary} onClick={() => navigate('/operations/client-orders')}>
            {t('Cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
