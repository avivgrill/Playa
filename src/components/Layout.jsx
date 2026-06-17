import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  {
    label: 'Inspections', key: 'inspections',
    children: [
      { label: 'Start Daily Inspection', path: '/inspections/new/daily_facility' },
      { label: 'Start Pre-Op Inspection', path: '/inspections/new/pre_operational' },
      { label: 'Start Weekly Inspection', path: '/inspections/new/weekly_facility' },
      { label: 'Start Monthly Verification', path: '/inspections/new/monthly_facility' },
      { label: 'Inspection History', path: '/inspections' },
    ],
  },
  {
    label: 'Cleaning', key: 'cleaning',
    children: [
      { label: 'New Cleaning Log', path: '/cleaning/new' },
      { label: 'Cleaning Log History', path: '/cleaning' },
    ],
  },
  {
    label: 'Operations', key: 'operations',
    children: [
      { label: 'SOPs', path: '/operations/sops' },
      { label: 'Production Batches', path: '/operations/batches' },
      { label: 'Production Logs', path: '/operations/logs' },
      { label: 'Customers', path: '/operations/customers' },
      { label: '─────────────', path: null, divider: true },
      { label: 'Ingredients', path: '/operations/ingredients' },
      { label: 'Receive Inventory', path: '/operations/receive' },
      { label: 'Ingredient Lots', path: '/operations/lots' },
      { label: 'Recall Trace', path: '/operations/recall' },
    ],
  },
  { label: 'Records', path: '/records' },
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
  const { currentUser, isAdmin, hasTimecard, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDrop, setOpenDrop] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900)

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
  const isActivePath = (key) => location.pathname.startsWith(`/${key}`)

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <nav style={s.bar}>
        <div style={s.inner}>
          <Link to="/dashboard" style={s.brand}>Playa Management</Link>

          {!isMobile && (
            <div style={s.desktopLinks}>
              {navItems.map(item =>
                item.children ? (
                  <div key={item.key} style={{ position: 'relative' }}>
                    <button
                      style={{ ...s.navBtn, ...(isActivePath(item.key) ? s.navBtnActive : {}) }}
                      onClick={(e) => { e.stopPropagation(); setOpenDrop(openDrop === item.key ? null : item.key) }}
                    >
                      {item.label} ▾
                    </button>
                    {openDrop === item.key && (
                      <div style={s.dropdown} onClick={e => e.stopPropagation()}>
                        {item.children.map(c => c.divider
                          ? <div key="divider" style={{ borderTop: '1px solid #e5e7eb', margin: '0.25rem 0' }} />
                          : <Link key={c.path} to={c.path} style={s.dropItem}>{c.label}</Link>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{ ...s.navBtn, ...(location.pathname === item.path ? s.navBtnActive : {}) }}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>
          )}

          <div style={s.right}>
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
                  {openDrop === item.key && item.children.map(c => c.divider
                    ? <div key="divider" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.25rem 0' }} />
                    : <Link key={c.path} to={c.path} style={s.mobileSub}>{c.label}</Link>
                  )}
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

      <main style={{ padding: '1rem', maxWidth: 860, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  )
}

const s = {
  bar: { background: '#1d4ed8', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' },
  inner: { display: 'flex', alignItems: 'center', padding: '0 1rem', height: 56, gap: '0.5rem' },
  brand: { color: '#fff', fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', marginRight: '0.5rem' },
  desktopLinks: { display: 'flex', alignItems: 'center', gap: '0.125rem', flex: 1 },
  navBtn: {
    color: 'rgba(255,255,255,0.85)', background: 'transparent', border: 'none',
    borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: '0.875rem',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  navBtnActive: { background: 'rgba(255,255,255,0.18)', color: '#fff' },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0,
    background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    minWidth: 220, zIndex: 200, overflow: 'hidden',
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
  hamburger: { color: '#fff', background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer', padding: '0.25rem' },
  mobileMenu: { background: '#1e40af', borderTop: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' },
  mobileItem: {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '0.875rem 1.25rem', color: '#fff', background: 'transparent',
    border: 'none', fontSize: '0.95rem', cursor: 'pointer',
    textDecoration: 'none',
  },
  mobileSub: {
    display: 'block', padding: '0.7rem 2.25rem',
    color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.12)',
    fontSize: '0.875rem', textDecoration: 'none',
  },
  mobileDivider: { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.25rem 0' },
}
