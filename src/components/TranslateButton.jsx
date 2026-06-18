import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useTranslation } from 'react-i18next'

const translateFn = httpsCallable(getFunctions(), 'translateText')

export default function TranslateButton({ text, style }) {
  const { i18n } = useTranslation()
  const [translation, setTranslation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)

  // Only show if language is Spanish and we have text
  if (i18n.language !== 'es' || !text?.trim()) return null

  const handleTranslate = async () => {
    if (translation) {
      setShowTranslation(t => !t)
      return
    }
    setLoading(true)
    try {
      const result = await translateFn({ text, targetLang: 'es' })
      setTranslation(result.data.translation)
      setShowTranslation(true)
    } catch (err) {
      console.error('Translation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.35rem', ...style }}>
      <button
        type="button"
        onClick={handleTranslate}
        disabled={loading}
        style={{
          fontSize: '0.72rem', padding: '0.2rem 0.55rem',
          background: '#eff6ff', color: '#1d4ed8',
          border: '1px solid #bfdbfe', borderRadius: 4,
          cursor: loading ? 'default' : 'pointer',
          alignSelf: 'flex-start', whiteSpace: 'nowrap',
        }}
      >
        {loading ? 'Traduciendo…' : showTranslation ? 'Ver original' : '🌐 Traducir'}
      </button>
      {showTranslation && translation && (
        <span style={{
          display: 'block', fontSize: '0.875rem',
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 6, padding: '0.5rem 0.75rem',
          color: '#166534', whiteSpace: 'pre-wrap',
        }}>
          {translation}
        </span>
      )}
    </span>
  )
}
