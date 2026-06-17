import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { formatDateTime } from '../../utils/format'
import { card, badge } from '../../styles/common'

export default function ProductionLogDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [log, setLog] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'productionLogs', id)).then(snap => {
      if (snap.exists()) setLog({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
  }, [id])

  if (loading) return <p style={{ color: '#9ca3af', padding: '1rem' }}>Loading…</p>
  if (!log) return <p style={{ color: '#dc2626', padding: '1rem' }}>Log not found.</p>

  return (
    <div>
      <button style={backBtn} onClick={() => navigate('/operations/logs')}>← Production Logs</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em' }}>
            {log.batchNumber}
          </div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>
            {log.productName || 'Production Log'}
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
          {log.signature?.signedBy && <span style={badge.verified}>Signed</span>}
          {log.deviations && <span style={badge.hold}>Deviation</span>}
        </div>
      </div>

      <div style={card}>
        <Row label="Operator" value={log.operator || '—'} />
        {log.sopName && <Row label="SOP" value={log.sopName} />}
        <Row label="Start Time" value={formatDateTime(log.startTime)} />
        <Row label="End Time" value={log.endTime ? formatDateTime(log.endTime) : 'Ongoing'} />
        {log.equipment && <Row label="Equipment" value={log.equipment} />}
        <Row label="Logged by" value={log.createdBy?.displayName || log.createdBy?.email} />
      </div>

      {log.notes && (
        <div style={card}>
          <h2 style={sectionHead}>Notes</h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0, lineHeight: 1.6 }}>{log.notes}</p>
        </div>
      )}

      {log.deviations && (
        <div style={{ ...card, borderLeft: '4px solid #f59e0b' }}>
          <h2 style={{ ...sectionHead, color: '#b45309' }}>⚠ Deviations</h2>
          <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0, lineHeight: 1.6 }}>{log.deviations}</p>
        </div>
      )}

      {log.photoUrls?.length > 0 && (
        <div style={card}>
          <h2 style={sectionHead}>Photos</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {log.photoUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={`Photo ${i + 1}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {log.signature?.signedBy && (
        <div style={{ ...card, background: '#f0fdf4', borderLeft: '4px solid #16a34a' }}>
          <h2 style={sectionHead}>Electronic Signature</h2>
          <Row label="Signed by" value={log.signature.signedBy} />
          <Row label="Signed at" value={formatDateTime(log.signature.signedAt)} />
        </div>
      )}

      <button
        style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '0.875rem', cursor: 'pointer', padding: 0 }}
        onClick={() => navigate(`/operations/batches/${log.batchId}`)}
      >
        View Batch →
      </button>
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
const sectionHead = { fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.5rem' }
