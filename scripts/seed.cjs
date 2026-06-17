'use strict'

// ─── Bootstrap ────────────────────────────────────────────────────────────────
let initializeApp, cert, getFirestore
try {
  ;({ initializeApp, cert } = require('firebase-admin/app'))
  ;({ getFirestore }        = require('firebase-admin/firestore'))
} catch {
  console.error('firebase-admin not found. Run: npm install --save-dev firebase-admin')
  process.exit(1)
}

let serviceAccount
try {
  serviceAccount = require('../service-account.json')
} catch {
  console.error('\n❌  service-account.json not found in project root.')
  console.error('    Firebase console → Project settings → Service accounts')
  console.error('    → Generate new private key → save as service-account.json\n')
  process.exit(1)
}

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

// ─── Users ────────────────────────────────────────────────────────────────────
const AVIV    = { uid: 'seed-aviv',    displayName: 'Aviv Grill',       email: 'avivgrill@gmail.com' }
const KAYDE   = { uid: 'seed-kayde',   displayName: 'Kayde McMullen',   email: 'kayde@playamgmt.com' }
const ALFREDO = { uid: 'seed-alfredo', displayName: 'Alfredo Renteria', email: 'alfredo@playamgmt.com' }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0')
const dt  = (d, h, m = 0) => new Date(`${d}T${pad(h)}:${pad(m)}:00`)

function auditEntry(action, user, d, h, m = 0, changes = {}) {
  return { action, changedBy: user, changedAt: dt(d, h, m), changes }
}

function allPass(items) {
  return items.map(i => ({ ...i, result: 'pass', notes: '', photoUrl: null, photoPath: null }))
}

function passWithNotes(items, notesMap) {
  return items.map(i => ({ ...i, result: 'pass', notes: notesMap[i.id] || '', photoUrl: null, photoPath: null }))
}

function withFail(items, failId, failNotes) {
  return items.map(i => ({
    ...i,
    result:   i.id === failId ? 'fail' : 'pass',
    notes:    i.id === failId ? failNotes : '',
    photoUrl: null, photoPath: null,
  }))
}

// ─── Checklist definitions ─────────────────────────────────────────────────────
const DAILY_ITEMS = [
  { id: 'df1',  label: 'Floors clean and in good condition',    order: 1 },
  { id: 'df2',  label: 'Walls and ceilings clean',              order: 2 },
  { id: 'df3',  label: 'Lights functioning and protected',      order: 3 },
  { id: 'df4',  label: 'Drains clear and clean',                order: 4 },
  { id: 'df5',  label: 'No pest activity observed',             order: 5 },
  { id: 'df6',  label: 'Trash removed and covered',             order: 6 },
  { id: 'df7',  label: 'Chemicals stored properly',             order: 7 },
  { id: 'df8',  label: 'Handwashing stations stocked',          order: 8 },
  { id: 'df9',  label: 'Restrooms clean and stocked',           order: 9 },
  { id: 'df10', label: 'General housekeeping acceptable',       order: 10 },
]

const WEEKLY_ITEMS = [
  { id: 'wf1', label: 'No pest activity observed',                    order: 1 },
  { id: 'wf2', label: 'Doors and screens in good condition',          order: 2 },
  { id: 'wf3', label: 'Floors, walls, and ceilings in good repair',   order: 3 },
  { id: 'wf4', label: 'Drains functioning properly',                  order: 4 },
  { id: 'wf5', label: 'Handwashing stations functioning',             order: 5 },
  { id: 'wf6', label: 'Chemicals properly stored and labeled',        order: 6 },
  { id: 'wf7', label: 'Trash and waste areas acceptable',             order: 7 },
  { id: 'wf8', label: 'No glass or brittle plastic damage observed',  order: 8 },
]

