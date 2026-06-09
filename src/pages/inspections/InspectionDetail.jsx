import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDateTime } from '../../utils/format'
import { card, badge } from '../../styles/common'

export default function InspectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [insp, setInsp] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'inspections', id)).then(snap => {
      if (snap.exists()) setInsp({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
  }, [id])

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>Loading…</p>
  if (!insp) return <p style={{ color: '#dc2626', padding: '1rem' }}>Inspection not found.</p>

  const title = insp.type === 'daily_facility' ? 'Daily Facility Inspection' : 'Pre-Operational Inspection'

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/inspections')}>← Inspection History</button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{title}</h1>
        <span style={insp.overallResult === 'pass' ? badge.pass : badge.fail}>{insp.overallResult?.toUpperCase()}</span>
      </div>

      <div style={card}>
        <Row label="Completed by" value={insp.createdBy?.displayName || insp.createdBy?.email} />
        <Row label="Date / Time" value={formatDateTime(insp.completedAt)} />
        <Row label="Signed by" value={insp.signature?.signedBy || '—'} />
        <Row label="Result" value={insp.overallResult === 'pass' ? 'All items passed' : `${insp.failedItemCount} item(s) failed`} />
      </div>

      <h2 style={sectionHead}>Checklist Items</h2>
      {insp.items?.map(item => (
        <div key={item.id} style={{
          ...card,
          borderLeft: `4px solid ${item.result === 'pass' ? '#16a34a' : item.result === 'fail' ? '#dc2626' : '#d1d5db'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.95rem', color: '#374151' }}>{item.label}</span>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
              color: item.result === 'pass' ? '#16a34a' : item.result === 'fail' ? '#dc2626' : '#9ca3af',
            }}>
              {item.result === 'na' ? 'N/A' : item.result?.toUpperCase()}
            </span>
          </div>
          {item.notes && <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.4rem' }}>{item.notes}</p>}
          {item.photoUrl && (
            <img src={item.photoUrl} alt="Inspection photo" style={{ marginTop: '0.5rem', maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'cover' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.875rem' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#111827', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const backBtn = { background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }
const sectionHead = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: '1rem 0 0.5rem' }
