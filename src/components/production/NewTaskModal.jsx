import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { input, btn, label } from '../../styles/common'

export default function NewTaskModal({ onClose, onCreated }) {
  const { currentUser } = useAuth()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
      const ref = await addDoc(collection(db, 'tasks'), {
        title: title.trim(),
        notes: notes.trim(),
        status: 'backlog',
        sortOrder: Date.now(),
        createdAt: serverTimestamp(),
        createdBy: userInfo,
      })
      onCreated({ id: ref.id, title: title.trim(), notes: notes.trim(), status: 'backlog', sortOrder: Date.now() })
    } catch (err) {
      alert(err.message)
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label style={label}>Task *</label>
      <input
        style={input}
        value={title} onChange={e => setTitle(e.target.value)}
        placeholder="What needs to be done?" autoFocus required
      />
      <label style={label}>Notes (optional)</label>
      <textarea
        style={{ ...input, minHeight: 72, resize: 'vertical' }}
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Any details…"
      />
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
        <button type="button" style={{ ...btn.secondary, flex: 1 }} onClick={onClose}>Cancel</button>
        <button type="submit" style={{ ...btn.primary, flex: 1 }} disabled={saving || !title.trim()}>
          {saving ? 'Adding…' : 'Add Task'}
        </button>
      </div>
    </form>
  )
}
