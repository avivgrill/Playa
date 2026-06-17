// Run once: node scripts/seed-operations.cjs
// Adds SOPs, production batches, logs, customers, allocations,
// ingredients, lots, usage records, and one adjustment.
// Safe to run independently from seed.cjs.

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const serviceAccount = require('./service-account.json')

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

function dt(str) { return new Date(str + 'T08:00:00') }

async function seed() {
  const b = db.batch()

  const AVIV  = { uid: 'seed', displayName: 'Aviv Grill',   email: 'avivgrill@gmail.com' }
  const KAYDE = { uid: 'seed', displayName: 'Kayde',        email: 'kayde@example.com' }

  // ── Ingredients ──────────────────────────────────────────────────────────
  const darkChocRef = db.collection('ingredients').doc()
  const oreoRef     = db.collection('ingredients').doc()
  const sugarRef    = db.collection('ingredients').doc()
  const kannaRef    = db.collection('ingredients').doc()
  const citricRef   = db.collection('ingredients').doc()
  const pectinRef   = db.collection('ingredients').doc()
  const bagsRef     = db.collection('ingredients').doc()

  const ingredientBase = { status: 'active', createdAt: dt('2026-05-14'), updatedAt: dt('2026-05-14'), createdBy: AVIV, auditLog: [{ action: 'created', changedBy: AVIV, changedAt: dt('2026-05-14') }] }

  b.set(darkChocRef, { ...ingredientBase, name: 'Dark Chocolate',   category: 'Base',        supplier: 'Cacao Barry',          unit: 'lbs',   allergens: ['Milk','Soybeans'], allergenFlag: true,  notes: '64% cacao, couverture grade' })
  b.set(oreoRef,     { ...ingredientBase, name: 'Oreo Pieces',      category: 'Inclusions',  supplier: 'Nabisco',              unit: 'lbs',   allergens: ['Wheat','Soybeans'], allergenFlag: true,  notes: 'Crushed, 3/8" size' })
  b.set(sugarRef,    { ...ingredientBase, name: 'Sugar',             category: 'Base',        supplier: 'Florida Crystals',     unit: 'lbs',   allergens: [], allergenFlag: false, notes: 'Fine grain cane sugar' })
  b.set(kannaRef,    { ...ingredientBase, name: 'Kanna Extract',     category: 'Flavor',      supplier: 'Kanavance',            unit: 'oz',    allergens: [], allergenFlag: false, notes: 'Standardized 2% mesembrine' })
  b.set(citricRef,   { ...ingredientBase, name: 'Citric Acid',       category: 'Preservative',supplier: 'Jungbunzlauer',        unit: 'oz',    allergens: [], allergenFlag: false, notes: 'Anhydrous powder, food grade' })
  b.set(pectinRef,   { ...ingredientBase, name: 'Pectin',            category: 'Base',        supplier: 'Herbstreith & Fox',    unit: 'oz',    allergens: [], allergenFlag: false, notes: 'Slow-set HM pectin' })
  b.set(bagsRef,     { ...ingredientBase, name: 'Packaging Bags',    category: 'Packaging',   supplier: 'ClearBags',            unit: 'units', allergens: [], allergenFlag: false, notes: '4"x6" heat-seal poly bags' })

  // ── Ingredient Lots ───────────────────────────────────────────────────────
  const lot001Ref = db.collection('ingredientLots').doc()
  const lot002Ref = db.collection('ingredientLots').doc()
  const lot003Ref = db.collection('ingredientLots').doc()
  const lot004Ref = db.collection('ingredientLots').doc()
  const lot005Ref = db.collection('ingredientLots').doc()
  const lot006Ref = db.collection('ingredientLots').doc()
  const lot007Ref = db.collection('ingredientLots').doc()
  const lot008Ref = db.collection('ingredientLots').doc()
  const lot009Ref = db.collection('ingredientLots').doc()
  const lot010Ref = db.collection('ingredientLots').doc()
  const lot011Ref = db.collection('ingredientLots').doc()
  const lot012Ref = db.collection('ingredientLots').doc()
  const lot013Ref = db.collection('ingredientLots').doc()
  const lot014Ref = db.collection('ingredientLots').doc()

  function lot(ref, data) {
    b.set(ref, { ...data, createdAt: data.receivedDate, receivedBy: AVIV, photoUrl: null, photoPath: null, auditLog: [{ action: 'received', changedBy: AVIV, changedAt: data.receivedDate }] })
  }

  lot(lot001Ref, { ingredientId: darkChocRef.id, ingredientName: 'Dark Chocolate',  internalLotNumber: 'ING-20260516-001', supplierLotNumber: 'CB-A7821',    supplier: 'Cacao Barry',       receivedDate: dt('2026-05-16'), originalQuantity: 100, currentQuantity: 20,  unit: 'lbs',   storageLocation: 'Dry Storage', status: 'available', notes: '' })
  lot(lot002Ref, { ingredientId: oreoRef.id,     ingredientName: 'Oreo Pieces',      internalLotNumber: 'ING-20260516-002', supplierLotNumber: 'OREO-B4412',  supplier: 'Nabisco',           receivedDate: dt('2026-05-16'), originalQuantity: 75,  currentQuantity: 55,  unit: 'lbs',   storageLocation: 'Dry Storage', status: 'available', notes: 'Recall demo lot' })
  lot(lot003Ref, { ingredientId: sugarRef.id,    ingredientName: 'Sugar',             internalLotNumber: 'ING-20260517-003', supplierLotNumber: 'FC-22905',    supplier: 'Florida Crystals',  receivedDate: dt('2026-05-17'), originalQuantity: 50,  currentQuantity: 35,  unit: 'lbs',   storageLocation: 'Dry Storage', status: 'available', notes: '' })
  lot(lot004Ref, { ingredientId: kannaRef.id,    ingredientName: 'Kanna Extract',     internalLotNumber: 'ING-20260519-004', supplierLotNumber: 'KV-0589',     supplier: 'Kanavance',         receivedDate: dt('2026-05-19'), originalQuantity: 32,  currentQuantity: 22,  unit: 'oz',    storageLocation: 'Dry Storage', status: 'available', notes: '' })
  lot(lot005Ref, { ingredientId: citricRef.id,   ingredientName: 'Citric Acid',       internalLotNumber: 'ING-20260520-005', supplierLotNumber: 'JB-CA2026',   supplier: 'Jungbunzlauer',     receivedDate: dt('2026-05-20'), originalQuantity: 32,  currentQuantity: 24,  unit: 'oz',    storageLocation: 'Dry Storage', status: 'available', notes: '' })
  lot(lot006Ref, { ingredientId: pectinRef.id,   ingredientName: 'Pectin',            internalLotNumber: 'ING-20260521-006', supplierLotNumber: 'HF-P1104',    supplier: 'Herbstreith & Fox', receivedDate: dt('2026-05-21'), originalQuantity: 32,  currentQuantity: 26,  unit: 'oz',    storageLocation: 'Dry Storage', status: 'available', notes: '' })
  lot(lot007Ref, { ingredientId: bagsRef.id,     ingredientName: 'Packaging Bags',    internalLotNumber: 'ING-20260522-007', supplierLotNumber: 'CB-46-5000',  supplier: 'ClearBags',         receivedDate: dt('2026-05-22'), originalQuantity: 500, currentQuantity: 200, unit: 'units', storageLocation: 'Dry Storage', status: 'available', notes: '' })
  lot(lot008Ref, { ingredientId: darkChocRef.id, ingredientName: 'Dark Chocolate',    internalLotNumber: 'ING-20260523-008', supplierLotNumber: 'CB-A8033',    supplier: 'Cacao Barry',       receivedDate: dt('2026-05-23'), originalQuantity: 80,  currentQuantity: 80,  unit: 'lbs',   storageLocation: 'Dry Storage', status: 'available', notes: '' })
  lot(lot009Ref, { ingredientId: oreoRef.id,     ingredientName: 'Oreo Pieces',       internalLotNumber: 'ING-20260524-009', supplierLotNumber: 'OREO-C1189',  supplier: 'Nabisco',           receivedDate: dt('2026-05-24'), originalQuantity: 50,  currentQuantity: 50,  unit: 'lbs',   storageLocation: 'Dry Storage', status: 'available', notes: '' })
  lot(lot010Ref, { ingredientId: sugarRef.id,    ingredientName: 'Sugar',             internalLotNumber: 'ING-20260526-010', supplierLotNumber: 'FC-23041',    supplier: 'Florida Crystals',  receivedDate: dt('2026-05-26'), originalQuantity: 40,  currentQuantity: 40,  unit: 'lbs',   storageLocation: 'Dry Storage', status: 'available', notes: '' })
  lot(lot011Ref, { ingredientId: kannaRef.id,    ingredientName: 'Kanna Extract',     internalLotNumber: 'ING-20260528-011', supplierLotNumber: 'KV-0601',     supplier: 'Kanavance',         receivedDate: dt('2026-05-28'), originalQuantity: 16,  currentQuantity: 16,  unit: 'oz',    storageLocation: 'Dry Storage', status: 'hold',      notes: 'On hold pending COA review' })
  lot(lot012Ref, { ingredientId: citricRef.id,   ingredientName: 'Citric Acid',       internalLotNumber: 'ING-20260529-012', supplierLotNumber: 'JB-CA2026B',  supplier: 'Jungbunzlauer',     receivedDate: dt('2026-05-29'), originalQuantity: 16,  currentQuantity: 10,  unit: 'oz',    storageLocation: 'Dry Storage', status: 'available', notes: '' })
  lot(lot013Ref, { ingredientId: pectinRef.id,   ingredientName: 'Pectin',            internalLotNumber: 'ING-20260530-013', supplierLotNumber: 'HF-P1208',    supplier: 'Herbstreith & Fox', receivedDate: dt('2026-05-30'), originalQuantity: 48,  currentQuantity: 48,  unit: 'oz',    storageLocation: 'Dry Storage', status: 'available', notes: '' })
  lot(lot014Ref, { ingredientId: bagsRef.id,     ingredientName: 'Packaging Bags',    internalLotNumber: 'ING-20260601-014', supplierLotNumber: 'CB-46-5000B', supplier: 'ClearBags',         receivedDate: dt('2026-06-01'), originalQuantity: 1000, currentQuantity: 1000, unit: 'units', storageLocation: 'Dry Storage', status: 'available', notes: '' })

  // ── SOPs ─────────────────────────────────────────────────────────────────
  const sop1Ref = db.collection('sops').doc()
  const sop2Ref = db.collection('sops').doc()
  const sop3Ref = db.collection('sops').doc()
  const sopBase = { status: 'active', createdAt: dt('2026-05-14'), updatedAt: dt('2026-05-14'), createdBy: AVIV, auditLog: [{ action: 'created', changedBy: AVIV, changedAt: dt('2026-05-14') }] }

  b.set(sop1Ref, { ...sopBase, name: 'Dark Chocolate Bar Production', productType: 'Chocolate',
    instructions: '1. Temper chocolate to 88°F (31°C)\n2. Combine inclusions and mix gently\n3. Pour into molds at 86°F\n4. Set at 65°F for 20 minutes\n5. Inspect for bloom, snap, gloss\n6. Wrap and seal each bar\n7. Label with batch number and date',
    notes: 'Chocolate must be in temper before inclusions are added. If bloom is observed, re-temper and repeat.'
  })
  b.set(sop2Ref, { ...sopBase, name: 'Gummy Candy Production', productType: 'Gummies',
    instructions: '1. Heat sugar and pectin mixture to 230°F\n2. Add citric acid and flavoring at 185°F\n3. Deposit into molds immediately\n4. Cool at room temp for 45 minutes\n5. De-mold and coat if required\n6. Inspect for set, texture, color\n7. Package per batch quantity',
    notes: 'Temperature critical at pectin hydration stage. Stir continuously to prevent scorching.'
  })
  b.set(sop3Ref, { ...sopBase, name: 'Packaging & Sealing', productType: 'All Products',
    instructions: '1. Verify batch number on all materials\n2. Inspect bags for defects\n3. Fill to target weight ± 0.5%\n4. Heat seal at 350°F, 1.5 second dwell\n5. Check seal integrity — pull test\n6. Apply label with lot number, best-by date\n7. Box and record case count',
    notes: ''
  })

  // ── Production Batches ────────────────────────────────────────────────────
  const batch001Ref = db.collection('productionBatches').doc()
  const batch002Ref = db.collection('productionBatches').doc()
  const batch003Ref = db.collection('productionBatches').doc()
  const batchBase = { createdBy: AVIV }

  b.set(batch001Ref, { ...batchBase, batchNumber: 'BATCH-2026-001', productName: 'Dark Chocolate Bark',    sopId: sop1Ref.id, sopName: 'Dark Chocolate Bar Production', productionDate: dt('2026-05-20'), quantityProduced: 200, unit: 'lbs',   status: 'released',      notes: 'First full run with Oreo inclusions', createdAt: dt('2026-05-20'), auditLog: [{ action: 'created', changedBy: AVIV, changedAt: dt('2026-05-20') }, { action: 'status changed to released', changedBy: AVIV, changedAt: dt('2026-05-23') }] })
  b.set(batch002Ref, { ...batchBase, batchNumber: 'BATCH-2026-002', productName: 'Strawberry Kanna Gummies', sopId: sop2Ref.id, sopName: 'Gummy Candy Production',         productionDate: dt('2026-05-25'), quantityProduced: 500, unit: 'units', status: 'released',      notes: '',                                    createdAt: dt('2026-05-25'), auditLog: [{ action: 'created', changedBy: KAYDE, changedAt: dt('2026-05-25') }, { action: 'status changed to released', changedBy: AVIV, changedAt: dt('2026-05-27') }] })
  b.set(batch003Ref, { ...batchBase, batchNumber: 'BATCH-2026-003', productName: 'Dark Chocolate Truffles',  sopId: sop1Ref.id, sopName: 'Dark Chocolate Bar Production', productionDate: dt('2026-06-05'), quantityProduced: 150, unit: 'lbs',   status: 'in_production', notes: 'Hazelnut and sea salt variant',       createdAt: dt('2026-06-05'), auditLog: [{ action: 'created', changedBy: AVIV, changedAt: dt('2026-06-05') }] })

  // ── Production Logs ───────────────────────────────────────────────────────
  const log001Ref = db.collection('productionLogs').doc()
  const log002Ref = db.collection('productionLogs').doc()

  b.set(log001Ref, { batchId: batch001Ref.id, batchNumber: 'BATCH-2026-001', productName: 'Dark Chocolate Bark',    sopId: sop1Ref.id, sopName: 'Dark Chocolate Bar Production', operator: 'Aviv Grill', startTime: new Date('2026-05-20T07:30:00'), endTime: new Date('2026-05-20T11:15:00'), equipment: 'Tempering Machine #1, Mold Line A', notes: 'Run went smoothly. Temper achieved on first attempt.', deviations: '', photoUrls: [], photoPaths: [], signature: { signedBy: 'Aviv Grill', signedAt: new Date('2026-05-20T11:20:00') }, createdAt: dt('2026-05-20'), createdBy: AVIV, auditLog: [{ action: 'created', changedBy: AVIV, changedAt: dt('2026-05-20') }] })
  b.set(log002Ref, { batchId: batch002Ref.id, batchNumber: 'BATCH-2026-002', productName: 'Strawberry Kanna Gummies', sopId: sop2Ref.id, sopName: 'Gummy Candy Production',         operator: 'Kayde',      startTime: new Date('2026-05-25T08:00:00'), endTime: new Date('2026-05-25T12:30:00'), equipment: 'Cooker #2, Depositor Line B',       notes: 'Slight delay at depositing stage — hopper needed refilling.', deviations: 'Depositing paused for 8 minutes at 10:22 AM to refill hopper. Product unaffected, verified texture and set time normal.', photoUrls: [], photoPaths: [], signature: { signedBy: 'Kayde', signedAt: new Date('2026-05-25T12:35:00') }, createdAt: dt('2026-05-25'), createdBy: KAYDE, auditLog: [{ action: 'created', changedBy: KAYDE, changedAt: dt('2026-05-25') }] })

  // ── Customers ─────────────────────────────────────────────────────────────
  const cust1Ref = db.collection('customers').doc()
  const cust2Ref = db.collection('customers').doc()
  const cust3Ref = db.collection('customers').doc()
  const custBase = { status: 'active', createdAt: dt('2026-05-01'), updatedAt: dt('2026-05-01'), createdBy: AVIV, auditLog: [{ action: 'created', changedBy: AVIV, changedAt: dt('2026-05-01') }] }

  b.set(cust1Ref, { ...custBase, customerName: 'Sweet Dreams Bakery',  contactName: 'Maria Santos',  email: 'orders@sweetdreamsbakery.com', phone: '(305) 555-0142', notes: 'Prefers delivery on Tuesdays' })
  b.set(cust2Ref, { ...custBase, customerName: 'The Candy Corner',     contactName: 'James Whitfield', email: 'james@thecandycorner.com',     phone: '(786) 555-0289', notes: '' })
  b.set(cust3Ref, { ...custBase, customerName: 'Local Goods Market',   contactName: 'Priya Nair',    email: 'buyers@localgoodsmarket.com', phone: '(954) 555-0377', notes: 'Net-30 terms' })

  // ── Batch Allocations ─────────────────────────────────────────────────────
  const alloc1Ref = db.collection('batchAllocations').doc()
  const alloc2Ref = db.collection('batchAllocations').doc()
  const alloc3Ref = db.collection('batchAllocations').doc()
  const allocBase = { createdBy: AVIV }

  b.set(alloc1Ref, { ...allocBase, batchId: batch001Ref.id, batchNumber: 'BATCH-2026-001', productName: 'Dark Chocolate Bark',    customerId: cust1Ref.id, customerName: 'Sweet Dreams Bakery', quantityAllocated: 80,  unit: 'lbs',   allocationDate: dt('2026-05-22'), notes: '',                   createdAt: dt('2026-05-22'), auditLog: [{ action: 'created', changedBy: AVIV, changedAt: dt('2026-05-22') }] })
  b.set(alloc2Ref, { ...allocBase, batchId: batch001Ref.id, batchNumber: 'BATCH-2026-001', productName: 'Dark Chocolate Bark',    customerId: cust2Ref.id, customerName: 'The Candy Corner',    quantityAllocated: 60,  unit: 'lbs',   allocationDate: dt('2026-05-23'), notes: 'Rush order',         createdAt: dt('2026-05-23'), auditLog: [{ action: 'created', changedBy: AVIV, changedAt: dt('2026-05-23') }] })
  b.set(alloc3Ref, { ...allocBase, batchId: batch002Ref.id, batchNumber: 'BATCH-2026-002', productName: 'Strawberry Kanna Gummies', customerId: cust3Ref.id, customerName: 'Local Goods Market', quantityAllocated: 200, unit: 'units', allocationDate: dt('2026-05-27'), notes: '',                   createdAt: dt('2026-05-27'), auditLog: [{ action: 'created', changedBy: AVIV, changedAt: dt('2026-05-27') }] })

  // ── Ingredient Usage Records ───────────────────────────────────────────────
  // BATCH-2026-001 uses dark choc, oreo, sugar
  const usage1Ref = db.collection('ingredientUsage').doc()
  const usage2Ref = db.collection('ingredientUsage').doc()
  const usage3Ref = db.collection('ingredientUsage').doc()
  // BATCH-2026-002 uses kanna, citric, pectin, bags
  const usage4Ref = db.collection('ingredientUsage').doc()
  const usage5Ref = db.collection('ingredientUsage').doc()
  const usage6Ref = db.collection('ingredientUsage').doc()
  const usage7Ref = db.collection('ingredientUsage').doc()
  // BATCH-2026-003 uses dark choc (lot 001, 30 lbs used)
  const usage8Ref = db.collection('ingredientUsage').doc()

  function usage(ref, batchRef, batchNum, prodName, ingRef, ingName, lotRef, lotNum, supLot, qty, unit, user, dateStr) {
    b.set(ref, { batchId: batchRef.id, batchNumber: batchNum, productName: prodName, ingredientId: ingRef.id, ingredientName: ingName, lotId: lotRef.id, internalLotNumber: lotNum, supplierLotNumber: supLot, quantityUsed: qty, unit, addedBy: user, usedAt: dt(dateStr), createdAt: dt(dateStr), auditLog: [{ action: 'created', changedBy: user, changedAt: dt(dateStr) }] })
  }

  usage(usage1Ref, batch001Ref, 'BATCH-2026-001', 'Dark Chocolate Bark',     darkChocRef, 'Dark Chocolate',  lot001Ref, 'ING-20260516-001', 'CB-A7821',   50,  'lbs',   AVIV,  '2026-05-20')
  usage(usage2Ref, batch001Ref, 'BATCH-2026-001', 'Dark Chocolate Bark',     oreoRef,     'Oreo Pieces',     lot002Ref, 'ING-20260516-002', 'OREO-B4412', 20,  'lbs',   AVIV,  '2026-05-20')
  usage(usage3Ref, batch001Ref, 'BATCH-2026-001', 'Dark Chocolate Bark',     sugarRef,    'Sugar',           lot003Ref, 'ING-20260517-003', 'FC-22905',   15,  'lbs',   AVIV,  '2026-05-20')
  usage(usage4Ref, batch002Ref, 'BATCH-2026-002', 'Strawberry Kanna Gummies', kannaRef,    'Kanna Extract',   lot004Ref, 'ING-20260519-004', 'KV-0589',    10,  'oz',    KAYDE, '2026-05-25')
  usage(usage5Ref, batch002Ref, 'BATCH-2026-002', 'Strawberry Kanna Gummies', citricRef,   'Citric Acid',     lot005Ref, 'ING-20260520-005', 'JB-CA2026',  8,   'oz',    KAYDE, '2026-05-25')
  usage(usage6Ref, batch002Ref, 'BATCH-2026-002', 'Strawberry Kanna Gummies', pectinRef,   'Pectin',          lot006Ref, 'ING-20260521-006', 'HF-P1104',   6,   'oz',    KAYDE, '2026-05-25')
  usage(usage7Ref, batch002Ref, 'BATCH-2026-002', 'Strawberry Kanna Gummies', bagsRef,     'Packaging Bags',  lot007Ref, 'ING-20260522-007', 'CB-46-5000', 300, 'units', KAYDE, '2026-05-25')
  usage(usage8Ref, batch003Ref, 'BATCH-2026-003', 'Dark Chocolate Truffles',  darkChocRef, 'Dark Chocolate',  lot001Ref, 'ING-20260516-001', 'CB-A7821',   30,  'lbs',   AVIV,  '2026-06-05')

  // ── Inventory Adjustment ──────────────────────────────────────────────────
  // Lot 012 (citric acid): waste -6 oz → currentQty already set to 10 above
  const adj1Ref = db.collection('inventoryAdjustments').doc()
  b.set(adj1Ref, {
    lotId: lot012Ref.id, internalLotNumber: 'ING-20260529-012',
    ingredientId: citricRef.id, ingredientName: 'Citric Acid',
    adjustmentType: 'waste', quantity: 6,
    previousQuantity: 16, newQuantity: 10,
    reason: 'Spillage during weighing',
    notes: 'Container tipped while measuring for test batch.',
    adjustedBy: KAYDE, adjustedAt: dt('2026-05-31'), createdAt: dt('2026-05-31'),
  })

  // ── Counters ──────────────────────────────────────────────────────────────
  b.set(db.collection('counters').doc('batchCounter'), { value: 3, year: 2026 })
  b.set(db.collection('counters').doc('lotCounter'),   { value: 14, year: 2026 })

  await b.commit()
  console.log('✓ Operations seed complete.')
  console.log('  7 ingredients | 14 lots | 3 SOPs | 3 batches | 2 logs | 3 customers | 3 allocations | 8 usage records | 1 adjustment')
  console.log('')
  console.log('Demo scenarios:')
  console.log('  Low stock:    ING-20260516-001 (Dark Chocolate) — 20 lbs remaining (20% of 100)')
  console.log('  On hold:      ING-20260528-011 (Kanna Extract) — pending COA review')
  console.log('  Recall trace: Search "Oreo Pieces" or "OREO-B4412" → used in BATCH-2026-001 → Sweet Dreams Bakery + The Candy Corner')
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1) })
