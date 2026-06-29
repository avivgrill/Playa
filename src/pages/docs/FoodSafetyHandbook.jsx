import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { card, btn, input, label } from '../../styles/common'
import Modal from '../../components/Modal'

export default function FoodSafetyHandbook() {
  const { currentUser, isAdmin } = useAuth()
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState(null) // null | section | 'new'
  const [expanded, setExpanded] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    const snap = await getDocs(query(collection(db, 'handbookSections'), orderBy('order', 'asc')))
    const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setSections(loaded)
    // Expand first section by default
    if (loaded.length > 0) setExpanded({ [loaded[0].id]: true })
    setLoading(false)
  }

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleSave(data) {
    const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
    if (editingSection === 'new') {
      const nextOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order || 0)) + 1 : 1
      const ref = await addDoc(collection(db, 'handbookSections'), {
        ...data,
        order: nextOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userInfo,
        updatedBy: userInfo,
      })
      setSections(prev => [...prev, { id: ref.id, ...data, order: nextOrder }])
    } else {
      await updateDoc(doc(db, 'handbookSections', editingSection.id), {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: userInfo,
      })
      setSections(prev => prev.map(s => s.id === editingSection.id ? { ...s, ...data } : s))
    }
    setEditingSection(null)
  }

  async function handleDelete(section) {
    if (!window.confirm(`Delete section "${section.title}"?`)) return
    await deleteDoc(doc(db, 'handbookSections', section.id))
    setSections(prev => prev.filter(s => s.id !== section.id))
  }

  async function move(section, direction) {
    const idx = sections.findIndex(s => s.id === section.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sections.length) return
    const reordered = [...sections]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]
    const updated = reordered.map((s, i) => ({ ...s, order: i + 1 }))
    setSections(updated)
    const wb = writeBatch(db)
    updated.forEach(s => wb.update(doc(db, 'handbookSections', s.id), { order: s.order }))
    await wb.commit()
  }

  return (
    <div>
      <div style={header}>
        <div>
          <h1 style={pageTitle}>Food Safety Handbook</h1>
          <p style={sub}>Company policies, HACCP plans, and food safety reference materials.</p>
        </div>
        {isAdmin && (
          <button style={btn.primary} onClick={() => setEditingSection('new')}>+ Add Section</button>
        )}
      </div>

      {loading && <p style={muted}>Loading…</p>}

      {!loading && sections.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '2.5rem 1rem', color: '#9ca3af' }}>
          {isAdmin ? 'No handbook sections yet. Add your first section.' : 'Handbook is being built. Check back soon.'}
        </div>
      )}

      {sections.map((section, idx) => (
        <div key={section.id} style={{ ...card, marginBottom: '0.75rem', padding: 0, overflow: 'hidden' }}>
          {/* Section header — click to expand */}
          <div
            style={sectionHeader}
            onClick={() => toggle(section.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
              <span style={sectionNum}>{idx + 1}</span>
              <span style={sectionTitle}>{section.title}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {isAdmin && (
                <>
                  <button style={iconBtn} onClick={e => { e.stopPropagation(); move(section, 'up') }} disabled={idx === 0} title="Move up">↑</button>
                  <button style={iconBtn} onClick={e => { e.stopPropagation(); move(section, 'down') }} disabled={idx === sections.length - 1} title="Move down">↓</button>
                  <button style={{ ...iconBtn, color: '#1d4ed8' }} onClick={e => { e.stopPropagation(); setEditingSection(section) }}>Edit</button>
                  <button style={{ ...iconBtn, color: '#dc2626' }} onClick={e => { e.stopPropagation(); handleDelete(section) }}>Delete</button>
                </>
              )}
              <span style={{ color: '#9ca3af', fontSize: '0.9rem', marginLeft: '0.25rem' }}>
                {expanded[section.id] ? '▴' : '▾'}
              </span>
            </div>
          </div>

          {/* Section body */}
          {expanded[section.id] && section.body && (
            <div style={sectionBody}>
              <p style={bodyText}>{section.body}</p>
            </div>
          )}
          {expanded[section.id] && !section.body && (
            <div style={{ ...sectionBody, color: '#9ca3af', fontStyle: 'italic' }}>No content yet.</div>
          )}
        </div>
      ))}

      {editingSection !== null && (
        <Modal
          title={editingSection === 'new' ? 'New Handbook Section' : 'Edit Section'}
          onClose={() => setEditingSection(null)}
          maxWidth={580}
        >
          <SectionForm
            existing={editingSection === 'new' ? null : editingSection}
            onClose={() => setEditingSection(null)}
            onSaved={handleSave}
          />
        </Modal>
      )}
    </div>
  )
}

function SectionForm({ existing, onClose, onSaved }) {
  const [title, setTitle] = useState(existing?.title || '')
  const [body, setBody] = useState(existing?.body || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await onSaved({ title: title.trim(), body: body.trim() })
    } catch (err) {
      alert(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label style={label}>Section Title *</label>
      <input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. HACCP Plan Overview, Allergen Control Policy…" autoFocus required />

      <label style={label}>Content</label>
      <textarea
        style={{ ...input, minHeight: 220, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write the section content here. Use line breaks to separate paragraphs or steps."
      />

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
        <button type="button" style={{ ...btn.secondary, flex: 1 }} onClick={onClose}>Cancel</button>
        <button type="submit" style={{ ...btn.primary, flex: 1 }} disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : (existing ? 'Save Changes' : 'Add Section')}
        </button>
      </div>
    </form>
  )
}

const header = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem' }
const pageTitle = { fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }
const sub = { fontSize: '0.875rem', color: '#6b7280', margin: '0.2rem 0 0' }
const sectionHeader = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0.875rem 1rem', cursor: 'pointer', gap: '0.5rem',
  background: '#fff', userSelect: 'none',
}
const sectionNum = {
  width: 24, height: 24, borderRadius: '50%', background: '#1d4ed8',
  color: '#fff', fontSize: '0.7rem', fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
const sectionTitle = { fontWeight: 600, color: '#111827', fontSize: '0.925rem' }
const sectionBody = { padding: '0.75rem 1rem 1rem', borderTop: '1px solid #f3f4f6', background: '#fafafa' }
const bodyText = { fontSize: '0.9rem', color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }
const iconBtn = { background: 'transparent', border: 'none', color: '#6b7280', fontSize: '0.78rem', cursor: 'pointer', padding: '0.2rem 0.35rem', borderRadius: 4 }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
