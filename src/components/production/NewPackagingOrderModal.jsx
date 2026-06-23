import { useState, useEffect } from 'react'
import { addDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { input, btn, label } from '../../styles/common'

const STORAGE_LABELS = {
  curing_racks: 'Curing Racks',
  baking_trays: 'Baking Trays',
  bulk_packaged: 'Bulk Packaged',
}

export default function NewPackagingOrderModal({ onClose, onCreated }) {
  const { currentUser } = useAuth()
  const [candyLots, setCandyLots] = useState([])
  const [selectedLotId, setSelectedLotId] = useState('')
  const [clientName, setClientName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'finishedCandyLots'), where('status', '==', 'available')))
      .then(snap => setCandyLots(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!clientName.trim() || saving) return
    setSaving(true)
    try {
      const selectedLot = candyLots.find(l => l.id === selectedLotId)
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const ref = await addDoc(collection(db, 'packagingOrders'), {
        clientName: clientName.trim(),
        finishedCandyLotId: selectedLotId || null,
        candyName: selectedLot?.candyName || '',
        candyQuantity: selectedLot?.quantity || null,
        candyUnit: selectedLot?.unit || '',
        packagingInstructions: instructions.trim(),
        status: 'backlog',
        sortOrder: Date.now(),
        createdAt: serverTimestamp(),
        createdBy: userInfo,
      })
      onCreated({
        id: ref.id,
        clientName: clientName.trim(),
        candyName: selectedLot?.candyName || '',
        finishedCandyLotId: selectedLotId || null,
        packagingInstructions: instructions.trim(),
        status: 'backlog',
        sortOrder: Date.now(),
      })
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label style={label}>Client Name *</label>
      <input
        style={input} value={clientName}
        onChange={e => setClientName(e.target.value)}
        placeholder="Client or customer name" autoFocus required
      />

      <label style={label}>Candy to Package</label>
      <select style={input} value={selectedLotId} onChange={e => setSelectedLotId(e.target.value)}>
        <option value="">— Select finished candy lot —</option>
        {candyLots.map(l => (
          <option key={l.id} value={l.id}>
            {l.candyName} · {l.quantity} {l.unit} · {STORAGE_LABELS[l.storageType] || l.storageType}
          </option>
        ))}
      </select>
      {candyLots.length === 0 && (
        <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '-0.5rem', marginBottom: '0.875rem' }}>
          No finished candy in inventory yet — complete a production run first.
        </p>
      )}

      <label style={label}>Packaging Instructions</label>
      <textarea
        style={{ ...input, minHeight: 80, resize: 'vertical' }}
        value={instructions} onChange={e => setInstructions(e.target.value)}
        placeholder="e.g. 2 pieces per bag, twist tie, label with batch number…"
      />

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
        <button type="button" style={{ ...btn.secondary, flex: 1 }} onClick={onClose}>Cancel</button>
        <button type="submit" style={{ ...btn.primary, flex: 1 }} disabled={saving || !clientName.trim()}>
          {saving ? 'Creating…' : 'Create Order'}
        </button>
      </div>
    </form>
  )
}
