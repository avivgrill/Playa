import { useNavigate } from 'react-router-dom'

export default function ComplaintsProcedure() {
  const navigate = useNavigate()
  return (
    <div style={wrap}>
      <button style={backBtn} onClick={() => navigate('/docs/program')}>← Management Program</button>
      <p style={docLabel}>Documented Procedure · Reviewed Annually</p>
      <h1 style={pageTitle}>Complaints Management Procedure</h1>
      <p style={meta}>Playa · Effective upon adoption</p>
      <div style={divider} />

      <Section heading="Purpose">
        This procedure establishes the process for receiving, documenting, investigating, and resolving product and food safety complaints in a timely and effective manner. It ensures that all complaints are taken seriously, properly investigated, and used as an opportunity for continuous improvement of the Food Safety Management System.
      </Section>

      <Section heading="Scope">
        This procedure applies to all complaints received from customers, co-packing partners, consumers, and any other external party regarding the safety, quality, or integrity of products manufactured or packaged at Playa.
      </Section>

      <Section heading="Responsible Personnel">
        <ResponsibilityTable rows={[
          ['Managing Partners (Aviv Grill / Kayde McMullen)', 'Overall accountability for complaint resolution; authority to initiate product holds, recalls, or withdrawals; final approval of corrective actions; external communication with customers and partners.'],
          ['Lead Confectioner (Alfredo Hurtado)', 'Initial intake and documentation of complaints; coordination of investigation; root cause analysis; implementation of corrective and preventative actions (CAPAs); trend monitoring.'],
          ['Confectioner (Evan Tront)', 'Provide factual production records and observations relevant to complaint investigation; assist with corrective action implementation on the production floor.'],
        ]} />
        <p style={bodyText}>All complaints received by any employee must be immediately directed to the Lead Confectioner or, in their absence, to a Managing Partner. No employee should attempt to resolve a complaint independently without following this procedure.</p>
      </Section>

      <Section heading="Complaint Intake and Documentation">
        <p style={bodyText}>All complaints — regardless of source (phone, email, in-person, or written) — must be documented within 24 hours of receipt using the Complaint Log. Each entry must include:</p>
        <ul style={list}>
          <li style={li}>Date and time complaint was received</li>
          <li style={li}>Name and contact information of the complainant</li>
          <li style={li}>Product name, batch/lot number, and date of production (if known)</li>
          <li style={li}>Nature of the complaint (safety, quality, foreign material, labeling, allergen, etc.)</li>
          <li style={li}>Detailed description of the complaint as reported</li>
          <li style={li}>Name of the Playa employee who received the complaint</li>
          <li style={li}>Any action taken at time of intake (e.g., product hold initiated)</li>
        </ul>
        <p style={bodyText}>All product safety complaints (including reports of illness, injury, foreign material, or allergen cross-contact) must be escalated immediately to a Managing Partner and documented as a critical complaint requiring priority investigation.</p>
      </Section>

      <Section heading="Investigation Process">
        <p style={bodyText}>The Lead Confectioner is responsible for conducting a thorough investigation within 5 business days of complaint receipt. The investigation shall include:</p>
        <ol style={list}>
          <li style={li}><strong>Record Review:</strong> Pull all relevant production records, ingredient lot numbers, HACCP monitoring logs, cleaning records, and inspection records associated with the implicated batch.</li>
          <li style={li}><strong>Physical Examination:</strong> If a product sample is available or retained, examine it for the reported issue.</li>
          <li style={li}><strong>Personnel Interviews:</strong> Interview production staff involved in the manufacture and packaging of the implicated product.</li>
          <li style={li}><strong>Root Cause Analysis:</strong> Conduct a documented root cause analysis to identify the underlying cause(s) of the complaint. Use the "5 Whys" or fishbone diagram method as appropriate.</li>
          <li style={li}><strong>Risk Assessment:</strong> Assess whether the root cause represents a food safety risk requiring product hold, recall, or regulatory notification.</li>
        </ol>
      </Section>

      <Section heading="Corrective and Preventative Actions (CAPA)">
        Based on the root cause analysis, the Lead Confectioner shall develop and implement documented corrective and preventative actions to eliminate the cause of the complaint and prevent recurrence. CAPAs must:
        <ul style={list}>
          <li style={li}>Clearly state the identified root cause</li>
          <li style={li}>Describe the corrective action taken to address the immediate issue</li>
          <li style={li}>Describe the preventative action taken to prevent recurrence</li>
          <li style={li}>Identify the person(s) responsible for implementation</li>
          <li style={li}>Include a target completion date and verification method</li>
          <li style={li}>Be signed off by a Managing Partner upon completion</li>
        </ul>
        All CAPAs are logged in the corrective actions system and are subject to follow-up review to verify effectiveness.
      </Section>

      <Section heading="Trend Analysis">
        The Lead Confectioner shall review all complaint records on a quarterly basis to identify any recurring trends or patterns. Trend analysis results shall be presented to management at the next management review meeting. If a trend indicates a systemic food safety issue, management must be notified immediately and a preventative action plan must be initiated without delay.
      </Section>

      <Section heading="Customer Communication">
        The Managing Partners are responsible for communicating the outcome of the investigation and any corrective actions taken to the complainant in a timely manner — typically within 10 business days of complaint receipt, unless regulatory authorities require earlier notification.
      </Section>

      <Section heading="Record Retention">
        All complaint records — including the intake log, investigation findings, root cause analysis, CAPA documentation, and customer communications — shall be retained for a minimum of 3 years, or longer if required by applicable regulations or customer contracts.
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
      {typeof children === 'string'
        ? <p style={bodyText}>{children}</p>
        : children}
    </div>
  )
}

function ResponsibilityTable({ rows }) {
  return (
    <div style={table}>
      <div style={tableHead}>
        <span style={{ flex: '0 0 38%' }}>Role / Individual</span>
        <span style={{ flex: 1 }}>Responsibilities</span>
      </div>
      {rows.map(([role, resp], i) => (
        <div key={i} style={tableRow}>
          <span style={{ flex: '0 0 38%', fontWeight: 600, color: '#374151', fontSize: '0.85rem', paddingRight: '0.75rem' }}>{role}</span>
          <span style={{ flex: 1, fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>{resp}</span>
        </div>
      ))}
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
const bodyText = { fontSize: '0.9rem', color: '#374151', lineHeight: 1.8, margin: '0 0 0.75rem' }
const list = { margin: '0.25rem 0 0.75rem 1.25rem', padding: 0 }
const li = { fontSize: '0.9rem', color: '#374151', lineHeight: 1.75, marginBottom: '0.25rem' }
const table = { border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: '1rem', fontSize: '0.875rem' }
const tableHead = { display: 'flex', background: '#f9fafb', padding: '0.625rem 0.875rem', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb', fontSize: '0.8rem' }
const tableRow = { display: 'flex', padding: '0.75rem 0.875rem', borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start' }
const approvalBlock = { borderTop: '2px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '1rem' }
const approvalLabel = { fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }
const sigRow = { display: 'flex', gap: '3rem', flexWrap: 'wrap' }