const MONTHLY_ITEMS = [
  { id: 'mf1', label: 'Deep cleaning completed',                  order: 1 },
  { id: 'mf2', label: 'Open corrective actions reviewed',         order: 2 },
  { id: 'mf3', label: 'Employee training records reviewed',       order: 3 },
  { id: 'mf4', label: 'Maintenance issues reviewed',              order: 4 },
  { id: 'mf5', label: 'Pest control records reviewed',            order: 5 },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱  Seeding Playa Management — CGMP Compliance\n')

  // CA counter (start at 3, three CAs already seeded)
  await db.doc('counters/caCounter').set({ value: 3, year: 2026 })

  // ====================================================================
  // WEEK A  May 18–22
  // ====================================================================

  // Weekly inspection — May 18 (FAIL: drain issue → CA-2026-001)
  const weeklyA = await db.collection('inspections').add({
    type: 'weekly_facility', status: 'completed', overallResult: 'fail',
    date: '2026-05-18',
    startedAt:   dt('2026-05-18', 7,  0),
    completedAt: dt('2026-05-18', 7, 26),
    createdBy: KAYDE,
    items: withFail(WEEKLY_ITEMS, 'wf4',
      'Drain buildup observed in production room floor drain. Drain slow to clear. Buildup consistent with end-of-week production residue accumulation.'),
    failedItemCount: 1,
    signature: { signedBy: 'Kayde McMullen', signedAt: dt('2026-05-18', 7, 26) },
    auditLog: [auditEntry('created', KAYDE, '2026-05-18', 7, 26)],
  })

  // Daily inspections — May 18–22 (all pass)
  for (const [date, h, m] of [
    ['2026-05-18', 6, 31],
    ['2026-05-19', 6, 28],
    ['2026-05-20', 6, 42],
    ['2026-05-21', 6, 35],
    ['2026-05-22', 6, 29],
  ]) {
    await db.collection('inspections').add({
      type: 'daily_facility', status: 'completed', overallResult: 'pass',
      date,
      startedAt:   dt(date, h, m),
      completedAt: dt(date, h, m + 13),
      createdBy: KAYDE,
      items: allPass(DAILY_ITEMS),
      failedItemCount: 0,
      signature: { signedBy: 'Kayde McMullen', signedAt: dt(date, h, m + 13) },
      auditLog: [auditEntry('created', KAYDE, date, h, m + 13)],
    })
  }

  // Cleaning logs — May 18–22 (May 20 missing concentration → CA-2026-003)
  const cleanLogMay20 = db.collection('cleaningLogs').doc()

  const weekALogs = [
    { date: '2026-05-18', h: 15, m: 20, area: 'Production Floor',  equipment: 'Floor drains and surrounding area',       chemical: 'Quat sanitizer',              concentration: '200 ppm',      notes: '' },
    { date: '2026-05-19', h: 15, m: 35, area: 'Mixing Room',       equipment: 'Mixer #1 and work surfaces',               chemical: 'Chlorinated alkaline cleaner', concentration: '1% dilution',  notes: '' },
    { date: '2026-05-20', h: 15, m: 45, area: 'Packaging Line',    equipment: 'Conveyor belt and packaging tables',        chemical: 'Quat sanitizer',              concentration: '',             notes: 'Concentration not recorded at time of submission. See CA-2026-003.' },
    { date: '2026-05-21', h: 15, m: 18, area: 'Enrobing Area',     equipment: 'Enrobing machine and surrounding area',    chemical: 'Chlorinated alkaline cleaner', concentration: '1% dilution',  notes: '' },
    { date: '2026-05-22', h: 15, m: 30, area: 'Production Floor',  equipment: 'General floor and drain cleaning',          chemical: 'Peracetic acid sanitizer',     concentration: '150 ppm',      notes: '' },
  ]

  for (const c of weekALogs) {
    const isMay20 = c.date === '2026-05-20'
    const ref = isMay20 ? cleanLogMay20 : db.collection('cleaningLogs').doc()
    const verifiedAt = isMay20 ? dt('2026-05-21', 8, 5) : dt(c.date, 17, 0)
    await ref.set({
      area: c.area, equipment: c.equipment, chemical: c.chemical,
      concentration: c.concentration, notes: c.notes,
      photoUrl: null, photoPath: null,
      completedAt: dt(c.date, c.h, c.m),
      createdBy: ALFREDO,
      verificationStatus: 'verified',
      verification: {
        verifiedBy: AVIV, verifiedAt,
        notes: isMay20
          ? 'Sanitizer concentration was not recorded on original log submission. CA-2026-003 created and resolved. Batch record confirms 200 ppm on this date.'
          : '',
      },
      auditLog: [
        auditEntry('created', ALFREDO, c.date, c.h, c.m),
        auditEntry('verified', AVIV, isMay20 ? '2026-05-21' : c.date, isMay20 ? 8 : 17, isMay20 ? 5 : 0,
          { verificationStatus: { from: 'pending', to: 'verified' } }),
      ],
    })
  }

  console.log('  ✓  Week A  (May 18–22)  — 1 weekly + 5 daily inspections + 5 cleaning logs')

  // ====================================================================
  // WEEK B  May 25–29
  // ====================================================================

  // Weekly inspection — May 25 (all pass, notes drain clear)
  await db.collection('inspections').add({
    type: 'weekly_facility', status: 'completed', overallResult: 'pass',
    date: '2026-05-25',
    startedAt:   dt('2026-05-25', 7,  2),
    completedAt: dt('2026-05-25', 7, 29),
    createdBy: KAYDE,
    items: passWithNotes(WEEKLY_ITEMS, {
      wf4: 'All drains clear and flowing properly. No buildup observed — confirmed clear following CA-2026-001 corrective action from 5/18.',
    }),
    failedItemCount: 0,
    signature: { signedBy: 'Kayde McMullen', signedAt: dt('2026-05-25', 7, 29) },
    auditLog: [auditEntry('created', KAYDE, '2026-05-25', 7, 29)],
  })

  // Daily inspections — May 25–29 (May 26 FAILS: gnats → CA-2026-002)
  const dailyMay26 = db.collection('inspections').doc()

  const weekBDailies = [
    { date: '2026-05-25', h: 6, m: 33, ref: null },
    { date: '2026-05-26', h: 6, m: 30, ref: dailyMay26 },
    { date: '2026-05-27', h: 6, m: 36, ref: null },
    { date: '2026-05-28', h: 6, m: 28, ref: null },
    { date: '2026-05-29', h: 6, m: 41, ref: null },
  ]

  for (const d of weekBDailies) {
    const ref = d.ref || db.collection('inspections').doc()
    const isMay26 = d.date === '2026-05-26'
    const isMay27 = d.date === '2026-05-27'
    const items = isMay26
      ? withFail(DAILY_ITEMS, 'df5',
          'Small number of gnats (approx. 3–4) observed near production floor drain. No other pest activity observed in facility.')
      : isMay27
        ? passWithNotes(DAILY_ITEMS, {
            df5: 'No pest activity observed. Follow-up from CA-2026-002 — drain area cleaned and sanitized 5/26. No further activity noted this morning.',
          })
        : allPass(DAILY_ITEMS)

    await ref.set({
      type: 'daily_facility', status: 'completed',
      overallResult: isMay26 ? 'fail' : 'pass',
      date: d.date,
      startedAt:   dt(d.date, d.h, d.m),
      completedAt: dt(d.date, d.h, d.m + 13),
      createdBy: KAYDE,
      items,
      failedItemCount: isMay26 ? 1 : 0,
      signature: { signedBy: 'Kayde McMullen', signedAt: dt(d.date, d.h, d.m + 13) },
      auditLog: [auditEntry('created', KAYDE, d.date, d.h, d.m + 13)],
    })
  }

  // Cleaning logs — May 25–29
  for (const c of [
    { date: '2026-05-25', h: 15, m: 22, area: 'Mixing Room',       equipment: 'Mixer #1 and #2 and work surfaces',        chemical: 'Chlorinated alkaline cleaner', concentration: '1% dilution',  notes: '' },
    { date: '2026-05-26', h: 15, m: 40, area: 'Production Floor',  equipment: 'Floor drains and surrounding area',         chemical: 'Quat sanitizer',              concentration: '200 ppm',      notes: 'Drain area given additional attention following gnat observation on morning inspection (CA-2026-002).' },
    { date: '2026-05-27', h: 15, m: 18, area: 'Packaging Line',    equipment: 'Conveyor belt and packaging tables',        chemical: 'Quat sanitizer',              concentration: '200 ppm',      notes: '' },
    { date: '2026-05-28', h: 15, m: 35, area: 'Cold Storage',      equipment: 'Tempering machine and surrounding surfaces',chemical: 'Food-grade degreaser',         concentration: 'Ready to use', notes: '' },
    { date: '2026-05-29', h: 15, m: 27, area: 'Production Floor',  equipment: 'General floor and drain cleaning',          chemical: 'Quat sanitizer',              concentration: '200 ppm',      notes: '' },
  ]) {
    await db.collection('cleaningLogs').add({
      area: c.area, equipment: c.equipment, chemical: c.chemical,
      concentration: c.concentration, notes: c.notes,
      photoUrl: null, photoPath: null,
      completedAt: dt(c.date, c.h, c.m),
      createdBy: ALFREDO,
      verificationStatus: 'verified',
      verification: { verifiedBy: AVIV, verifiedAt: dt(c.date, 17, 15), notes: '' },
      auditLog: [
        auditEntry('created', ALFREDO, c.date, c.h, c.m),
        auditEntry('verified', AVIV, c.date, 17, 15, { verificationStatus: { from: 'pending', to: 'verified' } }),
      ],
    })
  }

  console.log('  ✓  Week B  (May 25–29)  — 1 weekly + 5 daily inspections + 5 cleaning logs')

  // ====================================================================
  // WEEK C  June 1–5
  // ====================================================================

  // Weekly inspection — June 1 (all pass)
  await db.collection('inspections').add({
    type: 'weekly_facility', status: 'completed', overallResult: 'pass',
    date: '2026-06-01',
    startedAt:   dt('2026-06-01', 7,  5),
    completedAt: dt('2026-06-01', 7, 32),
    createdBy: KAYDE,
    items: allPass(WEEKLY_ITEMS),
    failedItemCount: 0,
    signature: { signedBy: 'Kayde McMullen', signedAt: dt('2026-06-01', 7, 32) },
    auditLog: [auditEntry('created', KAYDE, '2026-06-01', 7, 32)],
  })

  // Daily inspections — June 1–5 (all pass)
  for (const [date, h, m] of [
    ['2026-06-01', 6, 37],
    ['2026-06-02', 6, 31],
    ['2026-06-03', 6, 44],
    ['2026-06-04', 6, 28],
    ['2026-06-05', 6, 33],
  ]) {
    await db.collection('inspections').add({
      type: 'daily_facility', status: 'completed', overallResult: 'pass',
      date,
      startedAt:   dt(date, h, m),
      completedAt: dt(date, h, m + 13),
      createdBy: KAYDE,
      items: allPass(DAILY_ITEMS),
      failedItemCount: 0,
      signature: { signedBy: 'Kayde McMullen', signedAt: dt(date, h, m + 13) },
      auditLog: [auditEntry('created', KAYDE, date, h, m + 13)],
    })
  }

  // Monthly Facility Verification — June 2 (Aviv Grill)
  await db.collection('inspections').add({
    type: 'monthly_facility', status: 'completed', overallResult: 'pass',
    date: '2026-06-02',
    startedAt:   dt('2026-06-02', 9,  5),
    completedAt: dt('2026-06-02', 9, 41),
    createdBy: AVIV,
    items: passWithNotes(MONTHLY_ITEMS, {
      mf1: 'Scheduled deep clean completed weekend of May 31–June 1. Production floor, mixing room, packaging line, and all drains documented and signed off by sanitation team.',
      mf2: 'All corrective actions from prior period closed and verified. CA-2026-001 (drain buildup), CA-2026-002 (pest observation), and CA-2026-003 (documentation) all verified. No open items.',
      mf3: 'Training records current for all staff. Alfredo Renteria completed documentation refresher training May 21 following CA-2026-003. Next scheduled facility-wide training June 15.',
      mf4: 'No open maintenance items. Mixer #1 received scheduled PM service May 28 — service record on file. Packaging line PM scheduled June 12.',
      mf5: 'Pest control inspection completed May 23 by licensed contractor. No activity identified. Service report and recommendations on file. Next scheduled visit June 23.',
    }),
    failedItemCount: 0,
    signature: { signedBy: 'Aviv Grill', signedAt: dt('2026-06-02', 9, 41) },
    auditLog: [auditEntry('created', AVIV, '2026-06-02', 9, 41)],
  })

  // Cleaning logs — June 1–5
  for (const c of [
    { date: '2026-06-01', h: 15, m: 25, area: 'Mixing Room',       equipment: 'Mixer #1 and work surfaces',               chemical: 'Chlorinated alkaline cleaner', concentration: '1% dilution' },
    { date: '2026-06-02', h: 15, m: 38, area: 'Packaging Line',    equipment: 'Conveyor belt and packaging tables',        chemical: 'Quat sanitizer',              concentration: '200 ppm'     },
    { date: '2026-06-03', h: 15, m: 20, area: 'Enrobing Area',     equipment: 'Enrobing machine and surrounding area',    chemical: 'Peracetic acid sanitizer',     concentration: '150 ppm'     },
    { date: '2026-06-04', h: 15, m: 32, area: 'Production Floor',  equipment: 'Floor drains and surrounding area',         chemical: 'Quat sanitizer',              concentration: '200 ppm'     },
    { date: '2026-06-05', h: 15, m: 28, area: 'Production Floor',  equipment: 'General floor cleaning and drains',         chemical: 'Chlorinated alkaline cleaner', concentration: '1% dilution' },
  ]) {
    await db.collection('cleaningLogs').add({
      area: c.area, equipment: c.equipment, chemical: c.chemical,
      concentration: c.concentration, notes: '',
      photoUrl: null, photoPath: null,
      completedAt: dt(c.date, c.h, c.m),
      createdBy: ALFREDO,
      verificationStatus: 'verified',
      verification: { verifiedBy: AVIV, verifiedAt: dt(c.date, 17, 10), notes: '' },
      auditLog: [
        auditEntry('created', ALFREDO, c.date, c.h, c.m),
        auditEntry('verified', AVIV, c.date, 17, 10, { verificationStatus: { from: 'pending', to: 'verified' } }),
      ],
    })
  }

  console.log('  ✓  Week C  (June 1–5)   — 1 weekly + 5 daily inspections + 1 monthly verification + 5 cleaning logs')

  // ====================================================================
  // CORRECTIVE ACTIONS
  // ====================================================================

  // CA-2026-001 — Drain buildup (weekly inspection May 18)
  await db.collection('correctiveActions').add({
    caNumber: 'CA-2026-001',
    sourceType: 'inspection',
    sourceId: weeklyA.id,
    sourceItemLabel: 'Drains functioning properly',
    description: 'Drain buildup observed in production room floor drain. Drain slow to clear. Buildup consistent with end-of-week production residue accumulation.',
    assignedTo: ALFREDO,
    dueDate: dt('2026-05-18', 17, 0),
    status: 'verified',
    correctiveActionTaken: 'Drain cleaned and sanitized same day using drain brush and quat sanitizer at 200 ppm. Drain cleared and flowing properly. Updated daily sanitation schedule to include mid-week drain inspection and cleaning to prevent recurrence.',
    verificationNotes: 'Inspected drain — clear and flowing properly. Updated sanitation schedule reviewed and approved. Follow-up weekly inspection on 5/25 confirmed no recurrence.',
    verificationPhotoUrl: null, verificationPhotoPath: null,
    supervisorSignOff: { uid: AVIV.uid, displayName: 'Aviv Grill', signedAt: dt('2026-05-19', 8, 15) },
    createdAt: dt('2026-05-18', 7, 27),
    createdBy: KAYDE,
    auditLog: [
      auditEntry('created',        KAYDE,   '2026-05-18',  7, 27),
      auditEntry('status_changed', ALFREDO, '2026-05-18', 14, 30, { status: { from: 'open',        to: 'in_progress' } }),
      auditEntry('status_changed', ALFREDO, '2026-05-18', 16, 10, { status: { from: 'in_progress', to: 'complete'    } }),
      auditEntry('verified',       AVIV,    '2026-05-19',  8, 15, { status: { from: 'complete',    to: 'verified'    } }),
    ],
  })

  // CA-2026-002 — Gnats near drain (daily inspection May 26)
  await db.collection('correctiveActions').add({
    caNumber: 'CA-2026-002',
    sourceType: 'inspection',
    sourceId: dailyMay26.id,
    sourceItemLabel: 'No pest activity observed',
    description: 'Small number of gnats (approx. 3–4) observed near production floor drain during daily facility inspection. No other pest activity observed in facility.',
    assignedTo: ALFREDO,
    dueDate: dt('2026-05-27', 17, 0),
    status: 'verified',
    correctiveActionTaken: 'Drain thoroughly cleaned and sanitized at 200 ppm quat sanitizer. Drain cover removed, cleaned, and reinstalled. Surrounding floor area sanitized. Monitoring conducted throughout afternoon shift 5/26 and full shift 5/27 — no additional gnat activity observed. Pest control contractor notified and will perform additional inspection at next scheduled visit 6/23.',
    verificationNotes: 'Reviewed drain and surrounding production floor area — clean, no pest activity. Follow-up daily inspection on 5/27 confirmed no further activity. Area continues to be monitored. Pest control notified.',
    verificationPhotoUrl: null, verificationPhotoPath: null,
    supervisorSignOff: { uid: AVIV.uid, displayName: 'Aviv Grill', signedAt: dt('2026-05-28', 8, 0) },
    createdAt: dt('2026-05-26', 6, 44),
    createdBy: KAYDE,
    auditLog: [
      auditEntry('created',        KAYDE,   '2026-05-26',  6, 44),
      auditEntry('status_changed', ALFREDO, '2026-05-26', 15, 45, { status: { from: 'open',        to: 'in_progress' } }),
      auditEntry('status_changed', ALFREDO, '2026-05-27', 16, 30, { status: { from: 'in_progress', to: 'complete'    } }),
      auditEntry('verified',       AVIV,    '2026-05-28',  8,  0, { status: { from: 'complete',    to: 'verified'    } }),
    ],
  })

  // CA-2026-003 — Sanitizer concentration not recorded (cleaning log May 20)
  await db.collection('correctiveActions').add({
    caNumber: 'CA-2026-003',
    sourceType: 'cleaning_log',
    sourceId: cleanLogMay20.id,
    sourceItemLabel: 'Sanitizer concentration not recorded',
    description: 'Sanitizer concentration field left blank on cleaning log for Packaging Line dated May 20. Concentration is required on all sanitizer applications per facility sanitation SOP.',
    assignedTo: ALFREDO,
    dueDate: dt('2026-05-21', 9, 0),
    status: 'verified',
    correctiveActionTaken: 'Confirmed with employee that sanitizer concentration was 200 ppm per batch production log for May 20. Cleaning log notes updated to reflect confirmed concentration. One-on-one documentation refresher training completed with Alfredo Renteria on 5/21 covering complete and accurate log requirements, including concentration field for all sanitizer applications.',
    verificationNotes: 'Batch log reviewed and confirmed 200 ppm concentration on 5/20. Training session documented in employee file. All cleaning logs submitted since 5/21 reviewed — all fully and correctly completed.',
    verificationPhotoUrl: null, verificationPhotoPath: null,
    supervisorSignOff: { uid: AVIV.uid, displayName: 'Aviv Grill', signedAt: dt('2026-05-21', 8, 10) },
    createdAt: dt('2026-05-20', 17, 5),
    createdBy: AVIV,
    auditLog: [
      auditEntry('created',        AVIV,    '2026-05-20', 17,  5),
      auditEntry('status_changed', ALFREDO, '2026-05-20', 17, 30, { status: { from: 'open',        to: 'in_progress' } }),
      auditEntry('status_changed', ALFREDO, '2026-05-21',  7, 50, { status: { from: 'in_progress', to: 'complete'    } }),
      auditEntry('verified',       AVIV,    '2026-05-21',  8, 10, { status: { from: 'complete',    to: 'verified'    } }),
    ],
  })

  console.log('  ✓  Corrective Actions   — CA-2026-001, CA-2026-002, CA-2026-003 (all verified)')
  console.log('\n✅  Seed complete — 38 documents written to Firestore.\n')
}

seed().catch(err => {
  console.error('\n❌  Seed failed:', err.message || err)
  process.exit(1)
})
