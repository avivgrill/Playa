import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, orderBy, query, doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateTime } from '../../utils/format'
import { card, badge, input, label, btn } from '../../styles/common'

const ADMIN_EMAIL = 'avivgrill@gmail.com'

export default function Records() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.email === ADMIN_EMAIL

  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Easter egg
  const [beeTaps, setBeeTaps] = useState(0)
  const [editMode, setEditMode] = useState(false)

  // Edit modal
  const [editRecord, setEditRecord] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [inspSnap, cleanSnap, caSnap] = await Promise.all([
        getDocs(query(collection(db, 'inspections'), orderBy('completedAt', 'desc'))),
        getDocs(query(collection(db, 'cleaningLogs'), orderBy('completedAt', 'desc'))),
        getDocs(query(collection(db, 'correctiveActions'), orderBy('createdAt', 'desc'))),
      ])
      const records = [
        ...inspSnap.docs.map(d => ({ id: d.id, _type: 'inspection',        _date: d.data().completedAt, ...d.data() })),
        ...cleanSnap.docs.map(d => ({ id: d.id, _type: 'cleaningLog',      _date: d.data().completedAt, ...d.data() })),
        ...caSnap.docs.map(d  => ({ id: d.id, _type: 'correctiveAction',  _date: d.data().createdAt,   ...d.data() })),
      ].sort((a, b) => {
        const at = a._date?.toDate?.() || new Date(0)
        const bt = b._date?.toDate?.() || new Date(0)
        return bt - at
      })
      setAll(records)
      setLoading(false)
    }
    load()
  }, [])

  // ── Bee easter egg ──────────────────────────────────────────────────────────
  function handleBeeTap() {
    if (editMode) { setEditMode(false); setBeeTaps(0); return }
    const next = beeTaps + 1
    setBeeTaps(next)
    if (next >= 3) { setEditMode(true); setBeeTaps(0) }
  }

  // ── Edit modal ──────────────────────────────────────────────────────────────
  function openEdit(e, record) {
    e.stopPropagation()
    setEditRecord(record)
    if (record._type === 'cleaningLog') {
      setEditForm({ area: record.area || '', equipment: record.equipment || '', chemical: record.chemical || '', concentration: record.concentration || '', notes: record.notes || '' })
    } else if (record._type === 'inspection') {
      setEditForm({ items: record.items ? record.items.map(i => ({ ...i })) : [] })
    } else {
      setEditForm({ description: record.description || '', correctiveActionTaken: record.correctiveActionTaken || '', verificationNotes: record.verificationNotes || '' })
    }
  }

  async function handleSave() {
    if (!editRecord || saving) return
    setSaving(true)
    const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
    const colName = editRecord._type === 'inspection' ? 'inspections' : editRecord._type === 'cleaningLog' ? 'cleaningLogs' : 'correctiveActions'
    try {
      await updateDoc(doc(db, colName, editRecord.id), {
        ...editForm,
        auditLog: arrayUnion({ action: 'updated', changedBy: userInfo, changedAt: Timestamp.now(), changes: {} }),
      })
      setAll(prev => prev.map(r =>
        r.id === editRecord.id && r._type === editRecord._type ? { ...r, ...editForm } : r
      ))
      setEditRecord(null)
    } catch (err) {
      alert(`Save failed: ${err.message}`)
    }
    setSaving(false)
  }

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = all.filter(r => {
    if (typeFilter !== 'all' && r._type !== typeFilter) return false
    if (dateFrom) { const d = r._date?.toDate?.(); if (!d || d < new Date(dateFrom)) return false }
    if (dateTo)   { const d = r._date?.toDate?.(); if (!d || d > new Date(dateTo + 'T23:59:59')) return false }
    if (search.trim()) {
      const q = search.toLowerCase()
      const hay = [r.area, r.equipment, r.chemical, r.sourceItemLabel, r.description, r.caNumber, r.createdBy?.displayName, r.createdBy?.email, r.type]
        .filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  function exportCSV() {
    const rows = [['Type', 'Summary', 'User', 'Date', 'Status']]
    filtered.forEach(r => rows.push([typeLabel(r), summary(r), r.createdBy?.email || '', r._date?.toDate?.()?.toLocaleDateString() || '', statusOf(r)]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `playa-records-${new Date().toISOString().slice(0,10)}.csv` })
    a.click()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Records</h1>
        <button style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer' }} onClick={exportCSV}>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: '0.875rem' }}>
        <input style={{ display: 'block', width: '100%', padding: '0.65rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem', marginBottom: '0.75rem' }}
          type="text" placeholder="Search records…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select style={sel} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="inspection">Inspections</option>
            <option value="cleaningLog">Cleaning Logs</option>
            <option value="correctiveAction">Corrective Actions</option>
          </select>
          <input style={sel} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
          <input style={sel} type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   title="To date" />
          {(search || typeFilter !== 'all' || dateFrom || dateTo) && (
            <button style={{ background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', color: '#6b7280' }}
              onClick={() => { setSearch(''); setTypeFilter('all'); setDateFrom(''); setDateTo('') }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.75rem' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>

      {/* Record list */}
      {loading ? <p style={{ color: '#9ca3af' }}>Loading…</p> : filtered.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '2rem' }}>No records match your filters.</p>
      ) : filtered.map(r => (
        <div key={`${r._type}-${r.id}`} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(pathFor(r))}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                <span style={typePill(r._type)}>{typeLabel(r)}</span>
                {r.caNumber && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{r.caNumber}</span>}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary(r)}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                {r.createdBy?.displayName || r.createdBy?.email} · {formatDateTime(r._date)}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={badge[statusOf(r)] || badge.open}>{statusOf(r)}</span>
              {editMode && (
                <button
                  style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', color: '#92400e', fontWeight: 600 }}
                  onClick={e => openEdit(e, r)}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Bee easter egg — admin only */}
      {isAdmin && (
        <div style={{ textAlign: 'center', marginTop: '2.5rem', marginBottom: '1rem' }}>
          <span
            onClick={handleBeeTap}
            title=""
            style={{ fontSize: editMode ? '1.4rem' : '0.9rem', opacity: editMode ? 1 : 0.18, cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s' }}
          >
            🐝
          </span>
        </div>
      )}

      {/* Edit modal */}
      {editRecord && (
        <div style={modalOverlay} onClick={() => setEditRecord(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Edit Record</h2>
              <button style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' }} onClick={() => setEditRecord(null)}>✕</button>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {editRecord._type === 'cleaningLog' && (
                <>
                  <F label="Area"          value={editForm.area}          onChange={v => setEditForm(f => ({ ...f, area: v }))} />
                  <F label="Equipment"     value={editForm.equipment}     onChange={v => setEditForm(f => ({ ...f, equipment: v }))} />
                  <F label="Chemical"      value={editForm.chemical}      onChange={v => setEditForm(f => ({ ...f, chemical: v }))} />
                  <F label="Concentration" value={editForm.concentration} onChange={v => setEditForm(f => ({ ...f, concentration: v }))} />
                  <F label="Notes"         value={editForm.notes}         onChange={v => setEditForm(f => ({ ...f, notes: v }))} textarea />
                </>
              )}

              {editRecord._type === 'inspection' && (
                <>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem' }}>Pass/Fail results are locked. You can edit item notes only.</p>
                  {editForm.items?.map((item, idx) => (
                    <div key={item.id} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.result === 'pass' ? '#16a34a' : item.result === 'fail' ? '#dc2626' : '#9ca3af' }}>
                          {item.result === 'na' ? 'N/A' : item.result?.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: '#374151' }}>{item.label}</span>
                      </div>
                      <textarea
                        style={{ ...input, marginBottom: 0, minHeight: 56, resize: 'vertical', fontSize: '0.875rem' }}
                        placeholder="Notes…"
                        value={item.notes || ''}
                        onChange={e => {
                          const updated = editForm.items.map((it, i) => i === idx ? { ...it, notes: e.target.value } : it)
                          setEditForm(f => ({ ...f, items: updated }))
                        }}
                      />
                    </div>
                  ))}
                </>
              )}

              {editRecord._type === 'correctiveAction' && (
                <>
                  <F label="Description"           value={editForm.description}           onChange={v => setEditForm(f => ({ ...f, description: v }))}           textarea />
                  <F label="Corrective Action Taken" value={editForm.correctiveActionTaken} onChange={v => setEditForm(f => ({ ...f, correctiveActionTaken: v }))} textarea />
                  <F label="Verification Notes"    value={editForm.verificationNotes}    onChange={v => setEditForm(f => ({ ...f, verificationNotes: v }))}    textarea />
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button style={{ ...btn.secondary, flex: 1 }} onClick={() => setEditRecord(null)}>Cancel</button>
              <button style={{ ...btn.primary, flex: 1 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small form field helper ───────────────────────────────────────────────────
function F({ label: lbl, value, onChange, textarea }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>{lbl}</label>
      {textarea
        ? <textarea style={{ ...input, marginBottom: 0, minHeight: 72, resize: 'vertical', fontSize: '0.875rem' }} value={value} onChange={e => onChange(e.target.value)} />
        : <input    style={{ ...input, marginBottom: 0, fontSize: '0.875rem' }}                                    value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  )
}

// ── Record helpers ────────────────────────────────────────────────────────────
function typeLabel(r) {
  if (r._type === 'inspection') {
    const m = { daily_facility: 'Daily Inspection', pre_operational: 'Pre-Op Inspection', weekly_facility: 'Weekly Inspection', monthly_facility: 'Monthly Verification' }
    return m[r.type] || 'Inspection'
  }
  if (r._type === 'cleaningLog') return 'Cleaning Log'
  return 'Corrective Action'
}

function summary(r) {
  if (r._type === 'inspection') return typeLabel(r)
  if (r._type === 'cleaningLog') return `${r.area} — ${r.equipment}`
  return r.sourceItemLabel || r.description || 'Corrective Action'
}

function statusOf(r) {
  if (r._type === 'inspection')       return r.overallResult || 'completed'
  if (r._type === 'cleaningLog')      return r.verificationStatus || 'pending'
  return r.status || 'open'
}

function pathFor(r) {
  if (r._type === 'inspection')       return `/inspections/${r.id}`
  if (r._type === 'cleaningLog')      return `/cleaning/${r.id}`
  return `/corrective-actions/${r.id}`
}

function typePill(type) {
  const map = { inspection: ['#dbeafe','#1d4ed8'], cleaningLog: ['#d1fae5','#065f46'], correctiveAction: ['#fef9c3','#92400e'] }
  const [bg, color] = map[type] || ['#f3f4f6','#374151']
  return { background: bg, color, fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 99 }
}

const sel = { padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', background: '#fff', color: '#374151' }

const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '1rem',
}

const modalBox = {
  background: '#fff', borderRadius: 12,
  padding: '1.25rem', width: '100%', maxWidth: 480,
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
}
