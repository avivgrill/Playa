export default function SlideOver({ title, onClose, children }) {
  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.panel} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          {title ? <span style={s.title}>{title}</span> : <span />}
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        <div style={s.body}>{children}</div>
      </div>
    </div>
  )
}

const s = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999, display: 'flex', justifyContent: 'flex-end' },
  panel: { background: '#fff', width: '100%', maxWidth: 580, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6', position: 'sticky', top: 0, background: '#fff', zIndex: 1 },
  title: { fontSize: '1rem', fontWeight: 700, color: '#111827' },
  close: { background: 'none', border: 'none', fontSize: '1.1rem', color: '#9ca3af', cursor: 'pointer', padding: '0.25rem 0.5rem', lineHeight: 1 },
  body: { padding: '1.25rem', flex: 1 },
}
