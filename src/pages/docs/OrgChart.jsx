export default function OrgChart() {
  return (
    <div>
      <h1 style={pageTitle}>Organizational Chart</h1>
      <p style={sub}>Playa — Leadership & Operations</p>

      <div style={chartWrap}>
        {/* Managing Partners row */}
        <div style={tierLabel}>Managing Partners</div>
        <div style={partnerRow}>
          <PersonCard name="Aviv Grill" title="Managing Partner" color="#1d4ed8" initials="AG" />
          <PersonCard name="Kayde McMullen" title="Managing Partner" color="#1d4ed8" initials="KM" />
        </div>

        {/* Connector down */}
        <div style={connectorDown} />
        <div style={connectorBar} />
        <div style={connectorDown} />

        {/* Lead Confectioner */}
        <div style={tierLabel}>Production Lead</div>
        <div style={singleRow}>
          <PersonCard name="Alfredo Hurtado" title="Lead Confectioner" color="#7e22ce" initials="AH" />
        </div>

        {/* Connector down */}
        <div style={connectorDown} />

        {/* Confectioner */}
        <div style={tierLabel}>Production</div>
        <div style={singleRow}>
          <PersonCard name="Evan Tront" title="Confectioner" color="#0369a1" initials="ET" />
        </div>
      </div>
    </div>
  )
}

function PersonCard({ name, title, color, initials }) {
  return (
    <div style={card}>
      <div style={{ ...avatar, background: color }}>{initials}</div>
      <div style={personName}>{name}</div>
      <div style={{ ...personTitle, color }}>{title}</div>
    </div>
  )
}

const pageTitle = { fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }
const sub = { fontSize: '0.875rem', color: '#6b7280', margin: '0.2rem 0 2rem' }
const chartWrap = { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '2rem' }
const tierLabel = { fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: '0.625rem' }
const partnerRow = { display: 'flex', gap: '2.5rem', justifyContent: 'center', flexWrap: 'wrap' }
const singleRow = { display: 'flex', justifyContent: 'center' }

const connectorDown = { width: 2, height: 28, background: '#d1d5db' }
const connectorBar = { width: 180, height: 2, background: '#d1d5db' }

const card = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
  textAlign: 'center',
  minWidth: 160,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
}
const avatar = {
  width: 48, height: 48, borderRadius: '50%',
  color: '#fff', fontWeight: 700, fontSize: '1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  margin: '0 auto 0.625rem',
}
const personName = { fontWeight: 700, color: '#111827', fontSize: '0.9rem', marginBottom: '0.2rem' }
const personTitle = { fontSize: '0.78rem', fontWeight: 600 }
