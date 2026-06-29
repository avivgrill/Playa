import { useNavigate } from 'react-router-dom'

export default function CertificationIntegrity() {
  const navigate = useNavigate()
  return (
    <div style={wrap}>
      <button style={backBtn} onClick={() => navigate('/docs/program')}>← Management Program</button>
      <p style={docLabel}>Policy · Reviewed Annually</p>
      <h1 style={pageTitle}>Certification Integrity Policy</h1>
      <p style={meta}>Playa · Effective upon adoption</p>
      <div style={divider} />

      <Section heading="Purpose">
        This policy establishes Playa's commitment to maintaining the integrity of any food safety or quality certification held by or applied to Playa's facility and products. Certification integrity means that claims of certification — whether on product labels, marketing materials, websites, or in customer communications — accurately reflect the scope and status of Playa's current, verified certification. Misuse of certification marks or false claims of certified status harms consumers, customers, and the credibility of the certification program.
      </Section>

      <Section heading="Scope">
        This policy applies to all certifications held by Playa, including third-party food safety certifications (e.g., ASI, SQF, BRC, GFSI-benchmarked schemes) and any product-level certifications (e.g., organic, kosher, non-GMO). It covers all uses of certification marks, logos, and claims across all channels — product packaging, co-packing customer communications, digital platforms, and promotional materials.
      </Section>

      <Section heading="Certification Mark Usage">
        <p style={body}>Certification marks, logos, and claims may only be used in accordance with the written rules and guidelines of the issuing certification body. Managing Partners are responsible for obtaining, reviewing, and complying with the certification body's trademark usage rules. Specifically:</p>
        <ul style={list}>
          <li style={li}><strong>Permitted use only:</strong> Certification marks may only appear on products, packaging, and materials that are within the verified, current scope of the certification. Using a certification mark on products that have not been audited or that fall outside the certification scope is prohibited.</li>
          <li style={li}><strong>Expiration:</strong> Certification marks must be removed from all materials within the timeframe specified by the certification body if certification lapses, is suspended, or is withdrawn. Continued use of a certification mark after certification expires or is revoked is a serious integrity violation and may constitute fraud.</li>
          <li style={li}><strong>Accuracy:</strong> Any reference to certification status in customer proposals, co-packing agreements, or public communications must accurately state the current certification status, issuing body, and scope. No claim of certification may be made if the certification has not been achieved or has expired.</li>
          <li style={li}><strong>Approval process:</strong> All proposed uses of a certification mark on packaging or materials must be reviewed and approved by a Managing Partner before implementation to ensure compliance with the certification body's rules.</li>
        </ul>
      </Section>

      <Section heading="Product and Process Exclusions">
        <p style={body}>Playa recognizes that not all products or production activities at our facility may be within the scope of any given certification. Managing Partners are responsible for maintaining a clear, documented understanding of:</p>
        <ul style={list}>
          <li style={li}><strong>Certified scope:</strong> The exact products, processes, and facility areas that are covered under each active certification, as defined in the certification certificate and scope statement.</li>
          <li style={li}><strong>Excluded products and processes:</strong> Any products, co-packing activities, or processes explicitly excluded from the certification scope must be clearly identified. Excluded products must never be represented as certified, and certification marks must not appear on their packaging or documentation.</li>
          <li style={li}><strong>Co-packing customer products:</strong> For products produced under co-packing agreements, Playa must clearly communicate to each customer which of their products are within and outside the certification scope. Co-packing customers must not make certification claims about Playa-produced products without Playa's written confirmation that those products are within the current certified scope.</li>
          <li style={li}><strong>Scope changes:</strong> Any addition of new products, ingredients, processes, or co-packing customers must be evaluated for certification scope implications before production begins. Changes that affect the certification scope must be reported to the certification body as required by their rules.</li>
        </ul>
      </Section>

      <Section heading="Unrestricted Auditor Access">
        <p style={body}>Playa is committed to providing unrestricted access to any authorized auditor — whether from a certification body, regulatory authority, or customer — as a fundamental condition of maintaining certification and food safety credibility. This means:</p>
        <ul style={list}>
          <li style={li}><strong>Full facility access:</strong> Auditors must be provided access to all areas of the facility relevant to the certification scope, including production areas, storage areas, receiving and shipping areas, employee facilities, and restrooms.</li>
          <li style={li}><strong>Full record access:</strong> All food safety records, monitoring logs, HACCP records, training records, corrective action records, complaint records, and any other documentation requested by the auditor must be made available promptly and without redaction, except as limited by applicable law.</li>
          <li style={li}><strong>Personnel availability:</strong> Key personnel — including the Lead Confectioner and at least one Managing Partner — must be available to speak with the auditor and respond to questions truthfully and completely.</li>
          <li style={li}><strong>No obstruction:</strong> No employee or manager may attempt to restrict, direct, limit, or influence an auditor's activities beyond the reasonable logistics of escorting them safely through the facility. Coaching employees on what to say to auditors, restricting access to records, or attempting to conceal nonconformances is a serious violation of certification integrity and may result in immediate suspension or withdrawal of certification.</li>
          <li style={li}><strong>Unannounced audits:</strong> Playa recognizes that unannounced audits are a component of many food safety certification programs. Personnel must be trained to receive auditors professionally and to immediately notify a Managing Partner upon an auditor's arrival.</li>
        </ul>
      </Section>

      <Section heading="Responding to Nonconformances">
        When an auditor identifies a nonconformance — whether major or minor — Playa will respond with complete transparency. Managing Partners will accept the finding, document the root cause, develop a documented corrective action plan, implement the corrective actions within the timeframe required by the certification body, and provide evidence of completion. Disputing findings must be done through the certification body's formal appeals process — not by pressuring the auditor during the audit.
      </Section>

      <Section heading="Employee Responsibility">
        All Playa employees must understand that they have an individual responsibility to support certification integrity. Employees must not misrepresent Playa's practices or certification status to any auditor, customer, regulator, or consumer. If an employee is uncertain how to answer an auditor's question, the correct response is to direct the auditor to the Managing Partner — not to guess or provide inaccurate information.
      </Section>

      <div style={approvalBlock}>
        <p style={approvalLabel}>Approved by:</p>
        <div style={sigRow}>
          <SigLine name="Aviv Grill" title="Managing Partner" />
          <SigLine name="Kayde McMullen" title="Managing Partner" />
        </div>
      </div>
    </div>
  )
}

