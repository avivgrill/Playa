import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../utils/format'
import { card, btn } from '../../styles/common'
import Modal from '../../components/Modal'
import { DocForm } from './ProcessDocs'

export default function ProcessDocDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [document, setDocument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'processDocs', id)).then(snap => {
      if (snap.exists()) setDocument({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
  }, [id])

  async function handleDelete() {
    if (!window.confirm(`Delete "${document.title}"? This cannot be undone.`)) return
    setDeleting(true)
    await deleteDoc(doc(db, 'processDocs', id))
    navigate('/docs/process')
  }

  if (loading) return <p style={muted}>Loading…</p>
  if (!document) return <p style={{ color: '#dc2626' }}>Document not found.</p>

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/docs/process')}>← Process Documentation</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          {document.category && <span style={catBadge}>{document.category}</span>}
          <h1 style={pageTitle}>{document.title}</h1>
          <p style={meta}>
            Last updated {formatDate(document.updatedAt || document.createdAt)}
            {document.updatedBy && ` · ${document.updatedBy.displayName || document.updatedBy.email}`}
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button style={btn.secondary} onClick={() => setShowEdit(true)}>Edit</button>
            <button
              style={{ ...btn.secondary, color: '#dc2626', borderColor: '#dc2626' }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {(!document.sections || document.sections.length === 0) && (
        <p style={muted}>No sections yet.</p>
      )}

      {document.sections?.map((section, i) => (
        <div key={section.id || i} style={{ ...card, marginBottom: '1rem' }}>
          {section.heading && (
            <h2 style={sectionHeading}>{section.heading}</h2>
          )}
          {section.body && (
            <p style={sectionBody}>{section.body}</p>
          )}
        </div>
      ))}

      {showEdit && (
        <Modal title="Edit Document" onClose={() => setShowEdit(false)} maxWidth={600}>
          <DocForm
            existing={document}
            onClose={() => setShowEdit(false)}
            onSaved={updated => { setDocument(updated); setShowEdit(false) }}
          />
        </Modal>
      )}
    </div>
  )
}

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1.25rem', padding: 0 }
const pageTitle = { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: '0.25rem 0 0' }
const meta = { fontSize: '0.8rem', color: '#9ca3af', margin: '0.3rem 0 0' }
const catBadge = { display: 'inline-block', fontSize: '0.7rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', borderRadius: 10, padding: '0.1rem 0.5rem' }
const sectionHeading = { fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: '0.625rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' }
const sectionBody = { fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
