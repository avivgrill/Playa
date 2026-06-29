import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../utils/format'
import { card, btn, input, label } from '../../styles/common'
import Modal from '../../components/Modal'

const CATEGORIES = ['General', 'Production', 'Sanitation', 'Receiving & Storage', 'Packaging', 'Quality Control', 'Allergen Control']

export default function ProcessDocs() {
  const navigate = useNavigate()
  const { currentUser, isAdmin } = useAuth()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const snap = await getDocs(query(collection(db, 'processDocs'), orderBy('createdAt', 'desc')))
    setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  const categories = ['all', ...Array.from(new Set(docs.map(d => d.category).filter(Boolean))).sort()]
  const filtered = categoryFilter === 'all' ? docs : docs.filter(d => d.category === categoryFilter)

  return (
    <div>
      <div style={header}>
        <div>
          <h1 style={pageTitle}>Process Documentation</h1>
          <p style={sub}>Internal procedures, work instructions, and reference documents.</p>
        </div>
        {isAdmin && (
          <button style={btn.primary} onClick={() => setShowNew(true)}>+ New Document</button>
        )}
      </div>

      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button key={c}
              style={{ ...filterBtn, background: categoryFilter === c ? '#1d4ed8' : '#fff', color: categoryFilter === c ? '#fff' : '#374151' }}
              onClick={() => setCategoryFilter(c)}>
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      )}

      {loading && <p style={muted}>Loading…</p>}
      {!loading && filtered.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '2.5rem 1rem', color: '#9ca3af' }}>
          {isAdmin ? 'No documents yet. Create your first one.' : 'No documents published yet.'}
        </div>
      )}

      {filtered.map(doc => (
        <div key={doc.id} style={{ ...card, cursor: 'pointer' }} onClick={() => navigate(`/docs/process/${doc.id}`)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              {doc.category && <span style={catBadge}>{doc.category}</span>}
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '1rem', marginTop: doc.category ? '0.3rem' : 0 }}>{doc.title}</div>
              {doc.sections?.length > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  {doc.sections.length} section{doc.sections.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'right', flexShrink: 0 }}>
              {formatDate(doc.updatedAt || doc.createdAt)}
            </div>
          </div>
        </div>
      ))}

      {showNew && (
        <Modal title="New Document" onClose={() => setShowNew(false)} maxWidth={600}>
          <DocForm
            onClose={() => setShowNew(false)}
            onSaved={newDoc => { setDocs(prev => [newDoc, ...prev]); setShowNew(false) }}
          />
        </Modal>
      )}
    </div>
  )
}

export function DocForm({ existing, onClose, onSaved }) {
  const { currentUser } = useAuth()
  const [title, setTitle] = useState(existing?.title || '')
  const [category, setCategory] = useState(existing?.category || '')
  const [sections, setSections] = useState(
    existing?.sections?.length ? existing.sections : [{ id: Date.now(), heading: '', body: '' }]
  )
  const [saving, setSaving] = useState(false)

  function addSection() {
    setSections(prev => [...prev, { id: Date.now(), heading: '', body: '' }])
  }
  function removeSection(id) {
    setSections(prev => prev.filter(s => s.id !== id))
  }
  function updateSection(id, field, value) {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const cleanSections = sections.filter(s => s.heading.trim() || s.body.trim()).map(({ id, heading, body }) => ({ id: String(id), heading, body }))
      const data = {
        title: title.trim(),
        category: category.trim(),
        sections: cleanSections,
        updatedAt: serverTimestamp(),
        updatedBy: userInfo,
      }
      if (existing) {
        const { updateDoc, doc: docRef } = await import('firebase/firestore')
        await updateDoc(docRef(db, 'processDocs', existing.id), data)
        onSaved({ ...existing, ...data, sections: cleanSections })
      } else {
        const ref = await addDoc(collection(db, 'processDocs'), { ...data, createdAt: serverTimestamp(), createdBy: userInfo })
        onSaved({ id: ref.id, ...data, sections: cleanSections })
      }
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave}>
      <label style={label}>Title *</label>
      <input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Receiving Inspection Procedure" autoFocus required />

      <label style={label}>Category</label>
      <input
        list="category-list"
        style={input}
        value={category}
        onChange={e => setCategory(e.target.value)}
        placeholder="e.g. Production, Sanitation…"
      />
      <datalist id="category-list">
        {CATEGORIES.map(c => <option key={c} value={c} />)}
      </datalist>

      <div style={{ borderTop: '1px solid #f3f4f6', marginTop: '0.5rem', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Sections</span>
          <button type="button" style={addSectionBtn} onClick={addSection}>+ Add Section</button>
        </div>
        {sections.map((sec, i) => (
          <div key={sec.id} style={sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section {i + 1}</span>
              {sections.length > 1 && (
                <button type="button" style={removeSectionBtn} onClick={() => removeSection(sec.id)}>✕ Remove</button>
              )}
            </div>
            <input
              style={{ ...input, marginBottom: '0.5rem', fontWeight: 600 }}
              value={sec.heading}
              onChange={e => updateSection(sec.id, 'heading', e.target.value)}
              placeholder="Section heading (optional)"
            />
            <textarea
              style={{ ...input, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              value={sec.body}
              onChange={e => updateSection(sec.id, 'body', e.target.value)}
              placeholder="Write the content here. Use line breaks for steps or bullet points."
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button type="button" style={{ ...btn.secondary, flex: 1 }} onClick={onClose}>Cancel</button>
        <button type="submit" style={{ ...btn.primary, flex: 1 }} disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : (existing ? 'Save Changes' : 'Create Document')}
        </button>
      </div>
    </form>
  )
}

const header = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '1rem' }
const pageTitle = { fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }
const sub = { fontSize: '0.875rem', color: '#6b7280', margin: '0.2rem 0 0' }
const filterBtn = { padding: '0.35rem 0.65rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }
const catBadge = { display: 'inline-block', fontSize: '0.7rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', borderRadius: 10, padding: '0.1rem 0.5rem' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
const sectionBox = { background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', padding: '0.875rem', marginBottom: '0.75rem' }
const addSectionBtn = { background: 'transparent', border: '1px dashed #6b7280', color: '#374151', borderRadius: 6, padding: '0.3rem 0.65rem', fontSize: '0.8rem', cursor: 'pointer' }
const removeSectionBtn = { background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }
