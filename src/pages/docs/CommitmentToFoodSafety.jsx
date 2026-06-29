import { useNavigate } from 'react-router-dom'

export default function CommitmentToFoodSafety() {
  const navigate = useNavigate()
  return (
    <div style={wrap}>
      <button style={backBtn} onClick={() => navigate('/docs/program')}>← Management Program</button>

      <p style={docLabel}>Official Policy · Reviewed Annually</p>
      <h1 style={pageTitle}>Commitment to Food Safety</h1>
      <p style={meta}>Playa · Effective upon adoption</p>

      <div style={divider} />

      {SECTIONS.map((sec, i) => (
        <div key={i} style={section}>
          {sec.heading && <h2 style={heading}>{sec.heading}</h2>}
          <p style={body}>{sec.body}</p>
        </div>
      ))}

      <div style={divider} />

      <div style={section}>
        <h2 style={heading}>Management Responsibilities</h2>
        <p style={body}>The managing partners of Playa maintain direct accountability for the Food Safety Management System and are committed to providing the leadership, resources, and support necessary for its effective operation. Specifically, management commits to:</p>
        <ul style={list}>
          <li style={listItem}>Establishing, documenting, implementing, and maintaining the Food Safety Management System (FSMS) and continually improving its effectiveness.</li>
          <li style={listItem}>Ensuring that food safety objectives are established and are consistent with company policy.</li>
          <li style={listItem}>Communicating to all employees the importance of meeting customer, legal, and regulatory requirements as they relate to food safety.</li>
          <li style={listItem}>Conducting management reviews and ensuring the results of those reviews lead to improvements in the system.</li>
          <li style={listItem}>Ensuring the availability of adequate resources — including personnel, equipment, and training — to achieve food safety goals.</li>
          <li style={listItem}>Fostering a positive food safety culture in which all employees feel empowered and responsible for maintaining safe food practices.</li>
          <li style={listItem}>Reviewing this commitment statement, all food safety policies, and the FSMS at least annually, or whenever significant changes occur.</li>
        </ul>
      </div>

      <div style={section}>
        <h2 style={heading}>Food Safety Culture</h2>
        <p style={body}>Playa is committed to building and maintaining a positive food safety culture. This means that food safety is not just a set of rules — it is a shared value embedded in everything we do. Management actively promotes this culture by:</p>
        <ul style={list}>
          <li style={listItem}>Modeling safe food handling behaviors at all levels of the organization.</li>
          <li style={listItem}>Encouraging employees to raise food safety concerns without fear of reprisal.</li>
          <li style={listItem}>Recognizing and reinforcing positive food safety behaviors.</li>
          <li style={listItem}>Ensuring that food safety training is practical, accessible, and delivered in a language understood by all staff.</li>
          <li style={listItem}>Integrating food safety into daily operations, production planning, and facility decisions.</li>
        </ul>
      </div>

      <div style={section}>
        <h2 style={heading}>Posting and Accessibility</h2>
        <p style={body}>This Commitment to Food Safety statement is posted prominently within the facility and is made readily available to all staff and visitors at all times. It is also accessible digitally through the company's production management system. All employees are informed of this commitment during onboarding and through annual refresher training.</p>
      </div>

      <div style={divider} />

      <div style={sigBlock}>
        <p style={sigIntro}>This commitment is endorsed and signed by the managing partners of Playa:</p>
        <div style={sigRow}>
          <div style={sigItem}>
            <div style={sigLine} />
            <div style={sigName}>Aviv Grill</div>
            <div style={sigTitle}>Managing Partner</div>
          </div>
          <div style={sigItem}>
            <div style={sigLine} />
            <div style={sigName}>Kayde McMullen</div>
            <div style={sigTitle}>Managing Partner</div>
          </div>
        </div>
        <div style={sigDateRow}>
          <div style={sigDateItem}>
            <div style={sigDateLine} />
            <div style={sigDateLabel}>Date</div>
          </div>
          <div style={sigDateItem}>
            <div style={sigDateLine} />
            <div style={sigDateLabel}>Date</div>
          </div>
        </div>
        <p style={reviewNote}>This document must be reviewed and re-signed at least annually.</p>
      </div>
    </div>
  )
}

