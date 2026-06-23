import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  collection, getDocs, addDoc, doc, query, where,
  serverTimestamp, Timestamp, runTransaction, arrayUnion
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { getNextLotNumber } from '../../utils/lotNumber'
import { card, btn, input, label } from '../../styles/common'
import { useTranslation } from 'react-i18next'

const STORAGE_LOCATIONS = ['Dry Storage', 'Refrigerator', 'QX Warehouse']

export default function ReceiveInventory({ onClose }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { currentUser } = useAuth()

  const [ingredients, setIngredients] = useState([])
  const [selectedIng, setSelectedIng] = useState(null)
  const [form, setForm] = useState({
    ingredientId: searchParams.get('ingredientId') || '',
    supplierLotNumber: '',
    quantity: '',
    unit: '',
    dateReceived: new Date().toISOString().split('T')[0],
    storageLocation: 'Dry Storage',
    palletNumber: '',
    notes: '',
  })
  const [photo, setPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null) // { lotNumber, lotId, ingredientId, ingredientName, qty, unit }

  // Tag-to-batch state
  const [activeBatches, setActiveBatches] = useState([])
  const [tagBatchId, setTagBatchId] = useState('')
  const [tagQty, setTagQty] = useState('')
  const [tagging, setTagging] = useState(false)
  const [tagged, setTagged] = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'ingredients'), where('status', '==', 'active')))
      .then(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))
        setIngredients(list)
        const pre = list.find(i => i.id === form.ingredientId)
        if (pre) {
          setSelectedIng(pre)
          setForm(prev => ({ ...prev, unit: pre.unit }))
        }
      })
  }, [])

  // Load in-production batches when success screen appears
  useEffect(() => {
    if (!success) return
    getDocs(query(collection(db, 'productionBatches'), where('status', '==', 'in_production')))
      .then(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.batchNumber.localeCompare(b.batchNumber))
        setActiveBatches(list)
        if (list.length === 1) setTagBatchId(list[0].id)
      })
  }, [success])

  function handleIngredientChange(e) {
    const id = e.target.value
    const ing = ingredients.find(i => i.id === id)
    setSelectedIng(ing || null)
    setForm(prev => ({ ...prev, ingredientId: id, unit: ing?.unit || '' }))
  }

  const set = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fileRef = ref(storage, `receiving/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      setPhoto({ url, path: fileRef.fullPath })
    } catch { alert('Photo upload failed.') }
    setUploading(false)
    e.target.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.ingredientId) { alert('Please select an ingredient.'); return }
    if (!form.quantity || Number(form.quantity) <= 0) { alert('Enter a valid quantity.'); return }
    if (form.storageLocation === 'QX Warehouse' && !form.palletNumber.trim()) { alert('Pallet number is required for QX Warehouse.'); return }
    setSaving(true)
    try {
      const lotNumber = await getNextLotNumber()
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const receivedDate = new Date(form.dateReceived + 'T00:00:00')
      const qty = Number(form.quantity)

      const lotRef = await addDoc(collection(db, 'ingredientLots'), {
        ingredientId: form.ingredientId,
        ingredientName: selectedIng.name,
        internalLotNumber: lotNumber,
        supplierLotNumber: form.supplierLotNumber || '',
        supplier: selectedIng.supplier || '',
        receivedDate: Timestamp.fromDate(receivedDate),
        originalQuantity: qty,
        currentQuantity: qty,
        unit: form.unit,
        storageLocation: form.storageLocation,
        palletNumber: form.storageLocation === 'QX Warehouse' ? form.palletNumber.trim() : '',
        status: 'available',
        receivedBy: userInfo,
        notes: form.notes || '',
        photoUrl: photo?.url || null,
        photoPath: photo?.path || null,
        createdAt: serverTimestamp(),
        auditLog: [{ action: 'received', changedBy: userInfo, changedAt: Timestamp.now() }],
      })

      setTagBatchId('')
      setTagQty(String(qty))
      setTagged(false)
      setSuccess({
        lotNumber, lotId: lotRef.id,
        ingredientId: form.ingredientId, ingredientName: selectedIng.name,
        qty, unit: form.unit,
      })
      setForm(prev => ({ ...prev, supplierLotNumber: '', quantity: '', palletNumber: '', notes: '' }))
      setPhoto(null)
    } catch (err) {
      alert(`Failed: ${err.message}`)
    }
    setSaving(false)
  }

  async function handleTagBatch() {
    const qty = Number(tagQty)
    if (!tagBatchId || !qty || qty <= 0) { alert('Select a batch and enter a quantity.'); return }
    setTagging(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const batch = activeBatches.find(b => b.id === tagBatchId)
      const lotDocRef = doc(db, 'ingredientLots', success.lotId)
      const usageDocRef = doc(collection(db, 'ingredientUsage'))
      await runTransaction(db, async (tx) => {
        const lotSnap = await tx.get(lotDocRef)
        if (!lotSnap.exists()) throw new Error('Lot not found')
        const lot = lotSnap.data()
        if (qty > lot.currentQuantity) throw new Error(`Only ${lot.currentQuantity} ${lot.unit} available.`)
        const newQty = lot.currentQuantity - qty
        tx.update(lotDocRef, {
          currentQuantity: newQty,
          ...(newQty === 0 ? { status: 'used' } : {}),
          auditLog: arrayUnion({ action: `used ${qty} ${lot.unit} in batch ${batch.batchNumber}`, changedBy: userInfo, changedAt: Timestamp.now() }),
        })
        tx.set(usageDocRef, {
          batchId: tagBatchId, batchNumber: batch.batchNumber, productName: batch.productName,
          ingredientId: success.ingredientId, ingredientName: success.ingredientName,
          lotId: success.lotId, internalLotNumber: success.lotNumber, supplierLotNumber: '',
          quantityUsed: qty, unit: lot.unit,
          addedBy: userInfo, usedAt: Timestamp.now(), createdAt: serverTimestamp(),
          auditLog: [{ action: 'tagged at receive', changedBy: userInfo, changedAt: Timestamp.now() }],
        })
      })
      setTagged(true)
    } catch (err) {
      alert(`Failed: ${err.message}`)
    }
    setTagging(false)
  }

  if (success) {
    const selectedBatch = activeBatches.find(b => b.id === tagBatchId)
    return (
      <div>
        <div style={{ ...card, textAlign: 'center', padding: '2rem 1rem', background: '#f0fdf4', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#15803d', marginBottom: '0.25rem' }}>{t('Received!')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>{success.lotNumber}</div>
          <div style={{ color: '#374151', marginBottom: '0.25rem' }}>
            {success.qty.toLocaleString()} {success.unit} · {success.ingredientName}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }}>
            {t('Lot is now in inventory')}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={btn.secondary} onClick={() => setSuccess(null)}>
              {t('Receive Another')}
            </button>
            <button style={btn.primary} onClick={() => { onClose?.(); navigate('/operations/lots') }}>
              {t('View All Lots')}
            </button>
          </div>
        </div>

        {/* Tag to batch */}
        {!tagged && activeBatches.length > 0 && (
          <div style={{ ...card, marginTop: '1rem', background: '#f8fafc', borderLeft: '4px solid #1d4ed8' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '0.25rem' }}>
              {t('Going straight into production?')}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.875rem' }}>{t('Tag this lot to a batch (optional)')}</p>

            <label style={label}>{t('Batch')}</label>
            <select style={input} value={tagBatchId} onChange={e => setTagBatchId(e.target.value)}>
              <option value="">{t('— Select batch —')}</option>
              {activeBatches.map(b => (
                <option key={b.id} value={b.id}>{b.batchNumber} — {b.productName}</option>
              ))}
            </select>

            <label style={label}>{t('Quantity Used')} ({success.unit})</label>
            <input
              style={{ ...input, fontSize: '1.1rem' }}
              type="number" min="0.01" step="any"
              value={tagQty}
              onChange={e => setTagQty(e.target.value)}
              max={success.qty}
            />

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button style={btn.primary} onClick={handleTagBatch} disabled={tagging || !tagBatchId}>
                {tagging ? t('Tagging…') : t('Tag It')}
              </button>
              <button style={btn.secondary} onClick={() => setSuccess(null)}>{t('Skip →')}</button>
            </div>
          </div>
        )}

        {tagged && (
          <div style={{ ...card, marginTop: '1rem', background: '#f0fdf4', borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: 600 }}>
              ✓ {t('Tagged to')} {selectedBatch?.batchNumber} — {selectedBatch?.productName}
            </div>
            <button
              style={{ ...btn.secondary, marginTop: '0.75rem', fontSize: '0.8rem' }}
              onClick={() => navigate(`/operations/batches/${tagBatchId}`)}
            >
              {t('View Batch →')}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {!onClose && <button style={backBtn} onClick={() => navigate('/operations/lots')}>{t('← Ingredient Lots')}</button>}
      {!onClose && <h1 style={pageTitle}>{t('Receive Inventory')}</h1>}
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
        {t('Fill in what you know. Photo and notes are optional.')}
      </p>

      <form onSubmit={handleSubmit} style={card}>
        <label style={label}>{t('Ingredient *')}</label>
        <select style={input} value={form.ingredientId} onChange={handleIngredientChange}>
          <option value="">{t('— Select ingredient —')}</option>
          {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>

        {selectedIng?.allergenFlag && (
          <div style={{ background: '#fef3c7', borderRadius: 8, padding: '0.5rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.85rem', color: '#92400e' }}>
            ⚠ Allergen: {selectedIng.allergens?.join(', ')}
          </div>
        )}

        <label style={label}>{t('Supplier Lot Number')}</label>
        <input style={input} value={form.supplierLotNumber} onChange={set('supplierLotNumber')} placeholder={t('As printed on the label')} />

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={label}>{t('Quantity *')}</label>
            <input style={{ ...input, fontSize: '1.25rem', fontWeight: 600 }} type="number" min="0.01" step="any" value={form.quantity} onChange={set('quantity')} placeholder="0" />
          </div>
          <div>
            <label style={label}>{t('Unit')}</label>
            <input style={input} value={form.unit} onChange={set('unit')} placeholder={selectedIng?.unit || 'unit'} />
          </div>
        </div>

        <label style={label}>{t('Date Received')}</label>
        <input style={input} type="date" value={form.dateReceived} onChange={set('dateReceived')} />

        <label style={label}>{t('Storage Location')}</label>
        <select style={input} value={form.storageLocation} onChange={set('storageLocation')}>
          {STORAGE_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        {form.storageLocation === 'QX Warehouse' && (
          <>
            <label style={label}>{t('Pallet Number *')}</label>
            <input
              style={{ ...input, fontSize: '1.1rem', fontWeight: 600 }}
              value={form.palletNumber}
              onChange={set('palletNumber')}
              placeholder="e.g. P-42"
              autoFocus
            />
          </>
        )}

        <label style={label}>📷 Photo of label / COA <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
        {photo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
            <img src={photo.url} alt="Label" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
            <div>
              <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 500 }}>{t('Photo added')}</div>
              <button type="button" style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }} onClick={() => setPhoto(null)}>{t('Remove')}</button>
            </div>
          </div>
        ) : (
          <label style={{ ...addPhotoBtn, opacity: uploading ? 0.6 : 1, marginBottom: '0.875rem' }}>
            {uploading ? t('Uploading…') : t('📷 Add Photo')}
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} disabled={uploading} />
          </label>
        )}

        <label style={label}>{t('Notes')} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({t('optional')})</span></label>
        <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={set('notes')} placeholder={t('Any additional notes…')} />

        <button type="submit" style={{ ...btn.success, width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '0.25rem' }} disabled={saving}>
          {saving ? t('Receiving…') : t('Receive Inventory')}
        </button>
      </form>
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const addPhotoBtn = {
  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.5rem 0.875rem', border: '1.5px dashed #93c5fd', borderRadius: 8,
  color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', background: '#eff6ff',
}
