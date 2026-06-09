import { doc, runTransaction } from 'firebase/firestore'
import { db } from '../firebase/config'

export async function getNextCANumber() {
  const counterRef = doc(db, 'counters', 'caCounter')
  let caNumber = ''
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const year = new Date().getFullYear()
    if (!snap.exists()) {
      tx.set(counterRef, { value: 1, year })
      caNumber = `CA-${year}-001`
    } else {
      const data = snap.data()
      const newValue = data.year === year ? data.value + 1 : 1
      tx.update(counterRef, { value: newValue, year })
      caNumber = `CA-${year}-${String(newValue).padStart(3, '0')}`
    }
  })
  return caNumber
}
