import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { collection, getDocs, addDoc, getDoc, doc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { getNextBatchNumber } from '../../utils/batchNumber'
import { card, btn, input, label } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function BatchForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const [sops, setSops] = useState([])
  const [clientOrders, setClientOrders] = useState([])
  const [form, setForm] = useState({
    productName: '',
    sopId: '',
    sopName: '',
    productionDate: new Date().toISOString().split('T')[0],
    plannedQuantity: '',
    unit: 'lbs',
    status: 'backlog',
    clientOrderId: searchParams.get('clientOrderId') || '',
    clientOrderNumber: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'sops'), where('status', '==', 'active')))
      .then(snap => setSops(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))))
    getDocs(query(collection(db, 'clientOrders'), where('status', 'in', ['open', 'in_production'])))
      .then(snap => setClientOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.orderNumber || '').localeCompare(b.orderNumber || ''))))

    const coId = searchParams.get('clientOrderId')
    if (coId) {
      getDoc(doc(db, 'clientOrders', coId)).then(snap => {
        if (snap.exists()) {
          const co = snap.data()
          setForm(prev => ({ ...prev, clientOrderNumber: co.orderNumber || '', product: co.product || '' }))
        }
      })
    }
  }, [])

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  function handleSopChange(e) {
    const sopId = e.target.value
    const selected = sops.find(s => s.id === sopId)
    setForm(prev => ({ ...prev, sopId, sopName: selected ? selected.name : '' }))
  }

  function handleClientOrderChange(e) {
    const clientOrderId = e.target.value
    const co = clientOrders.find(x => x.id === clientOrderId)
    setForm(prev => ({ ...prev, clientOrderId, clientOrderNumber: co?.orderNumber || '', productName: co?.product || prev.productName }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.productName.trim()) {
      alert(t('Product name is required.'))
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
        plannedQuantity: form.plannedQuantity ? Number(form.plannedQuantity) : 0,
        quantityProduced: 0,
        unit: form.unit,
        status: form.status,
        clientOrderId: form.clientOrderId || '',
        clientOrderNumber: form.clientOrderNumber || '',
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
      <button style={backBtn} onClick={() => navigate('/operations/batches')}>{t('← Work Orders')}</button>
      <h1 style={pageTitle}>{t('New Work Order')}</h1>

      <form onSubmit={handleSubmit} style={card}>
        {clientOrders.length > 0 && (
          <>
            <label style={label}>{t('Client Order (optional)')}</label>
            <select style={input} value={form.clientOrderId} onChange={handleClientOrderChange}>
              <option value="">{t('— Link to client order —')}</option>
              {clientOrders.map(co => (
                <option key={co.id} value={co.id}>{co.orderNumber} — {co.product} ({co.customerName})</option>
              ))}
            </select>
          </>
        )}

        <label style={label}>{t('Product Name *')}</label>
        <input style={input} value={form.productName} onChange={set('productName')} placeholder={t('e.g. Dark Chocolate Bar')} />

        <label style={label}>{t('SOP')}</label>
        <select style={input} value={form.sopId} onChange={handleSopChange}>
          <option value="">{t('— Select SOP (optional) —')}</option>
          {sops.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <label style={label}>{t('Planned Date')}</label>
        <input style={input} type="date" value={form.productionDate} onChange={set('productionDate')} />

        <div className="form-row">
          <div>
            <label style={label}>{t('Planned Quantity')}</label>
            <input style={input} type="number" min="0" value={form.plannedQuantity} onChange={set('plannedQuantity')} placeholder="0" />
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

        <label style={label}>{t('Status')}</label>
        <select style={input} value={form.status} onChange={set('status')}>
          <option value="backlog">{t('Backlog')}</option>
          <option value="queued">{t('In Queue')}</option>
          <option value="in_production">{t('In Progress')}</option>
          <option value="packaged">{t('Packaged')}</option>
          <option value="complete">{t('Complete')}</option>
          <option value="hold">{t('Hold')}</option>
        </select>

        <label style={label}>{t('Notes')}</label>
        <textarea
          style={{ ...input, minHeight: 80, resize: 'vertical' }}
          value={form.notes}
          onChange={set('notes')}
          placeholder={t('Any additional notes…')}
        />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="submit" style={btn.primary} disabled={saving}>
            {saving ? t('Creating…') : t('Create Work Order')}
          </button>
          <button type="button" style={btn.secondary} onClick={() => navigate('/operations/batches')}>
            {t('Cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
