import { doc, runTransaction } from 'firebase/firestore'
import { db } from '../firebase/config'

export async function getNextBatchNumber() {
  const counterRef = doc(db, 'counters', 'batchCounter')
  let batchNumber = ''
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const year = new Date().getFullYear()
    if (!snap.exists()) {
      tx.set(counterRef, { value: 1, year })
      batchNumber = `BATCH-${year}-001`
    } else {
      const data = snap.data()
      const newValue = data.year === year ? data.value + 1 : 1
      tx.update(counterRef, { value: newValue, year })
      batchNumber = `BATCH-${year}-${String(newValue).padStart(3, '0')}`
    }
  })
  return batchNumber
}
