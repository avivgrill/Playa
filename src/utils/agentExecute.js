import {
  collection, addDoc, doc, setDoc, updateDoc, getDocs,
  query, where, serverTimestamp, Timestamp, runTransaction, arrayUnion
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { getNextBatchNumber } from './batchNumber'
import { getNextLotNumber } from './lotNumber'
import { getNextSopNumber } from './sopNumber'
import { getNextFgLotNumber } from './fgLotNumber'
import { getNextClientOrderNumber } from './clientOrderNumber'
import { getWeekStart, weekLabel, weekStartStr } from './timecard'

export async function executeAction(action, currentUser, isAdmin) {
  const userInfo = {
    uid: currentUser.uid,
    displayName: currentUser.displayName || currentUser.email,
    email: currentUser.email
  }
  const now = Timestamp.now()

  switch (action.type) {
    case 'create_ingredient': {
      const d = action.data
      const allergens = Array.isArray(d.allergens) ? d.allergens : []
      const r = await addDoc(collection(db, 'ingredients'), {
        name: d.name, category: d.category || 'Base', supplier: d.supplier || '',
        unit: d.unit || 'lbs', allergens, allergenFlag: allergens.length > 0,
        notes: d.notes || '', status: 'active',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        createdBy: userInfo, auditLog: [{ action: 'created', changedBy: userInfo, changedAt: now }]
      })
      return { label: `Ingredient — ${d.name}`, navigateTo: `/operations/ingredients/${r.id}` }
    }
    case 'receive_lot': {
      const d = action.data
      const receivedDate = d.receivedDate ? new Date(d.receivedDate + (d.receivedDate.length === 10 ? 'T00:00:00' : '')) : new Date()
      const lotNumber = await getNextLotNumber()
      const r = await addDoc(collection(db, 'ingredientLots'), {
        ingredientId: d.ingredientId || '', ingredientName: d.ingredientName || '',
        internalLotNumber: lotNumber, supplierLotNumber: d.supplierLotNumber || '',
        supplier: d.supplier || '', receivedDate: Timestamp.fromDate(receivedDate),
        originalQuantity: Number(d.quantity) || 0, currentQuantity: Number(d.quantity) || 0,
        unit: d.unit || 'lbs', storageLocation: d.storageLocation || '', status: 'available',
        receivedBy: userInfo, notes: d.notes || '',
        createdAt: serverTimestamp(), auditLog: [{ action: 'received', changedBy: userInfo, changedAt: now }]
      })
      return { label: `Lot ${lotNumber} — ${d.ingredientName}`, navigateTo: `/operations/lots/${r.id}` }
    }
    case 'create_batch': {
      const d = action.data
      const batchNumber = await getNextBatchNumber()
      const productionDate = d.productionDate ? new Date(d.productionDate + (d.productionDate.length === 10 ? 'T00:00:00' : '')) : new Date()
      const batchRef = await addDoc(collection(db, 'productionBatches'), {
        batchNumber, productName: d.productName, sopId: d.sopId || '', sopName: d.sopName || '',
        productionDate: Timestamp.fromDate(productionDate), quantityProduced: Number(d.quantityProduced) || 0,
        unit: d.unit || 'lbs', status: d.status || 'backlog', notes: d.notes || '',
        createdAt: serverTimestamp(), createdBy: userInfo, auditLog: [{ action: 'created', changedBy: userInfo, changedAt: now }]
      })
      if (Array.isArray(d.lotsUsed) && d.lotsUsed.length > 0) {
        for (const lotEntry of d.lotsUsed) {
          if (!lotEntry.lotId || !lotEntry.quantityUsed) continue
          const qty = Number(lotEntry.quantityUsed)
          if (!qty || qty <= 0) continue
          try {
            const lotRef = doc(db, 'ingredientLots', lotEntry.lotId)
            const usageRef = doc(collection(db, 'ingredientUsage'))
            await runTransaction(db, async (tx) => {
              const lotSnap = await tx.get(lotRef)
              if (!lotSnap.exists() || lotSnap.data().status !== 'available') return
              const lot = lotSnap.data()
              const newQty = Math.max(0, lot.currentQuantity - qty)
              tx.update(lotRef, {
                currentQuantity: newQty,
                ...(newQty === 0 ? { status: 'used' } : {}),
                auditLog: arrayUnion({ action: `used ${qty} ${lot.unit} in batch ${batchNumber}`, changedBy: userInfo, changedAt: Timestamp.now() }),
              })
              tx.set(usageRef, {
                batchId: batchRef.id, batchNumber, productName: d.productName,
                ingredientId: lot.ingredientId, ingredientName: lot.ingredientName,
                lotId: lotEntry.lotId, internalLotNumber: lot.internalLotNumber, supplierLotNumber: lot.supplierLotNumber || '',
                quantityUsed: qty, unit: lot.unit,
                addedBy: userInfo, usedAt: Timestamp.now(), createdAt: serverTimestamp(),
                auditLog: [{ action: 'created via AI agent', changedBy: userInfo, changedAt: Timestamp.now() }],
              })
            })
          } catch (_) { /* skip lots that fail */ }
        }
      }
      return { label: `Batch ${batchNumber} — ${d.productName}`, navigateTo: `/operations/batches/${batchRef.id}` }
    }
    case 'create_sop': {
      const d = action.data
      const sopNumber = await getNextSopNumber()
      const r = await addDoc(collection(db, 'sops'), {
        name: d.name, sopNumber, productType: d.productType || '', instructions: d.instructions || '',
        notes: d.notes || '', status: 'active',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        createdBy: userInfo, auditLog: [{ action: 'created', changedBy: userInfo, changedAt: now }]
      })
      return { label: `SOP ${sopNumber} — ${d.name}`, navigateTo: `/operations/sops/${r.id}` }
    }
    case 'create_cleaning_log': {
      const d = action.data
      const r = await addDoc(collection(db, 'cleaningLogs'), {
        area: d.area || '', equipment: d.equipment || '', chemical: d.chemical || '',
        concentration: d.concentration || '', notes: d.notes || '', verificationStatus: 'pending',
        completedAt: serverTimestamp(), createdBy: userInfo,
        auditLog: [{ action: 'created', changedBy: userInfo, changedAt: now }]
      })
      return { label: `Cleaning Log — ${d.area || d.equipment}`, navigateTo: `/cleaning/${r.id}` }
    }
    case 'create_maintenance_log': {
      const d = action.data
      const r = await addDoc(collection(db, 'maintenanceLogs'), {
        equipment: d.equipment || '', workDescription: d.workDescription || '',
        notes: d.notes || '', performedBy: userInfo,
        completedAt: serverTimestamp(), createdAt: serverTimestamp()
      })
      return { label: `Maintenance — ${d.equipment}`, navigateTo: null }
    }
    case 'update_inventory': {
      const d = action.data
      await updateDoc(doc(db, 'ingredientLots', d.lotId), {
        currentQuantity: Number(d.newQuantity), updatedAt: serverTimestamp(),
        auditLog: [{ action: `quantity updated to ${d.newQuantity} ${d.unit || ''}${d.reason ? ` — ${d.reason}` : ''}`, changedBy: userInfo, changedAt: now }]
      })
      return { label: `Inventory Updated — ${d.ingredientName || d.lotNumber} → ${d.newQuantity} ${d.unit || ''}`, navigateTo: d.lotId ? `/operations/lots/${d.lotId}` : null }
    }
    case 'submit_timecard': {
      const d = action.data
      const weekStartDate = d.weekStart ? new Date(d.weekStart) : getWeekStart()
      const wLabel = d.weekLabel || weekLabel(weekStartDate)
      const wStr = weekStartStr(weekStartDate)
      let totalHrs = 0
      const punches = Array.isArray(d.punches) ? d.punches : []
      punches.forEach(p => {
        const filled = (p.slots || []).filter(Boolean)
        for (let i = 0; i + 1 < filled.length; i += 2) {
          const [h1, m1] = filled[i].split(':').map(Number)
          const [h2, m2] = filled[i + 1].split(':').map(Number)
          totalHrs += ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60
        }
      })
      await addDoc(collection(db, 'timecards'), {
        userId: currentUser.uid, userEmail: currentUser.email,
        userName: currentUser.displayName || currentUser.email,
        weekStart: Timestamp.fromDate(weekStartDate), weekStartStr: wStr, weekLabel: wLabel,
        punches, totalHours: totalHrs, notes: d.notes || '', submittedAt: serverTimestamp()
      })
      return { label: `Timecard — ${wLabel}`, navigateTo: '/timecard' }
    }
    case 'update_corrective_action': {
      const d = action.data
      const updates = { status: d.status || 'in_progress', updatedAt: serverTimestamp() }
      if (d.correctiveActionTaken) updates.correctiveActionTaken = d.correctiveActionTaken
      if (d.notes) updates.verificationNotes = d.notes
      await updateDoc(doc(db, 'correctiveActions', d.caId), {
        ...updates, auditLog: [{ action: `status → ${d.status}`, changedBy: userInfo, changedAt: now }]
      })
      return { label: `CA ${d.caNumber || d.caId} → ${d.status}`, navigateTo: d.caId ? `/corrective-actions/${d.caId}` : null }
    }
    case 'edit_sop': {
      if (!isAdmin) throw new Error('Admin access required.')
      const d = action.data
      if (!d.sopId) throw new Error('Could not identify which SOP to edit — sopId is missing.')
      const updates = {}
      ;['name','productType','instructions','notes'].forEach(k => { if (d[k] !== undefined) updates[k] = d[k] })
      await updateDoc(doc(db, 'sops', d.sopId), {
        ...updates, updatedAt: serverTimestamp(),
        auditLog: [{ action: 'edited via AI agent', changedBy: userInfo, changedAt: now, changes: updates }]
      })
      return { label: `Edited SOP — ${updates.name || d.sopId}`, navigateTo: `/operations/sops/${d.sopId}` }
    }
    case 'edit_batch': {
      if (!isAdmin) throw new Error('Admin access required.')
      const d = action.data
      if (!d.batchId) throw new Error('Could not identify which batch to edit — batchId is missing.')
      const updates = {}
      ;['status','notes','quantityProduced','unit'].forEach(k => { if (d[k] !== undefined) updates[k] = d[k] })
      await updateDoc(doc(db, 'productionBatches', d.batchId), {
        ...updates, updatedAt: serverTimestamp(),
        auditLog: [{ action: 'edited via AI agent', changedBy: userInfo, changedAt: now, changes: updates }]
      })
      return { label: `Edited Batch — ${d.batchId}`, navigateTo: `/operations/batches/${d.batchId}` }
    }
    case 'edit_cleaning_log': {
      if (!isAdmin) throw new Error('Admin access required.')
      const d = action.data
      if (!d.logId) throw new Error('Could not identify which cleaning log to edit — logId is missing.')
      const updates = {}
      ;['area','equipment','chemical','concentration','notes'].forEach(k => { if (d[k] !== undefined) updates[k] = d[k] })
      await updateDoc(doc(db, 'cleaningLogs', d.logId), {
        ...updates, updatedAt: serverTimestamp(),
        auditLog: [{ action: 'edited via AI agent', changedBy: userInfo, changedAt: now, changes: updates }]
      })
      return { label: `Edited Cleaning Log`, navigateTo: `/cleaning/${d.logId}` }
    }
    case 'edit_log': {
      if (!isAdmin) throw new Error('Admin access required.')
      const d = action.data
      if (!d.docId || !d.collection) throw new Error('Could not identify which record to edit. Please be more specific.')
      await updateDoc(doc(db, d.collection, d.docId), {
        ...d.updates, updatedAt: serverTimestamp(),
        auditLog: [{ action: 'edited via AI agent', changedBy: userInfo, changedAt: now, changes: d.updates }]
      })
      return { label: `Edited: ${d.label || d.docId}`, navigateTo: null }
    }
    case 'mark_recall': {
      if (!isAdmin) throw new Error('Admin access required to mark recalls.')
      const d = action.data
      await updateDoc(doc(db, 'ingredientLots', d.lotId), {
        status: 'recalled', updatedAt: serverTimestamp(),
        auditLog: [{ action: `marked recalled — ${d.reason || ''}`, changedBy: userInfo, changedAt: now }]
      })
      return { label: `Lot ${d.lotNumber} marked as RECALLED`, navigateTo: `/operations/lots/${d.lotId}` }
    }
    case 'add_shopping_item': {
      const d = action.data
      await addDoc(collection(db, 'shoppingList'), { text: d.text, status: 'pending', addedBy: userInfo, addedAt: serverTimestamp() })
      return { label: `Shopping List — ${d.text}`, navigateTo: null }
    }
    case 'create_reminder': {
      const d = action.data
      const dueDate = d.dueDate ? Timestamp.fromDate(new Date(d.dueDate)) : null
      await addDoc(collection(db, 'reminders'), { text: d.text, dueDate, status: 'open', addedBy: userInfo, addedAt: serverTimestamp() })
      return { label: `Reminder — ${d.text}`, navigateTo: null }
    }
    case 'update_business_memory': {
      const d = action.data
      await setDoc(doc(db, 'aiMemory', 'business'), {
        memory: d.memory || '',
        updatedAt: serverTimestamp(),
        updatedBy: userInfo,
      })
      return { label: 'Business memory updated', navigateTo: null }
    }
    // ── Client Orders ──────────────────────────────────────────
    case 'create_client_order': {
      const d = action.data
      const orderNumber = await getNextClientOrderNumber()
      const dueDate = d.dueDate ? Timestamp.fromDate(new Date(d.dueDate)) : null
      const r = await addDoc(collection(db, 'clientOrders'), {
        orderNumber, customerId: d.customerId || '', customerName: d.customerName || '',
        product: d.product || '', orderedQuantity: Number(d.orderedQuantity) || 0, unit: d.unit || '',
        dueDate, poNumber: d.poNumber || '', status: 'open', notes: d.notes || '',
        createdAt: serverTimestamp(), createdBy: userInfo,
        auditLog: [{ action: 'created via AI agent', changedBy: userInfo, changedAt: now }],
      })
      return { label: `Client Order ${orderNumber} — ${d.product}`, navigateTo: `/operations/client-orders/${r.id}` }
    }
    case 'edit_client_order': {
      if (!isAdmin) throw new Error('Admin access required.')
      const d = action.data
      if (!d.clientOrderId) throw new Error('clientOrderId is required.')
      const updates = {}
      ;['status','notes','orderedQuantity','unit','dueDate','poNumber'].forEach(k => { if (d[k] !== undefined) updates[k] = d[k] })
      await updateDoc(doc(db, 'clientOrders', d.clientOrderId), {
        ...updates, updatedAt: serverTimestamp(),
        auditLog: arrayUnion({ action: 'edited via AI agent', changedBy: userInfo, changedAt: now, changes: updates }),
      })
      return { label: `Client Order updated`, navigateTo: `/operations/client-orders/${d.clientOrderId}` }
    }
    // ── Work Orders (productionBatches) ────────────────────────
    case 'create_work_order': {
      // Alias for create_batch with new terminology
      const d = action.data
      const batchNumber = await getNextBatchNumber()
      const productionDate = d.plannedDate ? new Date(d.plannedDate + 'T00:00:00') : new Date()
      const r = await addDoc(collection(db, 'productionBatches'), {
        batchNumber, productName: d.product || d.productName || '',
        sopId: d.sopId || '', sopName: d.sopName || '',
        productionDate: Timestamp.fromDate(productionDate),
        plannedQuantity: Number(d.plannedQuantity) || 0,
        quantityProduced: 0, unit: d.unit || '',
        clientOrderId: d.clientOrderId || '', clientOrderNumber: d.clientOrderNumber || '',
        status: d.status || 'backlog', notes: d.notes || '',
        createdAt: serverTimestamp(), createdBy: userInfo,
        auditLog: [{ action: 'created via AI agent', changedBy: userInfo, changedAt: now }],
      })
      return { label: `Work Order ${batchNumber} — ${d.product || d.productName}`, navigateTo: `/operations/batches/${r.id}` }
    }
    case 'release_fg_lot': {
      if (!isAdmin) throw new Error('Admin access required.')
      const d = action.data
      if (!d.fgLotId) throw new Error('fgLotId is required.')
      await updateDoc(doc(db, 'finishedGoodsLots', d.fgLotId), {
        status: 'released', qcReleaseStatus: 'released',
        releasedAt: serverTimestamp(), releasedBy: userInfo,
        auditLog: arrayUnion({ action: 'released via AI agent', changedBy: userInfo, changedAt: now }),
      })
      return { label: `FG Lot released`, navigateTo: `/operations/fg-lots/${d.fgLotId}` }
    }
    case 'navigate_to':
      return { label: action.data.label, navigateTo: action.data.path }
    default:
      throw new Error(`Unknown action type: ${action.type}`)
  }
}
