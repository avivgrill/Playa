import { useNavigate } from 'react-router-dom'

export default function TrainingProgram() {
  const navigate = useNavigate()
  return (
    <div style={wrap}>
      <button style={backBtn} onClick={() => navigate('/docs/program')}>← Management Program</button>
      <p style={docLabel}>Documented Program · Reviewed Annually</p>
      <h1 style={pageTitle}>Employee Training Program</h1>
      <p style={meta}>Playa · Effective upon adoption</p>
      <div style={divider} />

      <Section heading="Purpose">
        This training program establishes the requirements for ensuring that all Playa personnel who handle food, ingredients, or food-contact surfaces are trained in current Good Manufacturing Practices (cGMPs), food safety principles, and any other topics required for their role. Adequate training is a fundamental component of Playa's Food Safety Management System and is required to maintain our food safety certification.
      </Section>

      <Section heading="Scope">
        This program applies to all Playa employees — full-time, part-time, temporary, and seasonal — as well as contractors or visitors who may be present in production or storage areas. Training requirements are tiered based on role and level of food handling responsibility.
      </Section>

      <Section heading="Required Training by Role">
        <p style={body}>All personnel must complete training appropriate to their food safety responsibilities. The table below summarizes the minimum required training for each role. Additional training may be required based on assigned duties, audit findings, or regulatory changes.</p>
        <div style={matrixTable}>
          <div style={matHead}>
            <span style={col1h}>Training Topic</span>
            <span style={colh}>Mgmt Partners</span>
            <span style={colh}>Lead Confectioner</span>
            <span style={colh}>Confectioner</span>
          </div>
          {MATRIX.map(([topic, mgmt, lead, prod], i) => (
            <div key={i} style={matRow}>
              <span style={col1r}>{topic}</span>
              <span style={colr}>{check(mgmt)}</span>
              <span style={colr}>{check(lead)}</span>
              <span style={colr}>{check(prod)}</span>
            </div>
          ))}
        </div>
        <p style={note}>✓ = Required   A = Awareness level   — = Not required</p>
      </Section>

      <Section heading="Training on cGMPs, HACCP, and Food Defense">
        <SubSection label="Current Good Manufacturing Practices (cGMPs)">
          <p style={body}>All production personnel must receive cGMP training before beginning work in any food production or storage area and annually thereafter. cGMP training must cover at minimum:</p>
          <ul style={list}>
            <li style={li}>Personal hygiene requirements: handwashing procedures, illness and injury reporting, hair restraints, prohibited jewelry, and appropriate attire</li>
            <li style={li}>Prohibition on eating, drinking, chewing gum, or tobacco use in production and storage areas</li>
            <li style={li}>Proper food handling and cross-contamination prevention</li>
            <li style={li}>Allergen awareness and control measures</li>
            <li style={li}>Pest control awareness and reporting</li>
            <li style={li}>Proper use and storage of chemicals and cleaning agents</li>
            <li style={li}>Temperature control and storage requirements for ingredients and finished goods</li>
          </ul>
        </SubSection>
        <SubSection label="HACCP and Food Safety Hazard Awareness">
          <p style={body}>All production personnel must receive training on the principles of Hazard Analysis and Critical Control Points (HACCP) as they apply to Playa's production processes. This training must cover:</p>
          <ul style={list}>
            <li style={li}>The concept of biological, chemical, and physical food safety hazards</li>
            <li style={li}>Playa's identified Critical Control Points (CCPs) and the associated critical limits</li>
            <li style={li}>Monitoring procedures at each CCP and how to document them correctly</li>
            <li style={li}>Corrective actions to take when a critical limit is not met</li>
            <li style={li}>How to escalate a food safety concern to management</li>
          </ul>
          <p style={body}>The Lead Confectioner must hold or be working toward a recognized HACCP certification (e.g., PCQI, SQF Practitioner, or equivalent).</p>
        </SubSection>
        <SubSection label="Food Defense Awareness">
          <p style={body}>All personnel must receive basic food defense awareness training, including:</p>
          <ul style={list}>
            <li style={li}>The concept of intentional adulteration and why food defense matters</li>
            <li style={li}>Facility access control procedures and reporting unfamiliar persons in production areas</li>
            <li style={li}>Recognizing and reporting suspicious behavior or tampering</li>
            <li style={li}>Proper handling and storage of food-grade chemicals and ingredients to prevent unauthorized access</li>
          </ul>
        </SubSection>
      </Section>

      <Section heading="Training Matrix and Records">
        <p style={body}>Playa maintains a Training Matrix that documents each employee's required training topics, completion dates, trainer information, and next scheduled refresher date. The Training Matrix is a controlled document maintained by the Lead Confectioner and reviewed annually by management.</p>
        <p style={body}>For each completed training event, the following must be recorded:</p>
        <ul style={list}>
          <li style={li}>Employee name and job title</li>
          <li style={li}>Training topic and method (in-person, on-the-job, video, external course, etc.)</li>
          <li style={li}>Date of training and duration</li>
          <li style={li}>Name and qualifications of the trainer</li>
          <li style={li}>Employee acknowledgment signature (see below)</li>
          <li style={li}>Managing Partner or Lead Confectioner sign-off confirming training was conducted</li>
        </ul>
        <p style={body}>Training records are retained for the duration of employment plus three years and are made available to auditors and regulatory authorities upon request.</p>
      </Section>

      <Section heading="Refresher Training">
        <p style={body}>Refresher training is required for all personnel on the following schedule, and additionally at any time that:</p>
        <ul style={list}>
          <li style={li}>An employee's performance or behavior indicates that they have not retained required knowledge</li>
          <li style={li}>An audit finding, corrective action, or food safety incident identifies a training gap</li>
          <li style={li}>A significant change occurs in a process, ingredient, product, facility, or regulatory requirement</li>
          <li style={li}>An employee is assigned new duties or responsibilities</li>
        </ul>
        <div style={freqTable}>
          <div style={matHead}>
            <span style={{ flex: '0 0 55%', fontWeight: 700 }}>Training Topic</span>
            <span style={{ flex: 1, fontWeight: 700 }}>Frequency</span>
          </div>
          {[
            ['cGMP (all production staff)', 'Annual'],
            ['HACCP awareness (all production staff)', 'Annual'],
            ['Food defense awareness (all staff)', 'Annual'],
            ['Allergen control (all production staff)', 'Annual'],
            ['HACCP certification (Lead Confectioner)', 'Per certification body requirements'],
            ['New employee — all applicable topics', 'Before starting work in production areas'],
          ].map(([topic, freq], i) => (
            <div key={i} style={matRow}>
              <span style={{ flex: '0 0 55%', fontSize: '0.85rem', color: '#374151' }}>{topic}</span>
              <span style={{ flex: 1, fontSize: '0.85rem', color: '#374151' }}>{freq}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section heading="Trainer Qualifications">
        Personnel who deliver food safety training at Playa must have demonstrated competency in the subject matter they teach. Specifically:
        <ul style={list}>
          <li style={li}>cGMP and food handling training must be delivered by the Lead Confectioner or a Managing Partner, or by a recognized external training provider.</li>
          <li style={li}>HACCP training must be delivered by a person with a recognized HACCP qualification or equivalent demonstrated experience, or by an external certified trainer.</li>
          <li style={li}>Food defense training may be delivered using approved resources (e.g., FDA ALERT training materials) or by the Lead Confectioner or a Managing Partner.</li>
          <li style={li}>All trainers must document their own qualifications and those qualifications must be retained on file.</li>
        </ul>
      </Section>

      <Section heading="Language Requirements">
        Training must be delivered in a language that each employee understands. Where English is not an employee's primary language, training materials and instruction must be provided in the employee's primary language or with appropriate translation support. Management is responsible for ensuring that language is never a barrier to food safety understanding. Playa currently supports training delivery in English and Spanish. Acknowledgment signatures confirm that training was understood, not merely attended — trainers must verify comprehension through demonstration or questioning before obtaining signatures.
      </Section>

      <Section heading="Employee Acknowledgment Signatures">
        Every employee who completes a training event must sign an acknowledgment form confirming that:
        <ul style={list}>
          <li style={li}>They attended and participated in the training</li>
          <li style={li}>The training was delivered in a language they understand</li>
          <li style={li}>They understand the food safety requirements covered in the training</li>
          <li style={li}>They agree to comply with all requirements covered</li>
        </ul>
        Acknowledgment forms are retained as food safety records subject to the records retention requirements of the Document and Records Control Procedure. No employee may perform food handling or production activities until all required onboarding training is complete and acknowledgment signatures are on file.
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

function check(v) {
  if (v === true) return '✓'
  if (v === 'a') return 'A'
  return '—'
}

const MATRIX = [
  ['cGMP (personal hygiene, food handling)', true, true, true],
  ['HACCP principles and CCP monitoring', true, true, true],
  ['Food defense awareness', true, true, true],
  ['Allergen identification and control', true, true, true],
  ['Ingredient receiving and lot traceability', 'a', true, true],
  ['Cleaning and sanitation procedures', 'a', true, true],
  ['Corrective action and escalation procedures', true, true, true],
  ['HACCP certification (PCQI or equivalent)', 'a', true, false],
  ['Management review and FSMS oversight', true, 'a', false],
  ['Complaint intake and CAPA documentation', true, true, false],
]

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
    <div style={{ marginBottom: '1.25rem' }}>
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
const note = { fontSize: '0.78rem', color: '#6b7280', margin: '0.375rem 0 0', fontStyle: 'italic' }
const matrixTable = { border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: '0.375rem' }
const matHead = { display: 'flex', background: '#f9fafb', padding: '0.625rem 0.875rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.78rem' }
const matRow = { display: 'flex', padding: '0.55rem 0.875rem', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }
const col1h = { flex: '0 0 42%', fontWeight: 700, color: '#374151' }
const colh = { flex: 1, fontWeight: 700, color: '#374151', textAlign: 'center' }
const col1r = { flex: '0 0 42%', fontSize: '0.85rem', color: '#374151' }
const colr = { flex: 1, textAlign: 'center', fontSize: '0.85rem', color: '#374151' }
const freqTable = { border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', margin: '0.75rem 0' }
const approvalBlock = { borderTop: '2px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '1rem' }
const approvalLabel = { fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }
const sigRow = { display: 'flex', gap: '3rem', flexWrap: 'wrap' }
