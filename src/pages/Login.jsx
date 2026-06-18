import { useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
} from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase/config'
import { useTranslation } from 'react-i18next'

const ACTION_CODE_SETTINGS = {
  url: 'https://playa-f559d.web.app/login',
  handleCodeInApp: true,
}

export default function Login() {
  const { t } = useTranslation()
  const [mode, setMode] = useState('password') // 'password' | 'link'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [completingSignIn, setCompletingSignIn] = useState(false)
  const [needsEmailForLink, setNeedsEmailForLink] = useState(false)
  const navigate = useNavigate()

  // On mount: detect email link and complete sign-in here on the Login page
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const savedEmail = window.localStorage.getItem('emailForSignIn')
      if (savedEmail) {
        completeEmailLink(savedEmail)
      } else {
        // Opened on a different device — ask for email via the form
        setMode('link')
        setNeedsEmailForLink(true)
      }
    }
  }, [])

  async function completeEmailLink(emailToUse) {
    setCompletingSignIn(true)
    setError('')
    try {
      await signInWithEmailLink(auth, emailToUse, window.location.href)
      window.localStorage.removeItem('emailForSignIn')
      navigate('/dashboard')
    } catch (err) {
      setError(t('Sign-in link is invalid or has expired. Please request a new one.'))
      setCompletingSignIn(false)
      setNeedsEmailForLink(false)
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch {
      setError(t('Invalid email or password.'))
    }
    setLoading(false)
  }

  async function handleLinkSubmit(e) {
    e.preventDefault()
    setError('')
    if (needsEmailForLink) {
      // Different-device flow: complete sign-in with the email they entered
      await completeEmailLink(email)
      return
    }
    setLoading(true)
    try {
      await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS)
      window.localStorage.setItem('emailForSignIn', email)
      setLinkSent(true)
    } catch {
      setError(t('Could not send link. Check the email address and try again.'))
    }
    setLoading(false)
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setEmail('')
    setPassword('')
    setLinkSent(false)
    setNeedsEmailForLink(false)
  }

  // ── Signing in screen (shown while signInWithEmailLink is running) ─────────
  if (completingSignIn) {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
          <h1 style={{ ...s.title, textAlign: 'center' }}>{t('Signing you in…')}</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{t('One moment please.')}</p>
        </div>
      </div>
    )
  }

  // ── Link sent confirmation screen ─────────────────────────────────────────
  if (linkSent) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>✉️</div>
          <h1 style={{ ...s.title, textAlign: 'center' }}>{t('Check your email')}</h1>
          <p style={{ color: '#374151', fontSize: '0.9rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            {t('We sent a sign-in link to')}
          </p>
          <p style={{ fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '1.25rem', wordBreak: 'break-all' }}>
            {email}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center', lineHeight: 1.5 }}>
            {t('Click the link in the email to sign in. You can close this tab.')}
          </p>
          <button
            style={{ ...s.button, background: '#fff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
            onClick={() => { setLinkSent(false); setEmail('') }}
          >
            {t('Use a different email')}
          </button>
        </div>
      </div>
    )
  }

  // ── Main login card ───────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>{t('Playa Management')}</h1>
        <p style={s.subtitle}>{t('CGMP Compliance — Sign in')}</p>

        {/* Mode toggle */}
        <div style={s.toggle}>
          <button
            style={{ ...s.toggleBtn, ...(mode === 'password' ? s.toggleActive : {}) }}
            onClick={() => switchMode('password')}
          >
            {t('Password')}
          </button>
          <button
            style={{ ...s.toggleBtn, ...(mode === 'link' ? s.toggleActive : {}) }}
            onClick={() => switchMode('link')}
          >
            {t('Email link')}
          </button>
        </div>

        {error && <p style={s.error}>{error}</p>}

        {/* Password form */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="email"
              placeholder={t('Email')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={s.input}
            />
            <input
              type="password"
              placeholder={t('Password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={s.input}
            />
            <button type="submit" disabled={loading} style={s.button}>
              {loading ? t('Signing in…') : t('Sign In')}
            </button>
          </form>
        )}

        {/* Email link form */}
        {mode === 'link' && (
          <form onSubmit={handleLinkSubmit}>
            {needsEmailForLink && (
              <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {t('Enter your email address to complete sign-in.')}
              </p>
            )}
            <input
              type="email"
              placeholder={t('Email')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              style={s.input}
            />
            <button type="submit" disabled={loading} style={s.button}>
              {loading ? t('Sending…') : needsEmailForLink ? t('Complete Sign In') : t('Send sign-in link')}
            </button>
            {!needsEmailForLink && (
              <p style={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.75rem' }}>
                {t("We'll email you a one-tap link — no password needed.")}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f3f4f6',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '360px',
  },
  title: { margin: '0 0 0.25rem', fontSize: '1.4rem', color: '#111827' },
  subtitle: { margin: '0 0 1.25rem', color: '#6b7280', fontSize: '0.875rem' },
  error: { color: '#dc2626', marginBottom: '1rem', fontSize: '0.875rem' },
  input: {
    display: 'block',
    width: '100%',
    padding: '0.6rem 0.75rem',
    marginBottom: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '0.7rem',
    background: '#1d4ed8',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
  toggle: {
    display: 'flex',
    background: '#f3f4f6',
    borderRadius: '6px',
    padding: '3px',
    marginBottom: '1.25rem',
    gap: '2px',
  },
  toggleBtn: {
    flex: 1,
    padding: '0.4rem',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    background: 'transparent',
    color: '#6b7280',
  },
  toggleActive: {
    background: '#fff',
    color: '#111827',
    fontWeight: 600,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
}
