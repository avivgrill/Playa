import { useNavigate } from 'react-router-dom'
import { btn } from '../styles/common'

export default function ActionSummaryModal({ results, onDone }) {
  const navigate = useNavigate()

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
            {results.length === 1 ? 'Record Created' : `${results.length} Records Created`}
          </span>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          {results.map((r, i) => (
            <div key={i} style={resultRow}>
              <span style={checkmark}>✓</span>
              <span style={{ flex: 1, fontSize: '0.9rem', color: '#111827' }}>{r.label}</span>
              {r.navigateTo && (
                <button
                  style={viewBtn}
                  onClick={() => { onDone(); navigate(r.navigateTo) }}
                >
                  View →
                </button>
              )}
            </div>
          ))}
        </div>

        <button style={{ ...btn.primary, width: '100%', textAlign: 'center' }} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
}

const modal = {
  background: '#fff',
  borderRadius: 14,
  padding: '1.5rem',
  maxWidth: 480,
  width: '100%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
}

const modalHeader = {
  marginBottom: '1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid #f3f4f6',
}

const resultRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.6rem 0',
  borderBottom: '1px solid #f9fafb',
}

const checkmark = {
  width: 24,
  height: 24,
  background: '#dcfce7',
  color: '#15803d',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.8rem',
  fontWeight: 700,
  flexShrink: 0,
}

const viewBtn = {
  background: 'transparent',
  border: '1px solid #1d4ed8',
  color: '#1d4ed8',
  borderRadius: 6,
  padding: '0.3rem 0.75rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