function Section({ heading, children }) {
  return (
    <div style={sectionBox}>
      <h2 style={sectionHeading}>{heading}</h2>
      {typeof children === 'string' ? <p style={body}>{children}</p> : children}
    </div>
  )
}

function SigLine({ name, title }) {
  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ borderBottom: '1.5px solid #374151', height: 40, marginBottom: '0.5rem', width: 200 }} />
      <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.875rem' }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ borderBottom: '1.5px solid #d1d5db', height: 36, width: 140 }} />
      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Date</div>
    </div>
  )
}

const wrap = { maxWidth: 760 }
const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1.25rem', padding: 0 }
const docLabel = { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', margin: 0 }
const pageTitle = { fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: '0.4rem 0 0.25rem' }
const meta = { fontSize: '0.8rem', color: '#9ca3af', margin: 0 }
const divider = { borderTop: '2px solid #e5e7eb', margin: '1.5rem 0' }
const sectionBox = { marginBottom: '1.75rem' }
const sectionHeading = { fontSize: '1rem', fontWeight: 700, color: '#1d4ed8', margin: '0 0 0.625rem', paddingBottom: '0.375rem', borderBottom: '1px solid #eff6ff' }
const body = { fontSize: '0.9rem', color: '#374151', lineHeight: 1.8, margin: '0 0 0.75rem' }
const list = { margin: '0.25rem 0 0.75rem 1.25rem', padding: 0 }
const li = { fontSize: '0.9rem', color: '#374151', lineHeight: 1.75, marginBottom: '0.25rem' }
const approvalBlock = { borderTop: '2px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '1rem' }
const approvalLabel = { fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }
const sigRow = { display: 'flex', gap: '3rem', flexWrap: 'wrap' }
