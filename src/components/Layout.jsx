import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import FloatingChat from './FloatingChat'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Compliance', path: '/compliance' },
  { label: 'Production', path: '/production' },
  { label: 'Inventory', path: '/inventory' },
  { label: 'Records', path: '/records' },
  {
    label: 'Docs', key: 'docs',
    children: [
      { label: 'Process Documentation', path: '/docs/process' },
      { label: 'Food Safety Handbook', path: '/docs/handbook' },
    ],
  },
]

function buildNavItems(isAdmin, hasTimecard) {
  const items = [...NAV_ITEMS]
  if (hasTimecard) {
    items.push({ label: 'Timecard', path: '/timecard' })
  }
  if (isAdmin) {
    items.push({
      label: 'Admin', key: 'admin',
      children: [
        { label: 'User Roles', path: '/admin/users' },
        { label: 'All Timecards', path: '/admin/timecards' },
      ],
    })
  }
  return items
}

export default function Layout() {
  const { currentUser, isAdmin, hasTimecard, logout, saveLanguage } = useAuth()
  const { i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDrop, setOpenDrop] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900)

  const lang = i18n.language

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setOpenDrop(null)
  }, [location.pathname])

  useEffect(() => {
    const close = () => setOpenDrop(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const handleLogout = async () => { await logout(); navigate('/login') }
  const navItems = buildNavItems(isAdmin, hasTimecard)

  function isActive(item) {
    if (item.path === '/dashboard') return location.pathname === '/dashboard'
    if (item.path) return location.pathname.startsWith(item.path)
    if (item.children) return item.children.some(c => location.pathname.startsWith(c.path))
    return false
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <nav style={s.bar}>
        <div style={s.inner}>
          <Link to="/dashboard" style={s.brand}>Playa</Link>

          {!isMobile && (
            <div style={s.desktopLinks}>
              {navItems.map(item =>
                item.children ? (
                  <div key={item.key} style={{ position: 'relative' }}>
                    <button
                      style={{ ...s.navBtn, ...(isActive(item) ? s.navBtnActive : {}) }}
                      onClick={(e) => { e.stopPropagation(); setOpenDrop(openDrop === item.key ? null : item.key) }}
                    >
                      {item.label} ▾
                    </button>
                    {openDrop === item.key && (
                      <div style={s.dropdown} onClick={e => e.stopPropagation()}>
                        {item.children.map(c => (
                          <Link key={c.path} to={c.path} style={s.dropItem}>{c.label}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{ ...s.navBtn, ...(isActive(item) ? s.navBtnActive : {}) }}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>
          )}

          <div style={s.right}>
            <div style={s.flagGroup}>
              <button style={{ ...s.flagBtn, ...(lang === 'en' ? s.flagActive : s.flagInactive) }} onClick={() => saveLanguage('en')} title="English">
                🇺🇸
              </button>
              <button style={{ ...s.flagBtn, ...(lang === 'es' ? s.flagActive : s.flagInactive) }} onClick={() => saveLanguage('es')} title="Español">
                🇲🇽
              </button>
            </div>
            {!isMobile && <span style={s.email}>{currentUser.email}</span>}
            {!isMobile && <button style={s.signOutBtn} onClick={handleLogout}>Sign Out</button>}
            {isMobile && (
              <button style={s.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </div>

        {isMobile && menuOpen && (
          <div style={s.mobileMenu}>
            {navItems.map(item =>
              item.children ? (
                <div key={item.key}>
                  <button
                    style={s.mobileItem}
                    onClick={() => setOpenDrop(openDrop === item.key ? null : item.key)}
                  >
                    {item.label} {openDrop === item.key ? '▴' : '▾'}
                  </button>
                  {openDrop === item.key && item.children.map(c => (
                    <Link key={c.path} to={c.path} style={s.mobileSub}>{c.label}</Link>
                  ))}
                </div>
              ) : (
                <Link key={item.path} to={item.path} style={s.mobileItem}>{item.label}</Link>
              )
            )}
            <div style={s.mobileDivider} />
            <span style={{ ...s.mobileItem, color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
              {currentUser.email}
            </span>
            <button style={{ ...s.mobileItem, textAlign: 'left', border: 'none', width: '100%' }} onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        )}
      </nav>

      <main style={{ padding: '1rem', maxWidth: location.pathname === '/production' ? 1280 : 860, margin: '0 auto', paddingBottom: '5rem' }}>
        <Outlet />
      </main>

      <FloatingChat />
    </div>
  )
}

const s = {
  bar: { background: '#1d4ed8', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' },
  inner: { display: 'flex', alignItems: 'center', padding: '0 1rem', height: 52, gap: '0.5rem' },
  brand: { color: '#fff', fontWeight: 800, fontSize: '1.05rem', whiteSpace: 'nowrap', marginRight: '0.75rem', letterSpacing: '-0.01em' },
  desktopLinks: { display: 'flex', alignItems: 'center', gap: '0.125rem', flex: 1 },
  navBtn: {
    color: 'rgba(255,255,255,0.85)', background: 'transparent', border: 'none',
    borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: '0.875rem',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  navBtnActive: { background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 600 },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0,
    background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    minWidth: 180, zIndex: 200, overflow: 'hidden',
  },
  dropItem: {
    display: 'block', padding: '0.75rem 1rem', color: '#374151',
    fontSize: '0.875rem', borderBottom: '1px solid #f3f4f6',
  },
  right: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  email: { color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem' },
  signOutBtn: {
    color: 'rgba(255,255,255,0.85)', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6,
    padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer',
  },
  flagGroup: {
    display: 'flex', alignItems: 'center',
    background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '2px', gap: 0,
  },
  flagBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: '1.25rem', padding: '0.15rem 0.35rem', lineHeight: 1,
    borderRadius: 6, transition: 'opacity 0.15s',
  },
  flagActive: {
    background: 'rgba(255,255,255,0.25)',
  },
  flagInactive: {
    opacity: 0.45,
  },
  hamburger: { color: '#fff', background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer', padding: '0.25rem' },
  mobileMenu: { background: '#1e40af', borderTop: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' },
  mobileItem: {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '0.875rem 1.25rem', color: '#fff', background: 'transparent',
    border: 'none', fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'none',
  },
  mobileSub: {
    display: 'block', padding: '0.7rem 2.25rem',
    color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.12)',
    fontSize: '0.875rem', textDecoration: 'none',
  },
  mobileDivider: { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.25rem 0' },
}
