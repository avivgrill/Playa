import { doc, runTransaction } from 'firebase/firestore'
import { db } from '../firebase/config'

export async function getNextLotNumber(receivedDate) {
  const date = typeof receivedDate === 'string'
    ? new Date(receivedDate + 'T00:00:00')
    : (receivedDate instanceof Date ? receivedDate : new Date())
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const dateStr = `${y}${m}${d}`

  const counterRef = doc(db, 'counters', 'lotCounter')
  let lotNumber = ''
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    if (!snap.exists()) {
      tx.set(counterRef, { value: 1, year: y })
      lotNumber = `ING-${dateStr}-001`
    } else {
      const data = snap.data()
      const newValue = data.year === y ? data.value + 1 : 1
      tx.update(counterRef, { value: newValue, year: y })
      lotNumber = `ING-${dateStr}-${String(newValue).padStart(3, '0')}`
    }
  })
  return lotNumber
}
