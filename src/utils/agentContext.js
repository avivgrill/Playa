import { collection, query, where, getDocs, getDoc, doc, limit, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const d = start
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: Timestamp.fromDate(start), dateStr }
}

export async function buildAgentContext(currentUser) {
  const { dateStr } = todayRange()

  const [
    inspectionsSnap,
    casSnap,
    activeBatchesSnap,
    queuedBatchesSnap,
    recentBatchesSnap,
    holdLotsSnap,
    maintenanceSnap,
    sopSnap,
    availableLotsSnap,
    ingredientsSnap,
    customersSnap,
    shoppingSnap,
    businessMemorySnap,
    clientOrdersSnap,
    fgLotsHoldSnap,
  ] = await Promise.all([
    getDocs(query(collection(db, 'inspections'), where('date', '==', dateStr))),
    getDocs(query(collection(db, 'correctiveActions'), where('status', 'in', ['open', 'in_progress']), limit(20))),
    getDocs(query(collection(db, 'productionBatches'), where('status', 'in', ['in_production', 'queued']), limit(20))),
    getDocs(query(collection(db, 'productionBatches'), where('status', '==', 'backlog'), limit(20))),
    getDocs(query(collection(db, 'productionBatches'), where('status', 'in', ['complete', 'released', 'packaged']), limit(50))),
    getDocs(query(collection(db, 'ingredientLots'), where('status', '==', 'hold'))),
    getDocs(query(collection(db, 'maintenanceLogs'), limit(10))),
    getDocs(query(collection(db, 'sops'), where('status', '==', 'active'), limit(50))),
    getDocs(query(collection(db, 'ingredientLots'), where('status', '==', 'available'), limit(100))),
    getDocs(query(collection(db, 'ingredients'), where('status', '==', 'active'), limit(100))),
    getDocs(query(collection(db, 'customers'), where('status', '==', 'active'), limit(50))),
    getDocs(query(collection(db, 'shoppingList'), where('status', 'in', ['pending', 'ordered']))),
    getDoc(doc(db, 'aiMemory', 'business')),
    getDocs(query(collection(db, 'clientOrders'), where('status', 'in', ['open', 'in_production']), limit(30))),
    getDocs(query(collection(db, 'finishedGoodsLots'), where('status', '==', 'hold'), limit(20))),
  ])

  const inspectionsToday = inspectionsSnap.docs.map(d => ({
    id: d.id, type: d.data().type, result: d.data().overallResult
  }))

  const requiredInspections = ['daily_facility', 'pre_operational']
  const completedTypes = inspectionsToday.map(i => i.type)
  const missingInspectionsToday = requiredInspections.filter(t => !completedTypes.includes(t))

  const overdueCAs = casSnap.docs
    .map(d => {
      const data = d.data()
      const due = data.dueDate?.toDate?.()
      return {
        id: d.id,
        caNumber: data.caNumber,
        description: data.description || data.sourceItemLabel,
        status: data.status,
        dueDate: due?.toISOString?.()?.slice(0, 10) ?? null,
        isOverdue: due ? due < new Date() : false
      }
    })
    .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''))

  const activeWorkOrders = activeBatchesSnap.docs.map(d => ({
    id: d.id,
    batchNumber: d.data().batchNumber,
    productName: d.data().productName,
    status: d.data().status,
    plannedQuantity: d.data().plannedQuantity || d.data().quantityProduced || 0,
    unit: d.data().unit,
    clientOrderId: d.data().clientOrderId || '',
    clientOrderNumber: d.data().clientOrderNumber || '',
    productionDate: d.data().productionDate?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? null
  }))

  const backlogWorkOrders = queuedBatchesSnap.docs
    .map(d => ({
      id: d.id,
      batchNumber: d.data().batchNumber,
      productName: d.data().productName,
      status: d.data().status,
      plannedQuantity: d.data().plannedQuantity || d.data().quantityProduced || 0,
      unit: d.data().unit,
      productionDate: d.data().productionDate?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? null
    }))
    .sort((a, b) => (a.productionDate || '').localeCompare(b.productionDate || ''))

  const recentWorkOrders = recentBatchesSnap.docs
    .map(d => ({
      id: d.id,
      batchNumber: d.data().batchNumber,
      productName: d.data().productName,
      status: d.data().status,
      plannedQuantity: d.data().plannedQuantity || d.data().quantityProduced || 0,
      unit: d.data().unit,
      productionDate: d.data().productionDate?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? null,
    }))
    .sort((a, b) => (b.productionDate || '').localeCompare(a.productionDate || ''))
    .slice(0, 20)

  const clientOrders = clientOrdersSnap.docs
    .map(d => ({
      id: d.id,
      orderNumber: d.data().orderNumber,
      customerName: d.data().customerName || '',
      product: d.data().product,
      orderedQuantity: d.data().orderedQuantity || 0,
      unit: d.data().unit || '',
      status: d.data().status,
      dueDate: d.data().dueDate?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? null,
    }))
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))

  const fgLotsOnHold = fgLotsHoldSnap.docs.map(d => ({
    id: d.id,
    fgLotNumber: d.data().fgLotNumber,
    product: d.data().product,
    quantityProduced: d.data().quantityProduced || 0,
    unit: d.data().unit || '',
    qcReleaseStatus: d.data().qcReleaseStatus || 'pending',
    createdDate: d.data().createdDate?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? null,
  }))

  const holdLots = holdLotsSnap.docs.map(d => ({
    id: d.id,
    lotNumber: d.data().internalLotNumber,
    ingredientName: d.data().ingredientName,
    quantity: d.data().currentQuantity,
    unit: d.data().unit
  }))

  const recentMaintenance = maintenanceSnap.docs
    .map(d => ({
      id: d.id,
      equipment: d.data().equipment,
      workDescription: d.data().workDescription,
      performedBy: d.data().performedBy?.displayName,
      completedAt: d.data().completedAt?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? null
    }))
    .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))

  const sops = sopSnap.docs
    .map(d => ({
      id: d.id,
      sopNumber: d.data().sopNumber || '',
      name: d.data().name,
      productType: d.data().productType,
      instructions: d.data().instructions || '',
      notes: d.data().notes || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const availableLots = availableLotsSnap.docs
    .map(d => ({
      id: d.id,
      lotNumber: d.data().internalLotNumber,
      ingredientId: d.data().ingredientId,
      ingredientName: d.data().ingredientName,
      quantity: d.data().currentQuantity,
      unit: d.data().unit,
      receivedDate: d.data().receivedDate?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? null,
    }))
    .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName) || (a.receivedDate || '').localeCompare(b.receivedDate || ''))

  const ingredients = ingredientsSnap.docs
    .map(d => ({
      id: d.id,
      name: d.data().name,
      category: d.data().category,
      unit: d.data().unit,
      supplier: d.data().supplier || '',
      allergens: d.data().allergens || [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const customers = customersSnap.docs
    .map(d => ({
      id: d.id,
      name: d.data().name,
      contactName: d.data().contactName || '',
      email: d.data().email || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const shoppingList = shoppingSnap.docs
    .map(d => ({ id: d.id, text: d.data().text, status: d.data().status }))
    .sort((a, b) => a.status.localeCompare(b.status))

  const businessMemory = businessMemorySnap.exists()
    ? businessMemorySnap.data().memory || ''
    : ''

  return {
    today: dateStr,
    user: {
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email,
      email: currentUser.email
    },
    inspectionsToday,
    missingInspectionsToday,
    overdueCAs,
    activeWorkOrders,
    backlogWorkOrders,
    recentWorkOrders,
    clientOrders,
    fgLotsOnHold,
    holdLots,
    recentMaintenance,
    sops,
    availableLots,
    ingredients,
    customers,
    shoppingList,
    businessMemory,
  }
}
