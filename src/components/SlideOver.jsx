export default function SlideOver({ onClose, children }) {
  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.panel} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

const s = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999 },
  panel: { position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '100vw', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
}
