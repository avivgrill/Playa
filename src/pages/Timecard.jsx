import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  collection, query, where, getDocs, addDoc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { recentWeeks, weekLabel, weekStartStr, punchHours, formatHours } from '../utils/timecard'
import { card, btn } from '../styles/common'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Columns: 0,2,4 = IN  |  1,3,5 = OUT
const COL_TYPE = ['IN', 'OUT', 'IN', 'OUT', 'IN', 'OUT']
const IN_COLOR  = '#16a34a'
const OUT_COLOR = '#b91c1c'
// Alternating pair backgrounds (pair 0 = cols 0-1, pair 1 = cols 2-3, pair 2 = cols 4-5)
const PAIR_BG      = ['#f0f7ff', '#ffffff', '#f0f7ff']
const PAIR_HEAD_BG = ['#dbeafe', '#f3f4f6', '#dbeafe']

function dayDate(weekStart, idx) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + idx)
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
}

// Pair consecutive filled slots: (fill[0]→fill[1]) + (fill[2]→fill[3]) ...
function calcSlotHours(slots) {
  const filled = slots.filter(Boolean)
  let total = 0
  for (let i = 0; i + 1 < filled.length; i += 2) {
    total += punchHours(filled[i], filled[i + 1])
  }
  return total
}

function grandTotal(allPunches) {
  return allPunches.reduce((sum, row) => sum + calcSlotHours(row), 0)
}

function initPunches() {
  return DAYS.map(() => Array(6).fill(''))
}

