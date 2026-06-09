import { useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/config'

export default function PhotoUpload({ storagePath, onUpload, currentUrl }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || null)

  async function handleChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fileRef = ref(storage, `${storagePath}/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      setPreview(url)
      onUpload({ url, path: fileRef.fullPath })
    } catch {
      alert('Photo upload failed. Please try again.')
    }
    setUploading(false)
  }

  return (
    <div>
      {preview ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={preview} alt="Photo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
          <label style={s.change}>
            Change photo
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleChange} />
          </label>
        </div>
      ) : (
        <label style={{ ...s.add, opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'Uploading…' : '📷 Add Photo'}
          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleChange} disabled={uploading} />
        </label>
      )}
    </div>
  )
}

const s = {
  add: {
    display: 'inline-block', padding: '0.5rem 0.875rem',
    border: '1.5px dashed #93c5fd', borderRadius: 8,
    color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer',
    background: '#eff6ff',
  },
  change: { fontSize: '0.8rem', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' },
}
