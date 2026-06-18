import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, getDocs, query, where,
  doc, updateDoc, deleteDoc, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { card, btn } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function InventoryTable() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentUser, isAdmin } = useAuth()
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState({})   // { [lotId]: newQtyString }
  const [saving, setSaving] = useState({}) // { [lotId]: true }
  const [saved, setSaved] = useState({})   // { [lotId]: true } flash
  const [search, setSearch] = useState('')

  async function load() {
    const snap = await getDocs(query(
      collection(db, 'ingredientLots'),
      where('status', '==', 'available')
    ))
    const data = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(l => l.currentQuantity > 0)
      .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
    setLots(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = lots.filter(l => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return l.ingredientName?.toLowerCase().includes(s) ||
      l.internalLotNumber?.toLowerCase().includes(s)
  })

  function startEdit(id, current) {
    setEdits(e => ({ ...e, [id]: String(current ?? '') }))
  }

  function cancelEdit(id) {
    setEdits(e => { const n = { ...e }; delete n[id]; return n })
  }

  async function saveQty(lot) {
    const raw = edits[lot.id]
    const val = parseFloat(raw)
    if (isNaN(val) || val < 0) return
    setSaving(s => ({ ...s, [lot.id]: true }))
    const userInfo = {
      uid: currentUser.uid,
      displayName: currentUser.displayName || currentUser.email,
      email: currentUser.email,
    }
    await updateDoc(doc(db, 'ingredientLots', lot.id), {
      currentQuantity: val,
      updatedAt: serverTimestamp(),
      auditLog: [{
        action: `quantity manually updated: ${lot.currentQuantity} → ${val} ${lot.unit}`,
        changedBy: userInfo,
        changedAt: Timestamp.now(),
      }]
    })
    setSaving(s => { const n = { ...s }; delete n[lot.id]; return n })
    setEdits(e => { const n = { ...e }; delete n[lot.id]; return n })
    setSaved(s => ({ ...s, [lot.id]: true }))
    setTimeout(() => setSaved(s => { const n = { ...s }; delete n[lot.id]; return n }), 1800)
    // Update local state immediately
    setLots(prev => prev.map(l => l.id === lot.id ? { ...l, currentQuantity: val } : l))
  }

  function handleKey(e, lot) {
    if (e.key === 'Enter') saveQty(lot)
    if (e.key === 'Escape') cancelEdit(lot.id)
  }

  async function deleteLot(lot) {
    if (!window.confirm(`Delete lot ${lot.internalLotNumber} (${lot.ingredientName})? This cannot be undone.`)) return
    await deleteDoc(doc(db, 'ingredientLots', lot.id))
    setLots(prev => prev.filter(l => l.id !== lot.id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={pageTitle}>{t('Inventory')}</h1>
        <button style={btn.primary} onClick={() => navigate('/operations/receive')}>{t('Receive Stock')}</button>
      </div>

      <input
        style={searchInput}
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('Search ingredient or lot number…')}
        autoComplete="off"
      />

      {loading && <p style={muted}>{t('Loading…')}</p>}
      {!loading && filtered.length === 0 && <p style={muted}>{t('No inventory on hand.')}</p>}

      {!loading && filtered.length > 0 && (
        <div style={card}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>{t('Ingredient')}</th>
                <th style={th}>{t('Lot #')}</th>
                <th style={th}>{t('Location')}</th>
                <th style={{ ...th, textAlign: 'right' }}>{t('Qty')}</th>
                <th style={{ ...th, width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lot, i) => {
                const editing = lot.id in edits
                const isSaving = saving[lot.id]
                const wasSaved = saved[lot.id]
                return (
                  <tr key={lot.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={td}>
                      <span
                        style={{ color: '#1d4ed8', cursor: 'pointer', fontWeight: 500 }}
                        onClick={() => navigate(`/operations/ingredients/${lot.ingredientId}`)}
                      >
                        {lot.ingredientName}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#6b7280', fontSize: '0.8rem' }}>
                      <span
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/operations/lots/${lot.id}`)}
                      >
                        {lot.internalLotNumber}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#6b7280', fontSize: '0.85rem' }}>{lot.storageLocation || '—'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {editing ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={edits[lot.id]}
                            onChange={e => setEdits(prev => ({ ...prev, [lot.id]: e.target.value }))}
                            onKeyDown={e => handleKey(e, lot)}
                            style={qtyInput}
                            autoFocus
                          />
                          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{lot.unit}</span>
                        </div>
                      ) : (
                        <span
                          style={{ fontWeight: 600, color: '#111827', cursor: 'pointer' }}
                          onClick={() => startEdit(lot.id, lot.currentQuantity)}
                          title="Click to edit"
                        >
                          {lot.currentQuantity?.toLocaleString()} {lot.unit}
                        </span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {wasSaved && !editing && (
                        <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}>{t('✓ Saved')}</span>
                      )}
                      {editing && (
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button style={saveBtn} onClick={() => saveQty(lot)} disabled={isSaving}>
                            {isSaving ? '…' : t('Save')}
                          </button>
                          <button style={cancelBtn} onClick={() => cancelEdit(lot.id)}>✕</button>
                        </div>
                      )}
                      {!editing && !wasSaved && (
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button style={editBtn} onClick={() => startEdit(lot.id, lot.currentQuantity)}>
                            {t('Edit')}
                          </button>
                          {isAdmin && (
                            <button style={deleteBtn} onClick={() => deleteLot(lot)} title="Delete lot">
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem', marginBottom: 0 }}>
            {t('Click a quantity or Edit to update. Press Enter to save, Escape to cancel.')}
          </p>
        </div>
      )}
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const searchInput = {
  display: 'block', width: '100%', padding: '0.65rem 0.875rem',
  border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem',
  background: '#fff', marginBottom: '0.75rem', boxSizing: 'border-box',
}
const table = { width: '100%', borderCollapse: 'collapse' }
const th = {
  fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: '#6b7280', padding: '0.5rem 0.75rem',
  borderBottom: '2px solid #e5e7eb', textAlign: 'left',
}
const td = { padding: '0.6rem 0.75rem', fontSize: '0.9rem', borderBottom: '1px solid #f3f4f6' }
const qtyInput = {
  width: 80, border: '1px solid #1d4ed8', borderRadius: 6,
  padding: '0.3rem 0.5rem', fontSize: '0.9rem', textAlign: 'right',
  outline: 'none',
}
const saveBtn = {
  background: '#1d4ed8', color: '#fff', border: 'none',
  borderRadius: 5, padding: '0.25rem 0.6rem', fontSize: '0.78rem', cursor: 'pointer',
}
const cancelBtn = {
  background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb',
  borderRadius: 5, padding: '0.25rem 0.5rem', fontSize: '0.78rem', cursor: 'pointer',
}
const editBtn = {
  background: 'transparent', color: '#1d4ed8', border: '1px solid #bfdbfe',
  borderRadius: 5, padding: '0.2rem 0.6rem', fontSize: '0.78rem', cursor: 'pointer',
}
const deleteBtn = {
  background: 'transparent', color: '#dc2626', border: '1px solid #fecaca',
  borderRadius: 5, padding: '0.2rem 0.4rem', fontSize: '0.78rem', cursor: 'pointer',
}
