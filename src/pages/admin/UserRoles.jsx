import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { card } from '../../styles/common'
import { useTranslation } from 'react-i18next'

export default function UserRoles() {
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  async function load() {
    const snap = await getDocs(collection(db, 'userRoles'))
    setUsers(
      snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.email || '').localeCompare(b.email || ''))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggle(uid, field, value) {
    setSaving(uid + field)
    await updateDoc(doc(db, 'userRoles', uid), { [field]: value })
    setUsers(u => u.map(user => user.uid === uid ? { ...user, [field]: value } : user))
    setSaving(null)
  }

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/dashboard')}>{t('← Dashboard')}</button>
      <h1 style={pageTitle}>{t('User Roles')}</h1>
      <p style={muted}>{t('Only users who have signed in at least once appear here.')}</p>

      {loading ? <p style={muted}>{t('Loading…')}</p> : (
        <div style={card}>
          {users.map(user => (
            <div key={user.uid} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', color: '#111827', fontWeight: 500 }}>
                  {user.displayName && user.displayName !== user.email ? user.displayName : user.email}
                </div>
                {user.displayName && user.displayName !== user.email && (
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{user.email}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <Toggle
                  label={t('Admin')}
                  value={!!user.isAdmin}
                  disabled={user.uid === currentUser.uid || saving === user.uid + 'isAdmin'}
                  onChange={v => toggle(user.uid, 'isAdmin', v)}
                />
                <Toggle
                  label={t('Timecard')}
                  value={!!user.hasTimecard}
                  disabled={saving === user.uid + 'hasTimecard'}
                  onChange={v => toggle(user.uid, 'hasTimecard', v)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Toggle({ label, value, disabled, onChange }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{
        padding: '0.3rem 0.65rem',
        border: `1.5px solid ${value ? '#1d4ed8' : '#d1d5db'}`,
        borderRadius: 6,
        background: value ? '#eff6ff' : '#f9fafb',
        color: value ? '#1d4ed8' : '#9ca3af',
        fontSize: '0.75rem',
        fontWeight: value ? 700 : 400,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        minWidth: 80,
        transition: 'all 0.15s',
      }}
    >
      {label} {value ? t('ON') : t('OFF')}
    </button>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }
const muted = { color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1rem' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const row = { display: 'flex', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #f3f4f6', gap: '0.75rem' }