export default function Timecard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const weeks = recentWeeks(8)
  const [weekIdx, setWeekIdx] = useState(0)
  const selectedWeek = weeks[weekIdx]

  const [existing, setExisting] = useState(null)
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [punches, setPunches] = useState(initPunches)
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setExisting(null)
    setCheckingExisting(true)
    setPunches(initPunches())
    setNotes('')
    setPhoto(null)
    setSubmitted(false)
    getDocs(query(
      collection(db, 'timecards'),
      where('userId', '==', currentUser.uid),
      where('weekStartStr', '==', weekStartStr(selectedWeek))
    )).then(snap => {
      setExisting(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() })
      setCheckingExisting(false)
    })
  }, [weekIdx])

  function setSlot(dayIdx, slotIdx, value) {
    setPunches(p => p.map((row, di) =>
      di === dayIdx ? row.map((v, si) => si === slotIdx ? value : v) : row
    ))
  }

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fileRef = ref(storage, `timecards/${currentUser.uid}/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      setPhoto({ url, path: fileRef.fullPath })
    } catch { alert('Photo upload failed.') }
    setUploading(false)
    e.target.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const punchData = []
    DAYS.forEach((day, di) => {
      const slots = punches[di]
      if (slots.some(Boolean)) {
        const d = new Date(selectedWeek)
        d.setDate(d.getDate() + di)
        punchData.push({ day, date: weekStartStr(d), slots: [...slots] })
      }
    })
    if (punchData.length === 0) { alert('Enter at least one punch time.'); return }
    const hours = punchData.reduce((s, p) => s + calcSlotHours(p.slots), 0)
    if (hours <= 0) { alert('No valid in/out pairs found. Make sure out times are after in times.'); return }

    setSaving(true)
    try {
      await addDoc(collection(db, 'timecards'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName || currentUser.email,
        weekStart: Timestamp.fromDate(selectedWeek),
        weekStartStr: weekStartStr(selectedWeek),
        weekLabel: weekLabel(selectedWeek),
        punches: punchData,
        totalHours: hours,
        photoUrl: photo?.url || null,
        photoPath: photo?.path || null,
        notes: notes.trim(),
        submittedAt: serverTimestamp(),
      })
      setSubmitted(true)
    } catch (err) {
      alert(`Submission failed: ${err.message}`)
    }
    setSaving(false)
  }

  const total = grandTotal(punches)

  if (submitted) {
    return (
      <div>
        <div style={{ ...card, textAlign: 'center', padding: '2rem', background: '#f0fdf4', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#15803d', marginBottom: '0.25rem' }}>Timecard submitted!</div>
          <div style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{weekLabel(selectedWeek)} · {formatHours(total)}</div>
          <button style={btn.secondary} onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/dashboard')}>← Dashboard</button>
      <h1 style={pageTitle}>My Timecard</h1>

      <div style={{ ...card, marginBottom: '0.75rem' }}>
        <label style={lbl}>Select Week</label>
        <select style={sel} value={weekIdx} onChange={e => setWeekIdx(parseInt(e.target.value))}>
          {weeks.map((w, i) => <option key={i} value={i}>{weekLabel(w)}</option>)}
        </select>
      </div>

      {checkingExisting ? (
        <p style={muted}>Loading…</p>
      ) : existing ? (
        <ExistingCard existing={existing} />
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={card}>
            <PunchTable
              punches={punches}
              selectedWeek={selectedWeek}
              onSlotChange={setSlot}
              total={total}
            />
          </div>

          <div style={card}>
            <label style={lbl}>Notes <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
            <textarea style={textArea} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about this week's hours…" />
          </div>

          <div style={card}>
            <label style={lbl}>📷 Photo of time card <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
            {photo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src={photo.url} alt="Time card" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 500 }}>Photo attached</div>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }} onClick={() => setPhoto(null)}>Remove</button>
                </div>
              </div>
            ) : (
              <label style={photoLbl}>
                {uploading ? 'Uploading…' : '📷 Add Photo'}
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} disabled={uploading} />
              </label>
            )}
          </div>

          <button type="submit" style={{ ...btn.primary, width: '100%', padding: '1rem', fontSize: '1.05rem' }} disabled={saving || uploading}>
            {saving ? 'Submitting…' : 'Submit Timecard'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── Punch table (shared by entry form and read-only view) ─────────────────────
function PunchTable({ punches, selectedWeek, onSlotChange, total, readOnly = false }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '14%' }} />
        <col style={{ width: '12.5%' }} />
        <col style={{ width: '12.5%' }} />
        <col style={{ width: '12.5%' }} />
        <col style={{ width: '12.5%' }} />
        <col style={{ width: '12.5%' }} />
        <col style={{ width: '12.5%' }} />
        <col style={{ width: '11%' }} />
      </colgroup>

      <thead>
        {/* Pair labels */}
        <tr>
          <th style={thBase} />
          {[0, 1, 2].map(pi => (
            <th key={pi} colSpan={2} style={{ ...thBase, textAlign: 'center', background: PAIR_HEAD_BG[pi], fontSize: '0.62rem', color: '#6b7280', letterSpacing: '0.04em', borderBottom: 'none', paddingBottom: '0.1rem' }}>
              {pi === 0 ? 'Pair 1' : pi === 1 ? 'Pair 2' : 'Pair 3'}
            </th>
          ))}
          <th style={thBase} />
        </tr>
        {/* IN / OUT labels */}
        <tr>
          <th style={{ ...thBase, paddingTop: '0.1rem' }} />
          {COL_TYPE.map((type, ci) => (
            <th key={ci} style={{ ...thBase, paddingTop: '0.1rem', textAlign: 'center', background: PAIR_HEAD_BG[Math.floor(ci / 2)], color: type === 'IN' ? IN_COLOR : OUT_COLOR, fontSize: '0.7rem', fontWeight: 700 }}>
              {type}
            </th>
          ))}
          <th style={{ ...thBase, paddingTop: '0.1rem', textAlign: 'right', color: '#9ca3af', fontSize: '0.65rem' }}>Hrs</th>
        </tr>
      </thead>

      <tbody>
        {DAYS.map((day, di) => {
          const row = punches[di]
          const slots = readOnly ? row : row
          const dh = calcSlotHours(slots)
          const isWeekend = di >= 5
          return (
            <tr key={day}>
              <td style={{ ...tdBase, background: isWeekend ? '#fafafa' : '#fff' }}>
                <div style={{ fontWeight: 600, fontSize: '0.78rem', color: isWeekend ? '#9ca3af' : '#374151' }}>{day}</div>
                <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{dayDate(selectedWeek, di)}</div>
              </td>
              {COL_TYPE.map((type, ci) => {
                const bg = PAIR_BG[Math.floor(ci / 2)]
                const cellBg = isWeekend ? (bg === '#ffffff' ? '#fafafa' : '#edf3fb') : bg
                return (
                  <td key={ci} style={{ ...tdBase, background: cellBg, padding: '0.3rem 0.15rem' }}>
                    {readOnly ? (
                      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: slots[ci] ? (type === 'IN' ? IN_COLOR : OUT_COLOR) : '#e5e7eb', fontWeight: slots[ci] ? 600 : 400 }}>
                        {slots[ci] || '—'}
                      </div>
                    ) : (
                      <input
                        type="time"
                        value={slots[ci]}
                        onChange={e => onSlotChange(di, ci, e.target.value)}
                        style={{ ...timeInput, color: type === 'IN' ? IN_COLOR : OUT_COLOR, borderColor: PAIR_HEAD_BG[Math.floor(ci / 2)] }}
                      />
                    )}
                  </td>
                )
              })}
              <td style={{ ...tdBase, textAlign: 'right', background: isWeekend ? '#fafafa' : '#fff', fontWeight: 700, fontSize: '0.75rem', color: dh > 0 ? '#1d4ed8' : '#e5e7eb', paddingRight: '0.1rem' }}>
                {dh > 0 ? formatHours(dh) : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>

      <tfoot>
        <tr>
          <td colSpan={8} style={{ borderTop: '2px solid #e5e7eb', padding: '0.5rem 0.1rem 0', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: total > 0 ? '#111827' : '#d1d5db' }}>
            Total: {total > 0 ? formatHours(total) : '—'}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

// ── Already-submitted read-only view ─────────────────────────────────────────
function ExistingCard({ existing }) {
  // Reconstruct 7×6 grid from stored punch data
  const grid = DAYS.map(() => Array(6).fill(''))
  existing.punches.forEach(p => {
    const di = DAYS.indexOf(p.day)
    if (di === -1) return
    if (p.slots) {
      p.slots.forEach((s, si) => { if (si < 6) grid[di][si] = s || '' })
    } else if (p.in !== undefined) {
      // legacy format {in, out}
      grid[di][0] = p.in || ''
      grid[di][1] = p.out || ''
    }
  })

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={sectionTitle}>Submitted</h2>
        <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1d4ed8' }}>{formatHours(existing.totalHours)}</span>
      </div>
      <PunchTable
        punches={grid}
        selectedWeek={existing.weekStart?.toDate ? existing.weekStart.toDate() : new Date(existing.weekStartStr)}
        total={existing.totalHours}
        readOnly
      />
      {existing.notes ? <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.75rem' }}>{existing.notes}</p> : null}
      {existing.photoUrl && (
        <a href={existing.photoUrl} target="_blank" rel="noopener noreferrer">
          <img src={existing.photoUrl} alt="Time card" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginTop: '0.75rem', border: '1px solid #e5e7eb' }} />
        </a>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }
const sectionTitle = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: 0 }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const lbl = { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }
const sel = { display: 'block', width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '1rem', background: '#fff' }
const thBase = { padding: '0.35rem 0.15rem', fontSize: '0.72rem', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb' }
const tdBase = { padding: '0.35rem 0.15rem', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }
const timeInput = {
  width: '100%',
  padding: '0.35rem 0.1rem',
  border: '1px solid',
  borderRadius: 4,
  fontSize: '0.72rem',
  background: 'transparent',
  textAlign: 'center',
  boxSizing: 'border-box',
  display: 'block',
}
const textArea = { display: 'block', width: '100%', padding: '0.7rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '1rem', background: '#fff', minHeight: 70, resize: 'vertical', boxSizing: 'border-box' }
const photoLbl = { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', border: '1.5px dashed #93c5fd', borderRadius: 8, color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', background: '#eff6ff' }
