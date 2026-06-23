import { useState, useEffect } from 'react'
import { addDoc, getDocs, collection, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { input, btn, label } from '../../styles/common'

const STORAGE_LABELS = {
  curing_racks: 'Curing Racks',
  baking_trays: 'Baking Trays',
  bulk_packaged: 'Bulk Packaged',
}

const PACKAGING_FORMATS = [
  { value: 'bulk_packaged',           label: 'Bulk Packaged' },
  { value: 'flow_wrapped',            label: 'Flow Wrapped' },
  { value: 'flow_wrap_boxed',         label: 'Flow Wrap + Boxed' },
  { value: 'flow_wrap_boxed_display', label: 'Flow Wrap + Boxed + Display Box' },
]

export default function NewPackagingOrderModal({ onClose, onCreated }) {
  const { currentUser } = useAuth()
  const [candyLots, setCandyLots] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedLotId, setSelectedLotId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('lbs')
  const [packagingFormat, setPackagingFormat] = useState('flow_wrapped')
  const [clientName, setClientName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingClient, setSavingClient] = useState(false)

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, 'finishedCandyLots'), where('status', '==', 'available'))),
      getDocs(query(collection(db, 'customers'), orderBy('customerName', 'asc'))),
    ]).then(([lotsSnap, custSnap]) => {
      setCandyLots(lotsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    }).catch(() => {
      // customers may not have orderBy index yet — fallback
      getDocs(query(collection(db, 'finishedCandyLots'), where('status', '==', 'available')))
        .then(snap => setCandyLots(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      getDocs(collection(db, 'customers'))
        .then(snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.customerName || '').localeCompare(b.customerName || ''))))
    })
  }, [])

  const selectedLot = candyLots.find(l => l.id === selectedLotId)

  function handleLotChange(e) {
    const lotId = e.target.value
    setSelectedLotId(lotId)
    const lot = candyLots.find(l => l.id === lotId)
    if (lot) {
      setQuantity(String(lot.quantity))
      setUnit(lot.unit || 'lbs')
    } else {
      setQuantity('')
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
      setCustomers(prev => [...prev, { id: ref.id, customerName: clientName.trim(), status: 'active' }].sort((a, b) => a.customerName.localeCompare(b.customerName)))
    } catch (err) { alert(err.message) }
    setSavingClient(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!quantity || Number(quantity) <= 0 || saving) return
    setSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const ref = await addDoc(collection(db, 'packagingOrders'), {
        finishedCandyLotId: selectedLotId || null,
        candyName: selectedLot?.candyName || '',
        batchNumber: selectedLot?.batchNumber || '',
        quantity: Number(quantity),
        unit,
        packagingFormat,
        clientName: clientName.trim(),
        packagingInstructions: instructions.trim(),
        status: 'backlog',
        sortOrder: Date.now(),
        createdAt: serverTimestamp(),
        createdBy: userInfo,
      })
      onCreated({
        id: ref.id,
        candyName: selectedLot?.candyName || '',
        batchNumber: selectedLot?.batchNumber || '',
        quantity: Number(quantity),
        unit,
        packagingFormat,
        clientName: clientName.trim(),
        packagingInstructions: instructions.trim(),
        status: 'backlog',
        sortOrder: Date.now(),
      })
    } catch (err) {
      alert(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 1. Select candy lot */}
      <label style={label}>Finished Candy *</label>
      <select style={input} value={selectedLotId} onChange={handleLotChange} required>
        <option value="">— Select a candy lot —</option>
        {candyLots.map(l => (
          <option key={l.id} value={l.id}>
            {l.candyName} · {l.batchNumber} · {l.quantity} {l.unit} ({STORAGE_LABELS[l.storageType] || l.storageType})
          </option>
        ))}
      </select>
      {candyLots.length === 0 && (
        <p style={hint}>No finished candy in inventory yet — complete a production run first.</p>
      )}

      {/* 2. Quantity to package */}
      <label style={label}>Quantity to Package *</label>
      {selectedLot && (
        <p style={hint}>Available: {selectedLot.quantity} {selectedLot.unit}</p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <input
          style={{ ...input, flex: 1, marginBottom: 0 }}
          type="number" min="0.01" step="0.01"
          value={quantity} onChange={e => setQuantity(e.target.value)}
          placeholder="0" required
        />
        <select style={{ ...input, width: 90, marginBottom: 0 }} value={unit} onChange={e => setUnit(e.target.value)}>
          {['lbs', 'kg', 'oz', 'g', 'pcs', 'cases'].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* 3. Packaging format */}
      <label style={label}>Packaging Format *</label>
      <div style={formatGrid}>
        {PACKAGING_FORMATS.map(f => (
          <button
            key={f.value} type="button"
            style={packagingFormat === f.value ? fmtActive : fmtBtn}
            onClick={() => setPackagingFormat(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 4. Client (optional) */}
      <label style={{ ...label, marginTop: '0.875rem' }}>Client (optional)</label>
      <input
        list="customer-list"
        style={input}
        value={clientName}
        onChange={e => setClientName(e.target.value)}
        placeholder="Start typing a client name, or leave blank"
      />
      <datalist id="customer-list">
        {customers.map(c => <option key={c.id} value={c.customerName} />)}
      </datalist>
      {isNewClient && (
        <button type="button" style={saveClientBtn} onClick={handleSaveAsClient} disabled={savingClient}>
          {savingClient ? 'Saving…' : `+ Save "${clientName}" as new client`}
        </button>
      )}

      {/* 5. Instructions */}
      <label style={{ ...label, marginTop: '0.875rem' }}>Packaging Instructions (optional)</label>
      <textarea
        style={{ ...input, minHeight: 72, resize: 'vertical' }}
        value={instructions} onChange={e => setInstructions(e.target.value)}
        placeholder="e.g. 2 pieces per bag, twist tie, label with batch number…"
      />

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
        <button type="button" style={{ ...btn.secondary, flex: 1 }} onClick={onClose}>Cancel</button>
        <button type="submit" style={{ ...btn.primary, flex: 1 }} disabled={saving || !selectedLotId || !quantity}>
          {saving ? 'Creating…' : 'Create Order'}
        </button>
      </div>
    </form>
  )
}

const hint = { fontSize: '0.78rem', color: '#9ca3af', margin: '-0.5rem 0 0.75rem' }
const formatGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }
const fmtBase = { padding: '0.5rem 0.5rem', border: '1.5px solid #d1d5db', borderRadius: 8, background: '#fff', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', textAlign: 'center', lineHeight: 1.3 }
const fmtBtn = { ...fmtBase, color: '#6b7280' }
const fmtActive = { ...fmtBase, borderColor: '#1d4ed8', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }
const saveClientBtn = { background: 'transparent', border: '1px dashed #6b7280', borderRadius: 6, padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#374151', cursor: 'pointer', marginTop: '-0.5rem', marginBottom: '0.75rem', display: 'block', width: '100%' }
