import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { currentUser, logout } = useAuth()

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.brand}>Playa Management</span>
        <div style={styles.userBar}>
          <span style={styles.email}>{currentUser.email}</span>
          <button onClick={logout} style={styles.logoutBtn}>Sign Out</button>
        </div>
      </header>
      <main style={styles.main}>
        <h1 style={styles.heading}>Dashboard</h1>
        <p style={styles.body}>
          Signed in as <strong>{currentUser.email}</strong>. CGMP compliance
          modules will appear here.
        </p>
      </main>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.875rem 1.5rem',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
  },
  brand: { fontWeight: 600, fontSize: '1rem', color: '#111827' },
  userBar: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  email: { color: '#6b7280', fontSize: '0.875rem' },
  logoutBtn: {
    padding: '0.35rem 0.9rem',
    background: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#374151',
  },
  main: { padding: '2rem 1.5rem' },
  heading: { margin: '0 0 0.5rem', color: '#111827' },
  body: { color: '#6b7280', lineHeight: 1.6 },
}
