export default function Modal({ title, onClose, children, maxWidth = 480 }) {
  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={{ ...s.box, maxWidth }} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.title}>{title}</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        <div style={s.body}>{children}</div>
      </div>
    </div>
  )
}

const s = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  box: { background: '#fff', borderRadius: 12, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' },
  title: { fontSize: '1rem', fontWeight: 700, color: '#111827' },
  close: { background: 'none', border: 'none', fontSize: '1rem', color: '#9ca3af', cursor: 'pointer', padding: '0.25rem' },
  body: { padding: '1.25rem', overflowY: 'auto' },
}
