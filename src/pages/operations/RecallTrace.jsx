import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { collection, getDocs, query, doc, getDoc, where, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, formatDateTime } from '../../utils/format'
import { card, badge, btn } from '../../styles/common'

export default function RecallTrace() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser } = useAuth()

  const [search, setSearch] = useState('')
  const [allLots, setAllLots] = useState(null)
  const [results, setResults] = useState([])
  const [selectedLot, setSelectedLot] = useState(null)
  const [trace, setTrace] = useState(null)
  const [loading, setLoading] = useState(false)
  const [traceLoading, setTraceLoading] = useState(false)
  const [recalling, setRecalling] = useState(false)

  useEffect(() => {
    const preselect = searchParams.get('lotId')
    if (preselect) {
      getDoc(doc(db, 'ingredientLots', preselect)).then(snap => {
        if (snap.exists()) {
          const lot = { id: snap.id, ...snap.data() }
          setSearch(lot.internalLotNumber)
          selectLot(lot)
        }
      })
    }
  }, [])

  async function handleSearch(e) {
    e.preventDefault()
    if (!search.trim()) return
    setLoading(true)
    setSelectedLot(null)
    setTrace(null)

    let lots = allLots
    if (!lots) {
      const snap = await getDocs(collection(db, 'ingredientLots'))
      lots = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setAllLots(lots)
    }

    const s = search.toLowerCase().trim()
    const matched = lots.filter(l =>
      l.ingredientName?.toLowerCase().includes(s) ||
      l.internalLotNumber?.toLowerCase().includes(s) ||
      l.supplierLotNumber?.toLowerCase().includes(s)
    ).sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))

    setResults(matched)
    setLoading(false)
  }

  async function selectLot(lot) {
    setSelectedLot(lot)
    setTraceLoading(true)
    setTrace(null)

    const usageSnap = await getDocs(query(collection(db, 'ingredientUsage'), where('lotId', '==', lot.id)))
    const usageRecords = usageSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    const batchIds = [...new Set(usageRecords.map(u => u.batchId).filter(Boolean))]
    const [batches, allocations] = await Promise.all([
      Promise.all(batchIds.map(bid => getDoc(doc(db, 'productionBatches', bid)))),
      Promise.all(batchIds.map(bid => getDocs(query(collection(db, 'batchAllocations'), where('batchId', '==', bid))))),
    ])

    const batchMap = {}
    batches.forEach(snap => { if (snap.exists()) batchMap[snap.id] = { id: snap.id, ...snap.data() } })

    const allAllocations = allocations.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })))
    const uniqueCustomers = [...new Map(allAllocations.map(a => [a.customerId, { id: a.customerId, name: a.customerName }])).values()]

    setTrace({ usageRecords, batches: batchMap, allocations: allAllocations, customers: uniqueCustomers })
    setTraceLoading(false)
  }

  async function markRecalled() {
    if (!window.confirm(`Mark lot ${selectedLot.internalLotNumber} as RECALLED?\n\nThis will prevent further use of this lot.`)) return
    setRecalling(true)
    const userInfo = { uid: currentUser.uid, displayName: currentUser.displayName || currentUser.email, email: currentUser.email }
    await updateDoc(doc(db, 'ingredientLots', selectedLot.id), {
      status: 'recalled',
      auditLog: arrayUnion({ action: 'marked as recalled', changedBy: userInfo, changedAt: Timestamp.now() }),
    })
    const updated = { ...selectedLot, status: 'recalled' }
    setSelectedLot(updated)
    if (allLots) setAllLots(prev => prev.map(l => l.id === selectedLot.id ? updated : l))
    setResults(prev => prev.map(l => l.id === selectedLot.id ? updated : l))
    setRecalling(false)
  }

  const STATUS_COLORS = { available: '#16a34a', hold: '#d97706', used: '#9ca3af', recalled: '#dc2626' }

  return (
    <div>
      <h1 style={pageTitle}>Recall Trace</h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Search by ingredient name, supplier lot number, or internal lot number.
      </p>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          style={{ flex: 1, padding: '0.8rem 1rem', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: '1rem', background: '#fff' }}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Ingredient name, lot number…"
          autoFocus
        />
        <button type="submit" style={{ ...btn.primary, whiteSpace: 'nowrap' }} disabled={loading}>
          {loading ? '…' : 'Search'}
        </button>
      </form>

      {/* Search Results */}
      {results.length > 0 && !selectedLot && (
        <div>
          <h2 style={sectionHead}>{results.length} lot{results.length !== 1 ? 's' : ''} found</h2>
          {results.map(lot => (
            <div key={lot.id} style={{ ...card, cursor: 'pointer', borderLeft: `4px solid ${STATUS_COLORS[lot.status] || '#d1d5db'}` }}
              onClick={() => selectLot(lot)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{lot.ingredientName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{lot.internalLotNumber}</div>
                  {lot.supplierLotNumber && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Supplier: {lot.supplierLotNumber}</div>}
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Received {formatDate(lot.receivedDate)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={badge[lot.status] || badge.available}>{lot.status}</span>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    {lot.currentQuantity} / {lot.originalQuantity} {lot.unit}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && allLots !== null && (
        <p style={muted}>No lots found. Try a different search term.</p>
      )}

      {/* Trace View */}
      {selectedLot && (
        <div>
          <button style={{ ...btn.secondary, marginBottom: '1rem', fontSize: '0.85rem' }} onClick={() => { setSelectedLot(null); setTrace(null) }}>
            ← Back to results
          </button>

          {/* Lot Summary */}
          <div style={{ ...card, borderLeft: `4px solid ${STATUS_COLORS[selectedLot.status] || '#d1d5db'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{selectedLot.ingredientName}</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{selectedLot.internalLotNumber}</div>
              </div>
              <span style={{ ...(badge[selectedLot.status] || badge.available), fontSize: '0.85rem' }}>{selectedLot.status}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {selectedLot.supplierLotNumber && <span>Supplier lot: <strong>{selectedLot.supplierLotNumber}</strong></span>}
              <span>Received: <strong>{formatDate(selectedLot.receivedDate)}</strong></span>
              <span>Qty: <strong>{selectedLot.currentQuantity} / {selectedLot.originalQuantity} {selectedLot.unit}</strong></span>
            </div>
            {selectedLot.status !== 'recalled' && (
              <button
                style={{ marginTop: '0.75rem', background: '#fff', border: '1.5px solid #dc2626', color: '#dc2626', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={markRecalled}
                disabled={recalling}
              >
                {recalling ? '…' : '⚠ Mark Lot as Recalled'}
              </button>
            )}
            {selectedLot.status === 'recalled' && (
              <div style={{ marginTop: '0.75rem', background: '#fee2e2', borderRadius: 6, padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#b91c1c', fontWeight: 600 }}>
                ⚠ This lot has been recalled. Further use is prevented.
              </div>
            )}
          </div>

          {traceLoading && <p style={muted}>Loading trace…</p>}

          {trace && (
            <div>
              {/* Impact Summary */}
              <div style={{ ...card, background: trace.customers.length > 0 ? '#fef2f2' : '#f0fdf4', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <Stat label="Batches" value={Object.keys(trace.batches).length} />
                <Stat label="Customers" value={trace.customers.length} color={trace.customers.length > 0 ? '#dc2626' : '#16a34a'} />
                <Stat label="Allocations" value={trace.allocations.length} />
              </div>

              {/* Batches */}
              {Object.keys(trace.batches).length === 0 ? (
                <div style={{ ...card, background: '#f0fdf4' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#15803d' }}>✓ This lot has not been used in any production batch.</p>
                </div>
              ) : (
                <>
                  <h2 style={sectionHead}>Production Batches ({Object.keys(trace.batches).length})</h2>
                  {Object.values(trace.batches).map(batch => {
                    const batchUsage = trace.usageRecords.filter(u => u.batchId === batch.id)
                    const batchAllocs = trace.allocations.filter(a => a.batchId === batch.id)
                    return (
                      <div key={batch.id} style={{ ...card, borderLeft: '4px solid #1d4ed8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.8rem' }}>{batch.batchNumber}</div>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{batch.productName}</div>
                          </div>
                          <button style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                            onClick={() => navigate(`/operations/batches/${batch.id}`)}>
                            View →
                          </button>
                        </div>
                        {batchUsage.map(u => (
                          <div key={u.id} style={{ fontSize: '0.8rem', color: '#6b7280', padding: '0.2rem 0' }}>
                            Used: <strong>{u.quantityUsed} {u.unit}</strong> on {formatDate(u.usedAt)}
                          </div>
                        ))}
                        {batchAllocs.length > 0 && (
                          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: '0.3rem' }}>Customer Allocations</div>
                            {batchAllocs.map(a => (
                              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151', padding: '0.2rem 0' }}>
                                <span>📦 {a.customerName}</span>
                                <span style={{ fontWeight: 600, color: '#dc2626' }}>{a.quantityAllocated} {a.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}

              {/* Affected Customers */}
              {trace.customers.length > 0 && (
                <>
                  <h2 style={{ ...sectionHead, color: '#dc2626' }}>⚠ Affected Customers ({trace.customers.length})</h2>
                  {trace.customers.map(c => (
                    <div key={c.id} style={{ ...card, cursor: 'pointer', borderLeft: '4px solid #dc2626' }}
                      onClick={() => navigate(`/operations/customers/${c.id}`)}>
                      <div style={{ fontWeight: 600, color: '#374151' }}>{c.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        {trace.allocations.filter(a => a.customerId === c.id).map(a => `${a.quantityAllocated} ${a.unit} (${a.batchNumber})`).join(' · ')}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color || '#1d4ed8' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

const pageTitle = { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }
const sectionHead = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: '1rem 0 0.5rem' }
const muted = { color: '#9ca3af', fontSize: '0.875rem' }
