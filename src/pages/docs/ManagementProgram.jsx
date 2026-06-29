import { useNavigate } from 'react-router-dom'

const DOCS = [
  {
    title: 'Commitment to Food Safety',
    path: '/docs/commitment',
    desc: 'Company food safety statement, management responsibilities, food safety culture, and traceability commitment.',
    tag: 'Management Commitment · Req. a',
    color: '#1d4ed8',
  },
  {
    title: 'Organizational Chart & Job Descriptions',
    path: '/docs/org-chart',
    desc: 'Reporting structure, food safety roles, authority, and individual responsibilities for all personnel.',
    tag: 'Management Commitment · Req. b',
    color: '#1d4ed8',
  },
  {
    title: 'Complaints Management Procedure',
    path: '/docs/complaints',
    desc: 'Intake, investigation, root cause analysis, CAPA, trend monitoring, and customer communication for all complaints.',
    tag: 'Complaints Management · Req. a–c',
    color: '#7e22ce',
  },
  {
    title: 'Document and Records Control',
    path: '/docs/document-control',
    desc: 'Version control, approval, secure storage, electronic record requirements, physical record requirements (permanent ink, no white-out), and retention schedule.',
    tag: 'Document & Records Control · Req. a–d',
    color: '#0369a1',
  },
  {
    title: 'Employee Training Program',
    path: '/docs/training',
    desc: 'Training matrix, cGMP / HACCP / Food Defense requirements, refresher schedule, trainer qualifications, language access, and acknowledgment signatures.',
    tag: 'Training Program · Req. a–f',
    color: '#0369a1',
  },
  {
    title: 'Licenses and Regulatory Compliance',
    path: '/docs/regulatory',
    desc: 'Federal, state, and local license requirements, renewal tracking, license register, and regulatory inspection readiness.',
    tag: 'Licenses & Registrations',
    color: '#065f46',
  },
  {
    title: 'Certification Integrity Policy',
    path: '/docs/certification',
    desc: 'Certification mark usage rules, product and process scope, exclusions, and unrestricted auditor access requirements.',
    tag: 'Certification Integrity · Req. a–c',
    color: '#92400e',
  },
  {
    title: 'cGMP & Operational Standards Manual',
    path: '/docs/cgmp',
    desc: 'Comprehensive operational standards covering allergen control, personnel hygiene, facility and equipment requirements, cleaning and sanitation, pest control, supplier approval, traceability, recall procedures, food defense, and more — specific to M&M-style candy and gummy production.',
    tag: 'Operational Requirements · Full cGMP',
    color: '#374151',
  },
]

export default function ManagementProgram() {
  const navigate = useNavigate()
  return (
    <div style={wrap}>
      <p style={supra}>Documentation</p>
      <h1 style={pageTitle}>Management Commitment Program</h1>
      <p style={sub}>All policies, procedures, and programs required for food safety certification. Select any document to view or print.</p>
      <div style={divider} />

      <div style={grid}>
        {DOCS.map(doc => (
          <button key={doc.path} style={card} onClick={() => navigate(doc.path)}>
            <div style={{ ...tagChip, background: doc.color + '12', color: doc.color }}>{doc.tag}</div>
            <div style={cardTitle}>{doc.title}</div>
            <div style={cardDesc}>{doc.desc}</div>
            <div style={arrow}>View →</div>
          </button>
        ))}
      </div>

      <div style={noteBox}>
        <strong>Annual Review Requirement:</strong> All documents in this program must be reviewed and re-approved by the Managing Partners at minimum annually, or whenever a significant change occurs in the facility, product scope, personnel, regulations, or certification requirements.
      </div>
    </div>
  )
}

const wrap = { maxWidth: 860 }
const supra = { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', margin: 0 }
const pageTitle = { fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: '0.3rem 0 0.4rem' }
const sub = { fontSize: '0.9rem', color: '#6b7280', margin: '0 0 0.25rem', lineHeight: 1.6 }
const divider = { borderTop: '2px solid #e5e7eb', margin: '1.25rem 0' }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }
const card = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
  padding: '1.25rem', textAlign: 'left', cursor: 'pointer',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}
const tagChip = { display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 6, width: 'fit-content' }
const cardTitle = { fontSize: '1rem', fontWeight: 700, color: '#111827', lineHeight: 1.3 }
const cardDesc = { fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.6, flex: 1 }
const arrow = { fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600, marginTop: '0.25rem' }
const noteBox = { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#92400e', lineHeight: 1.6, marginTop: '1.25rem' }
