import { useState, useEffect } from 'react'
import { addDoc, getDocs, collection, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { input, btn, label } from '../../styles/common'

const FORMAT_LABELS = {
  bulk_packaged: 'Bulk Packaged',
  flow_wrapped: 'Flow Wrapped',
  flow_wrap_boxed: 'Flow Wrap + Boxed',
  flow_wrap_boxed_display: 'Flow Wrap + Boxed + Display Box',
}

export default function CreatePickupOrderModal({ onClose, onCreated }) {
  const { currentUser } = useAuth()
  const [goods, setGoods] = useState([])      // combined packaged goods list
  const [customers, setCustomers] = useState([])
  const [selectedGoodKey, setSelectedGoodKey] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('lbs')
  const [clientName, setClientName] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingClient, setSavingClient] = useState(false)

  useEffect(() => {
    Promise.all([
      // Completed packaging orders (all formats)
      getDocs(query(collection(db, 'packagingOrders'), where('status', '==', 'complete'))),
      // Bulk packaged finished candy lots
      getDocs(query(collection(db, 'finishedCandyLots'), where('storageType', '==', 'bulk_packaged'), where('status', '==', 'available'))),
      // Customers
      getDocs(collection(db, 'customers')),
    ]).then(([pkgSnap, bulkSnap, custSnap]) => {
      const pkgGoods = pkgSnap.docs.map(d => ({
        key: `pkg_${d.id}`,
        sourceType: 'packaging',
        sourceId: d.id,
        productName: d.data().candyName || 'Packaging Order',
        batchNumber: d.data().batchNumber || '',
        packagingFormat: FORMAT_LABELS[d.data().packagingFormat] || d.data().packagingFormat || '',
        quantity: d.data().finalCount || d.data().quantity,
        unit: d.data().finalUnit || d.data().unit || 'lbs',
        ingredientLotId: d.data().packagedIngredientLotId || null,
        label: `${d.data().candyName || 'Packaged'} — ${FORMAT_LABELS[d.data().packagingFormat] || d.data().packagingFormat || ''}${d.data().batchNumber ? ` (${d.data().batchNumber})` : ''}`,
      }))
      const bulkGoods = bulkSnap.docs.map(d => ({
        key: `bulk_${d.id}`,
        sourceType: 'bulk',
        sourceId: d.id,
        productName: d.data().candyName || 'Bulk',
        batchNumber: d.data().batchNumber || '',
        packagingFormat: 'Bulk Packaged',
        quantity: d.data().quantity,
        unit: d.data().unit || 'lbs',
        ingredientLotId: d.data().ingredientLotId || null,
        label: `${d.data().candyName || 'Bulk'} — Bulk Packaged${d.data().batchNumber ? ` (${d.data().batchNumber})` : ''}`,
      }))
      setGoods([...pkgGoods, ...bulkGoods])
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.customerName || '').localeCompare(b.customerName || '')))
    })
  }, [])

  const selectedGood = goods.find(g => g.key === selectedGoodKey)

  function handleGoodChange(e) {
    const key = e.target.value
    setSelectedGoodKey(key)
    const good = goods.find(g => g.key === key)
    if (good) {
      setQuantity(String(good.quantity || ''))
      setUnit(good.unit)
    }
  }

  const isNewClient = clientName.trim() && !customers.some(c => c.customerName === clientName.trim())

  async function handleSaveAsClient() {
    if (!clientName.trim() || savingClient) return
    setSavingClient(true)
    try {
      const ref = await addDoc(collection(db, 'customers'), {
        customerName: clientName.trim(),
        status: 'active',
        createdAt: serverTimestamp(),
      })
      setCustomers(prev => [...prev, { id: ref.id, customerName: clientName.trim() }].sort((a, b) => a.customerName.localeCompare(b.customerName)))
    } catch (err) { alert(err.message) }
    setSavingClient(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedGood || !quantity || !clientName.trim() || saving) return
    setSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const ref = await addDoc(collection(db, 'pickupOrders'), {
        sourceType: selectedGood.sourceType,
        sourceId: selectedGood.sourceId,
        productName: selectedGood.productName,
        batchNumber: selectedGood.batchNumber,
        packagingFormat: selectedGood.packagingFormat,
        quantityAssigned: Number(quantity),
        unit,
        clientName: clientName.trim(),
        ingredientLotId: selectedGood.ingredientLotId || null,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: userInfo,
      })
      onCreated({
        id: ref.id,
        productName: selectedGood.productName,
        batchNumber: selectedGood.batchNumber,
        packagingFormat: selectedGood.packagingFormat,
        quantityAssigned: Number(quantity),
        unit,
        clientName: clientName.trim(),
        status: 'pending',
      })
    } catch (err) {
      alert(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label style={label}>Packaged Good *</label>
      <select style={input} value={selectedGoodKey} onChange={handleGoodChange} required>
        <option value="">— Select packaged product —</option>
        {goods.length === 0 && <option disabled>No packaged goods available yet</option>}
        {goods.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
      </select>

      <label style={label}>Quantity to Assign *</label>
      {selectedGood && (
        <p style={hint}>Available: {selectedGood.quantity} {selectedGood.unit}</p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <input
          style={{ ...input, flex: 1, marginBottom: 0 }}
          type="number" min="0.01" step="0.01"
          value={quantity} onChange={e => setQuantity(e.target.value)}
          placeholder="0" required
        />
        <select style={{ ...input, width: 90, marginBottom: 0 }} value={unit} onChange={e => setUnit(e.target.value)}>
          {['pieces', 'lbs', 'kg', 'oz', 'g', 'cases'].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <label style={label}>Client *</label>
      <input
        list="pickup-customer-list"
        style={input}
        value={clientName}
        onChange={e => setClientName(e.target.value)}
        placeholder="Client name (required)"
        required
      />
      <datalist id="pickup-customer-list">
        {customers.map(c => <option key={c.id} value={c.customerName} />)}
      </datalist>
      {isNewClient && (
        <button type="button" style={saveClientBtn} onClick={handleSaveAsClient} disabled={savingClient}>
          {savingClient ? 'Saving…' : `+ Save "${clientName}" as new client`}
        </button>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <button type="button" style={{ ...btn.secondary, flex: 1 }} onClick={onClose}>Cancel</button>
        <button type="submit" style={{ ...btn.primary, flex: 1 }} disabled={saving || !selectedGoodKey || !quantity || !clientName.trim()}>
          {saving ? 'Creating…' : 'Create Pickup Order'}
        </button>
      </div>
    </form>
  )
}

const hint = { fontSize: '0.78rem', color: '#9ca3af', margin: '-0.5rem 0 0.75rem' }
const saveClientBtn = { background: 'transparent', border: '1px dashed #6b7280', borderRadius: 6, padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#374151', cursor: 'pointer', marginTop: '-0.5rem', marginBottom: '0.75rem', display: 'block', width: '100%' }
