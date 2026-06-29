export default function CommitmentToFoodSafety() {
  return (
    <div style={wrap}>
      <p style={docLabel}>Official Policy Document</p>
      <h1 style={pageTitle}>Commitment to Food Safety</h1>
      <p style={meta}>Playa · Effective upon adoption · Reviewed annually</p>

      <div style={divider} />

      {SECTIONS.map((sec, i) => (
        <div key={i} style={section}>
          {sec.heading && <h2 style={heading}>{sec.heading}</h2>}
          <p style={body}>{sec.body}</p>
        </div>
      ))}

      <div style={divider} />

      <div style={sigBlock}>
        <p style={sigIntro}>This commitment is endorsed by the managing partners of Playa:</p>
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
      </div>
    </div>
  )
}

const SECTIONS = [
  {
    heading: null,
    body: 'At Playa, the safety and quality of every product we make is our highest responsibility. We are a candy production company and co-packing operation, and we recognize that the trust our customers and partners place in us depends entirely on our unwavering commitment to producing safe, wholesome food.',
  },
  {
    heading: 'Our Commitment',
    body: 'We commit to operating in full compliance with all applicable food safety regulations, including Current Good Manufacturing Practices (cGMP), and to maintaining systems that prevent contamination, adulteration, and foodborne illness at every stage of production — from receiving raw ingredients through packaging and delivery.',
  },
  {
    heading: 'Food Safety Is Everyone\'s Responsibility',
    body: 'Every member of our team — from the managing partners to every person on the production floor — plays a critical role in food safety. We expect all employees to follow established procedures, report any concerns immediately, and take personal ownership of maintaining a clean, safe, and compliant production environment.\n\nNo production schedule, sales pressure, or operational convenience will ever justify compromising food safety.',
  },
  {
    heading: 'Continuous Improvement',
    body: 'We are committed to continuously improving our food safety practices. This means regularly reviewing and updating our procedures, providing ongoing training to all staff, responding promptly to corrective actions, and staying current with industry standards and regulatory requirements.',
  },
  {
    heading: 'Transparency and Traceability',
    body: 'We maintain complete traceability of all ingredients and finished products. In the event of a food safety concern, we are prepared to act quickly and decisively — including initiating a recall if necessary — to protect our customers and uphold our integrity.',
  },
  {
    heading: 'Our Promise',
    body: 'We promise to every customer, client, and co-packing partner: the products that leave our facility meet the highest standards of safety and quality. This is not just a policy — it is a reflection of who we are and how we operate every single day.',
  },
]

const wrap = { maxWidth: 720, margin: '0 auto' }
const docLabel = { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', margin: 0 }
const pageTitle = { fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: '0.4rem 0 0.25rem', lineHeight: 1.2 }
const meta = { fontSize: '0.8rem', color: '#9ca3af', margin: 0 }
const divider = { borderTop: '2px solid #e5e7eb', margin: '1.75rem 0' }
const section = { marginBottom: '1.5rem' }
const heading = { fontSize: '1rem', fontWeight: 700, color: '#1d4ed8', margin: '0 0 0.5rem' }
const body = { fontSize: '0.925rem', color: '#374151', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }
const sigBlock = { marginTop: '0.5rem' }
const sigIntro = { fontSize: '0.875rem', color: '#6b7280', marginBottom: '2rem' }
const sigRow = { display: 'flex', gap: '3rem', flexWrap: 'wrap' }
const sigItem = { minWidth: 200 }
const sigLine = { borderBottom: '1.5px solid #374151', height: 40, marginBottom: '0.5rem' }
const sigName = { fontWeight: 700, color: '#111827', fontSize: '0.9rem' }
const sigTitle = { fontSize: '0.78rem', color: '#6b7280' }
