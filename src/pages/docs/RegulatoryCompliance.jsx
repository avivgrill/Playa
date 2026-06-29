import { useNavigate } from 'react-router-dom'

export default function RegulatoryCompliance() {
  const navigate = useNavigate()
  return (
    <div style={wrap}>
      <button style={backBtn} onClick={() => navigate('/docs/program')}>← Management Program</button>
      <p style={docLabel}>Policy · Reviewed Annually</p>
      <h1 style={pageTitle}>Licenses, Registrations, and Regulatory Compliance</h1>
      <p style={meta}>Playa · Effective upon adoption</p>
      <div style={divider} />

      <Section heading="Purpose">
        This policy establishes Playa's commitment to identifying, obtaining, maintaining, and making readily available all licenses, permits, and registrations required to legally operate as a food manufacturer and co-packing facility. Maintaining current regulatory compliance is a prerequisite to certification and a legal and ethical obligation.
      </Section>

      <Section heading="Scope">
        This policy applies to all federal, state, and local licenses, permits, registrations, and certifications required to lawfully produce, package, store, and distribute food products at Playa's facility.
      </Section>

      <Section heading="Applicable License and Registration Categories">
        <SubSection label="Federal Requirements">
          <p style={body}>All facilities that manufacture, process, pack, or hold food for human consumption in the United States are required to register with the U.S. Food and Drug Administration (FDA) under 21 CFR Part 1, Subpart H. Playa must:</p>
          <ul style={list}>
            <li style={li}>Maintain a current FDA Food Facility Registration</li>
            <li style={li}>Renew the registration biennially (in even-numbered years, between October 1 and December 31)</li>
            <li style={li}>Update the registration within 60 days of any changes to the facility, ownership, or the activities performed</li>
            <li style={li}>Ensure the registration number is available for verification upon regulatory request</li>
          </ul>
          <p style={body}>Playa is also subject to FDA's Current Good Manufacturing Practice, Hazard Analysis, and Risk-Based Preventive Controls for Human Food (21 CFR Part 117 — the Preventive Controls Rule) as a registered food facility.</p>
        </SubSection>
        <SubSection label="State Requirements">
          <p style={body}>In addition to federal requirements, Playa must maintain all applicable state-level food manufacturing and processing licenses and permits. Requirements vary by state and may include:</p>
          <ul style={list}>
            <li style={li}>State food manufacturer or food processor license</li>
            <li style={li}>Cottage food or commercial kitchen permits (if applicable based on the production type and location)</li>
            <li style={li}>State health department food facility inspection certificates</li>
            <li style={li}>State department of agriculture registration (for applicable product categories)</li>
          </ul>
          <p style={body}>Managing Partners are responsible for identifying all current state requirements applicable to Playa's facility location and product categories, and for ensuring all state licenses are current and posted as required.</p>
        </SubSection>
        <SubSection label="Local Requirements">
          <p style={body}>Playa must maintain all required local (city and county) business licenses, zoning permits, and food facility permits, which may include:</p>
          <ul style={list}>
            <li style={li}>City or county business license</li>
            <li style={li}>Local health department food facility permit</li>
            <li style={li}>Certificate of occupancy for the production facility (where required)</li>
            <li style={li}>Any fire, building, or environmental permits required for food production operations</li>
          </ul>
        </SubSection>
      </Section>

      <Section heading="License Maintenance Requirements">
        <p style={body}>To ensure uninterrupted compliance, Managing Partners must:</p>
        <ul style={list}>
          <li style={li}><strong>Track renewal dates:</strong> Maintain a license register (see below) that records all current licenses, their issuing authority, expiration dates, and renewal timelines. The register must be reviewed at minimum annually and whenever a license is added or renewed.</li>
          <li style={li}><strong>Renew proactively:</strong> Initiate renewal processes at least 60 days before any license expiration to ensure continuity without gaps in compliance.</li>
          <li style={li}><strong>Notify promptly:</strong> If a license lapses, expires, or is suspended for any reason, production and co-packing activities affected by that license must be suspended immediately until the license is reinstated. The Lead Confectioner and all co-packing customers must be notified without delay.</li>
          <li style={li}><strong>Post as required:</strong> Licenses that are required by law to be posted must be displayed in the appropriate location within the facility, visible to inspectors and employees.</li>
        </ul>
      </Section>

      <Section heading="License Register">
        <p style={body}>Playa maintains a License Register documenting all required licenses and registrations. The register is a controlled document reviewed by management at the annual FSMS review. Each entry includes:</p>
        <div style={regTable}>
          <div style={regHead}>
            <span style={rc1}>License / Permit</span>
            <span style={rc2}>Issuing Authority</span>
            <span style={rc3}>Renewal Frequency</span>
            <span style={rc3}>Location on File</span>
          </div>
          {[
            ['FDA Food Facility Registration', 'U.S. FDA', 'Biennial (even years)', 'Digital — Mgmt records'],
            ['State Food Manufacturer License', 'State Dept. of Public Health / Ag', 'Annual or as required', 'Physical + Digital'],
            ['Local Business License', 'City / County', 'Annual', 'Physical — posted'],
            ['Local Health Department Permit', 'Local Health Dept.', 'Annual', 'Physical — posted'],
            ['Third-party Certification (e.g., ASI)', 'Certification Body', 'Annual audit cycle', 'Digital — Mgmt records'],
          ].map(([lic, auth, freq, loc], i) => (
            <div key={i} style={regRow}>
              <span style={{ ...rc1, fontWeight: 600 }}>{lic}</span>
              <span style={rc2}>{auth}</span>
              <span style={rc3}>{freq}</span>
              <span style={rc3}>{loc}</span>
            </div>
          ))}
        </div>
        <p style={note}>Actual license numbers, issue dates, and expiration dates are maintained in the physical and digital license files, not in this policy document. The above table reflects license categories; specific entries are updated as licenses are issued or renewed.</p>
      </Section>

      <Section heading="Regulatory Inspection Readiness">
        Playa's licenses and regulatory registrations, along with all food safety records, must be readily accessible for review during announced and unannounced regulatory inspections. Managing Partners are the primary contacts for regulatory inspectors. In the event of an unannounced inspection, the Lead Confectioner or any on-site employee must immediately notify a Managing Partner and cooperate fully with the inspector. Refusal to provide access to records or the facility to an authorized regulatory inspector is not permitted.
      </Section>

      <Section heading="Co-Packing Customer Requirements">
        Some co-packing customers or their certification bodies may require Playa to hold specific licenses or certifications as a condition of the co-packing agreement. Managing Partners are responsible for reviewing co-packing contracts to identify and fulfill any such requirements and for notifying customers promptly if a required license is at risk of lapsing.
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

function SubSection({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3 style={subHeading}>{label}</h3>
      {children}
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
const sectionHeading = { fontSize: '1rem', fontWeight: 700, color: '#1d4ed8', margin: '0 0 0.75rem', paddingBottom: '0.375rem', borderBottom: '1px solid #eff6ff' }
const subHeading = { fontSize: '0.875rem', fontWeight: 700, color: '#374151', margin: '0 0 0.375rem' }
const body = { fontSize: '0.9rem', color: '#374151', lineHeight: 1.8, margin: '0 0 0.75rem' }
const list = { margin: '0.25rem 0 0.75rem 1.25rem', padding: 0 }
const li = { fontSize: '0.9rem', color: '#374151', lineHeight: 1.75, marginBottom: '0.25rem' }
const note = { fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.5rem' }
const regTable = { border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: '0.375rem' }
const regHead = { display: 'flex', background: '#f9fafb', padding: '0.625rem 0.875rem', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem' }
const regRow = { display: 'flex', padding: '0.6rem 0.875rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.82rem', color: '#374151', alignItems: 'flex-start' }
const rc1 = { flex: '0 0 28%', paddingRight: '0.5rem' }
const rc2 = { flex: '0 0 26%', paddingRight: '0.5rem' }
const rc3 = { flex: 1, paddingRight: '0.5rem' }
const approvalBlock = { borderTop: '2px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '1rem' }
const approvalLabel = { fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }
const sigRow = { display: 'flex', gap: '3rem', flexWrap: 'wrap' }
