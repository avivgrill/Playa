import { useNavigate } from 'react-router-dom'

export default function DocumentControl() {
  const navigate = useNavigate()
  return (
    <div style={wrap}>
      <button style={backBtn} onClick={() => navigate('/docs/program')}>← Management Program</button>
      <p style={docLabel}>Documented Procedure · Reviewed Annually</p>
      <h1 style={pageTitle}>Document and Records Control Procedure</h1>
      <p style={meta}>Playa · Effective upon adoption</p>
      <div style={divider} />

      <Section heading="Purpose">
        This procedure establishes the requirements for creating, reviewing, approving, distributing, maintaining, and retiring all documents and records that form part of Playa's Food Safety Management System (FSMS). Proper document and records control ensures that personnel use only current, approved instructions, that food safety records are accurate and legible, and that all documentation is available for review by regulatory authorities and third-party auditors.
      </Section>

      <Section heading="Scope">
        This procedure applies to all food safety and quality documents and records maintained by Playa, including but not limited to: food safety policies, procedures, work instructions, HACCP plans, monitoring forms, corrective action records, training records, supplier records, production records, and inspection logs.
      </Section>

      <Section heading="Document Control Requirements">
        <SubSection label="Version Control">
          <p style={body}>All controlled documents must include the following identifying information on each page:</p>
          <ul style={list}>
            <li style={li}>Document title and unique identifier</li>
            <li style={li}>Version number or revision date</li>
            <li style={li}>Approval signature(s) and date of approval</li>
            <li style={li}>Review frequency or next scheduled review date</li>
          </ul>
          <p style={body}>When a controlled document is revised, the version number must be incremented, the revision must be approved by management before use, and the previous version must be clearly marked as superseded. Obsolete documents must be removed from all points of use and archived or destroyed to prevent accidental use.</p>
        </SubSection>

        <SubSection label="Document Approval and Review">
          <p style={body}>All food safety policy documents and procedures must be reviewed and approved by at least one Managing Partner before issuance. Documents must be reviewed at minimum annually, or whenever:</p>
          <ul style={list}>
            <li style={li}>A regulatory, ingredient, process, or facility change occurs that may affect food safety</li>
            <li style={li}>A food safety incident, CAPA, or audit finding identifies a gap in the documentation</li>
            <li style={li}>A certification body or regulatory authority identifies a nonconformance</li>
          </ul>
        </SubSection>
      </Section>

      <Section heading="Records Control Requirements">
        <SubSection label="General Requirements">
          <p style={body}>Records provide objective evidence that food safety controls have been executed. All food safety records must be:</p>
          <ul style={list}>
            <li style={li}>Legible, permanent, and accurate — records must be traceable to the specific batch, ingredient lot, or activity they document</li>
            <li style={li}>Completed at the time the activity is performed — never pre-completed or backdated</li>
            <li style={li}>Signed or initialed by the person performing the activity, and by a verifying supervisor where required</li>
            <li style={li}>Retained for the minimum retention period specified for each record type (see retention schedule below)</li>
            <li style={li}>Accessible to management and authorized auditors upon request</li>
          </ul>
        </SubSection>

        <SubSection label="Physical (Paper) Records">
          <p style={body}>For any records completed on paper, the following additional requirements apply:</p>
          <ul style={list}>
            <li style={li}><strong>Permanent ink required:</strong> All entries must be made in permanent ink. Pencil is not permitted for any food safety record.</li>
            <li style={li}><strong>No correction fluid (white-out):</strong> Correction fluid, correction tape, or any product that obscures an original entry is strictly prohibited. Errors must be corrected by drawing a single line through the incorrect entry, writing the correct information adjacent to it, and initialing and dating the correction.</li>
            <li style={li}><strong>Blank fields:</strong> Any field that is not applicable should be marked "N/A." No fields should be left blank.</li>
            <li style={li}><strong>Storage:</strong> Completed paper records must be stored in a clean, dry, pest-protected environment in designated binders or filing systems, organized by date and record type.</li>
          </ul>
        </SubSection>

        <SubSection label="Electronic Records">
          <p style={body}>Electronic records maintained in the Playa production management system (app) or other digital formats must:</p>
          <ul style={list}>
            <li style={li}>Include timestamps and user identification for each entry</li>
            <li style={li}>Be protected against unauthorized modification after submission — once submitted, records should not be editable without an audit trail noting the change, the reason, and the responsible party</li>
            <li style={li}>Be backed up regularly to prevent data loss</li>
            <li style={li}>Be exportable in a readable format for regulatory or audit purposes</li>
            <li style={li}>Be accessible to authorized personnel at the facility at all times</li>
          </ul>
        </SubSection>
      </Section>

      <Section heading="Record Retention Schedule">
        <div style={retentionTable}>
          <div style={retHead}>
            <span style={col1}>Record Type</span>
            <span style={col2}>Minimum Retention</span>
          </div>
          {[
            ['Production batch records and ingredient usage logs', '3 years'],
            ['HACCP monitoring records and CCP logs', '3 years'],
            ['Ingredient receiving and lot traceability records', '3 years'],
            ['Cleaning and sanitation logs', '2 years'],
            ['Pre-operational and daily inspection records', '2 years'],
            ['Corrective action (CAPA) records', '3 years'],
            ['Complaint records', '3 years'],
            ['Employee training records and acknowledgments', 'Duration of employment + 3 years'],
            ['Supplier qualification and approval records', '3 years after relationship ends'],
            ['Recall and withdrawal records', 'Permanent'],
            ['Food safety policies and procedures (superseded versions)', '5 years after supersession'],
            ['Licenses and regulatory registrations', 'Current + 5 years after expiration'],
          ].map(([type, period], i) => (
            <div key={i} style={retRow}>
              <span style={{ ...col1, color: '#374151', fontWeight: 400 }}>{type}</span>
              <span style={{ ...col2, color: '#1d4ed8', fontWeight: 600 }}>{period}</span>
            </div>
          ))}
        </div>
        <p style={note}>Retention periods represent minimums. Records must be retained longer if required by applicable federal, state, or local regulations, or by customer or certification body requirements.</p>
      </Section>

      <Section heading="Secure Storage and Maintenance">
        All records — whether physical or electronic — must be secured against unauthorized access, loss, or tampering. Physical records must be stored in a manner that protects them from moisture, pests, and other physical damage. Electronic records must be access-controlled with appropriate user permissions. Managing Partners are responsible for ensuring that the records system is maintained and that all personnel understand and comply with this procedure.
      </Section>

      <Section heading="Auditor and Regulatory Access">
        Records must be made available upon request to regulatory inspectors (FDA, state/local health department), third-party auditors (including ASI certification auditors), and co-packing customers as specified in their agreements with Playa. Access requests should be directed to a Managing Partner, who will facilitate access in a timely manner.
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
const note = { fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic', margin: '0.5rem 0 0' }
const retentionTable = { border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: '0.5rem' }
const retHead = { display: 'flex', background: '#f9fafb', padding: '0.625rem 0.875rem', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb', fontSize: '0.8rem' }
const retRow = { display: 'flex', padding: '0.625rem 0.875rem', borderBottom: '1px solid #f3f4f6', fontSize: '0.85rem', alignItems: 'flex-start' }
const col1 = { flex: '0 0 62%', paddingRight: '0.75rem', fontWeight: 600 }
const col2 = { flex: 1 }
const approvalBlock = { borderTop: '2px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '1rem' }
const approvalLabel = { fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }
const sigRow = { display: 'flex', gap: '3rem', flexWrap: 'wrap' }
