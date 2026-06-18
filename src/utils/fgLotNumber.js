import { doc, runTransaction } from 'firebase/firestore'
import { db } from '../firebase/config'

export async function getNextFgLotNumber() {
  const counterRef = doc(db, 'counters', 'fgLotCounter')
  let fgLotNumber = ''
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const year = new Date().getFullYear()
    const yr = String(year).slice(2)
    if (!snap.exists()) {
      tx.set(counterRef, { value: 1, year })
      fgLotNumber = `FG${yr}-001`
    } else {
      const data = snap.data()
      const newValue = data.year === year ? data.value + 1 : 1
      tx.update(counterRef, { value: newValue, year })
      fgLotNumber = `FG${yr}-${String(newValue).padStart(3, '0')}`
    }
  })
  return fgLotNumber
}
