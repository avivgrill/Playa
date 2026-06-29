import { useNavigate } from 'react-router-dom'

const PEOPLE = [
  {
    name: 'Aviv Grill',
    title: 'Managing Partner',
    initials: 'AG',
    color: '#1d4ed8',
    tier: 'leadership',
    foodSafetyRole: 'Food Safety Authority',
    responsibilities: [
      'Overall accountability for the Food Safety Management System (FSMS)',
      'Approve food safety policies, procedures, and objectives',
      'Ensure adequate resources are available for food safety activities',
      'Conduct and participate in management review meetings',
      'Authority to initiate product holds, recalls, and withdrawals',
      'Final signatory on food safety policy documents',
    ],
  },
  {
    name: 'Kayde McMullen',
    title: 'Managing Partner',
    initials: 'KM',
    color: '#1d4ed8',
    tier: 'leadership',
    foodSafetyRole: 'Food Safety Authority',
    responsibilities: [
      'Co-accountable for the Food Safety Management System (FSMS)',
      'Approve food safety policies and resource allocations',
      'Oversee customer and co-packing relationships and complaint resolution',
      'Participate in management review and food safety decision-making',
      'Authority to initiate product holds, recalls, and withdrawals',
      'Final signatory on food safety policy documents',
    ],
  },
  {
    name: 'Alfredo Hurtado',
    title: 'Lead Confectioner',
    initials: 'AH',
    color: '#7e22ce',
    tier: 'production_lead',
    foodSafetyRole: 'Food Safety Team Lead',
    responsibilities: [
      'Day-to-day management of the production floor and food safety practices',
      'Implement and monitor HACCP plan and Critical Control Points (CCPs)',
      'Verify cGMP compliance by all production personnel',
      'Lead pre-operational and daily facility inspections',
      'Document production records, ingredient usage, and traceability information',
      'Conduct and document on-the-job food safety training for production staff',
      'Identify and report potential food safety hazards to management',
      'Oversee ingredient receiving inspection and lot documentation',
    ],
  },
  {
    name: 'Evan Tront',
    title: 'Confectioner',
    initials: 'ET',
    color: '#0369a1',
    tier: 'production',
    foodSafetyRole: 'Production Food Safety Participant',
    responsibilities: [
      'Follow all cGMP requirements and food safety procedures',
      'Comply with HACCP monitoring procedures at assigned points',
      'Report any food safety concerns, equipment issues, or non-conformances immediately',
      'Maintain personal hygiene standards as required by policy',
      'Complete all required food safety training and sign acknowledgments',
      'Execute production and packaging activities per documented procedures',
    ],
  },
]

export default function OrgChart() {
  const navigate = useNavigate()
  const leadership = PEOPLE.filter(p => p.tier === 'leadership')
  const lead = PEOPLE.filter(p => p.tier === 'production_lead')
  const production = PEOPLE.filter(p => p.tier === 'production')

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/docs/program')}>← Management Program</button>
      <h1 style={pageTitle}>Organizational Chart & Job Descriptions</h1>
      <p style={sub}>Food Safety Roles, Authority, and Responsibilities · Playa</p>

      {/* Visual chart */}
      <div style={chartWrap}>
        <div style={tierLabel}>Managing Partners — Food Safety Authority</div>
        <div style={partnerRow}>
          {leadership.map(p => <ChartCard key={p.name} person={p} />)}
        </div>
        <div style={connectorDown} />
        <div style={connectorBar} />
        <div style={connectorDown} />
        <div style={tierLabel}>Production Lead — Food Safety Team Lead</div>
        <div style={singleRow}>
          {lead.map(p => <ChartCard key={p.name} person={p} />)}
        </div>
        <div style={connectorDown} />
        <div style={tierLabel}>Production — Food Safety Participants</div>
        <div style={singleRow}>
          {production.map(p => <ChartCard key={p.name} person={p} />)}
        </div>
      </div>

      {/* Job descriptions */}
      <h2 style={sectionHeading}>Food Safety Role Descriptions</h2>
      <p style={sectionSub}>All personnel listed below have defined food safety responsibilities. Role descriptions are reviewed annually or upon change in duties.</p>

      {PEOPLE.map(person => (
        <div key={person.name} style={jobCard}>
          <div style={jobHeader}>
            <div style={{ ...avatarSm, background: person.color }}>{person.initials}</div>
            <div>
              <div style={jobName}>{person.name}</div>
              <div style={jobTitle}>{person.title}</div>
              <span style={{ ...roleBadge, background: person.color + '18', color: person.color }}>{person.foodSafetyRole}</span>
            </div>
          </div>
          <div style={jobDivider} />
          <ul style={jobList}>
            {person.responsibilities.map((r, i) => (
              <li key={i} style={jobListItem}>{r}</li>
            ))}
          </ul>
        </div>
      ))}

      <div style={noteBox}>
        <strong>Note:</strong> In the absence of the Lead Confectioner, food safety monitoring responsibilities are escalated directly to the Managing Partners. All personnel have the authority and obligation to stop production and escalate any potential food safety concern, regardless of role.
      </div>
    </div>
  )
}

function ChartCard({ person }) {
  return (
    <div style={card}>
      <div style={{ ...avatar, background: person.color }}>{person.initials}</div>
      <div style={personName}>{person.name}</div>
      <div style={{ ...personTitle, color: person.color }}>{person.title}</div>
    </div>
  )
}

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1.25rem', padding: 0 }
const pageTitle = { fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }
const sub = { fontSize: '0.875rem', color: '#6b7280', margin: '0.2rem 0 1.75rem' }
const chartWrap = { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }
const tierLabel = { fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: '0.625rem' }
const partnerRow = { display: 'flex', gap: '2.5rem', justifyContent: 'center', flexWrap: 'wrap' }
const singleRow = { display: 'flex', justifyContent: 'center' }
const connectorDown = { width: 2, height: 28, background: '#d1d5db' }
const connectorBar = { width: 180, height: 2, background: '#d1d5db' }
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem 1.5rem', textAlign: 'center', minWidth: 160, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
const avatar = { width: 48, height: 48, borderRadius: '50%', color: '#fff', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.625rem' }
const personName = { fontWeight: 700, color: '#111827', fontSize: '0.9rem', marginBottom: '0.2rem' }
const personTitle = { fontSize: '0.78rem', fontWeight: 600 }
const sectionHeading = { fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '0.3rem', borderTop: '2px solid #e5e7eb', paddingTop: '1.5rem' }
const sectionSub = { fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.25rem', marginTop: 0 }
const jobCard = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const jobHeader = { display: 'flex', alignItems: 'flex-start', gap: '1rem' }
const avatarSm = { width: 40, height: 40, borderRadius: '50%', color: '#fff', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const jobName = { fontWeight: 700, color: '#111827', fontSize: '0.95rem' }
const jobTitle = { fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.3rem' }
const roleBadge = { display: 'inline-block', fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 10 }
const jobDivider = { borderTop: '1px solid #f3f4f6', margin: '0.875rem 0' }
const jobList = { margin: '0 0 0 1.25rem', padding: 0 }
const jobListItem = { fontSize: '0.875rem', color: '#374151', lineHeight: 1.7, marginBottom: '0.25rem' }
const noteBox = { background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#92400e', lineHeight: 1.6, marginTop: '1rem' }