const SECTIONS = [
  {
    heading: null,
    body: 'At Playa, the safety of every product we make is our highest responsibility. We are a candy production and co-packing operation committed to producing safe, wholesome food for all customers and co-packing partners. This commitment is not aspirational — it is a binding obligation that shapes every decision we make, from sourcing ingredients to shipping finished goods.',
  },
  {
    heading: 'Our Commitment',
    body: 'Playa commits to designing, operating, and continuously improving a Food Safety Management System (FSMS) that meets or exceeds all applicable regulatory requirements, including current Good Manufacturing Practices (cGMPs), HACCP principles, and any customer or third-party certification standards applicable to our operation.\n\nWe commit to preventing food safety hazards — biological, chemical, and physical — at every stage: receiving, storage, production, packaging, and distribution. No business objective, timeline, or customer pressure will ever take precedence over food safety.',
  },
  {
    heading: 'Food Safety Is Everyone\'s Responsibility',
    body: 'Every person who enters our facility — employees, temporary workers, contractors, and visitors — plays a role in food safety. All personnel are required to follow established cGMP practices, complete required training, report any food safety concerns immediately to management, and take personal ownership of maintaining a safe production environment.\n\nAny employee who identifies a potential food safety issue has both the right and the obligation to stop production if necessary and report the concern to the Lead Confectioner or managing partners without fear of retaliation.',
  },
  {
    heading: 'Traceability and Transparency',
    body: 'We maintain complete forward and backward traceability for all ingredients and finished products. In the event of a food safety concern, we are prepared to act swiftly — including initiating a product hold, recall, or withdrawal — to protect consumers and uphold our integrity. Customer, billing, receiving, manufacturing, and shipping records are maintained in our production management system and are accessible to responsible employees at all times.',
  },
]

const wrap = { maxWidth: 720, margin: '0 auto' }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1.25rem', padding: 0 }
const docLabel = { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', margin: 0 }
const pageTitle = { fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: '0.4rem 0 0.25rem', lineHeight: 1.2 }
const meta = { fontSize: '0.8rem', color: '#9ca3af', margin: 0 }
const divider = { borderTop: '2px solid #e5e7eb', margin: '1.75rem 0' }
const section = { marginBottom: '1.5rem' }
const heading = { fontSize: '1rem', fontWeight: 700, color: '#1d4ed8', margin: '0 0 0.5rem' }
const body = { fontSize: '0.9rem', color: '#374151', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }
const list = { margin: '0.5rem 0 0 1.25rem', padding: 0 }
const listItem = { fontSize: '0.9rem', color: '#374151', lineHeight: 1.8, marginBottom: '0.375rem' }
const sigBlock = { marginTop: '0.5rem' }
const sigIntro = { fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }
const sigRow = { display: 'flex', gap: '3rem', flexWrap: 'wrap', marginBottom: '1rem' }
const sigItem = { minWidth: 200 }
const sigLine = { borderBottom: '1.5px solid #374151', height: 40, marginBottom: '0.5rem' }
const sigName = { fontWeight: 700, color: '#111827', fontSize: '0.9rem' }
const sigTitle = { fontSize: '0.78rem', color: '#6b7280' }
const sigDateRow = { display: 'flex', gap: '3rem', flexWrap: 'wrap', marginTop: '0.5rem' }
const sigDateItem = { minWidth: 200 }
const sigDateLine = { borderBottom: '1.5px solid #d1d5db', height: 40, marginBottom: '0.5rem', width: 140 }
const sigDateLabel = { fontSize: '0.78rem', color: '#9ca3af' }
const reviewNote = { fontSize: '0.78rem', color: '#9ca3af', fontStyle: 'italic', marginTop: '1.25rem' }
