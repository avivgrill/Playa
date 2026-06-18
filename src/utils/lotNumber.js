import { doc, runTransaction } from 'firebase/firestore'
import { db } from '../firebase/config'

export async function getNextLotNumber() {
  const counterRef = doc(db, 'counters', 'lotCounter')
  let lotNumber = ''
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const year = new Date().getFullYear()
    const yr = String(year).slice(2)
    if (!snap.exists()) {
      tx.set(counterRef, { value: 1, year })
      lotNumber = `L${yr}-001`
    } else {
      const data = snap.data()
      const newValue = data.year === year ? data.value + 1 : 1
      tx.update(counterRef, { value: newValue, year })
      lotNumber = `L${yr}-${String(newValue).padStart(3, '0')}`
    }
  })
  return lotNumber
}
