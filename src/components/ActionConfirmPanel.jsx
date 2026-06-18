import { useState } from 'react'
import { card, btn } from '../styles/common'

const ACTION_LABELS = {
  create_ingredient: 'New Ingredient',
  receive_lot: 'Receive Inventory',
  create_batch: 'New Batch',
  create_sop: 'New SOP',
  create_production_log: 'Production Log',
  create_cleaning_log: 'Cleaning Log',
  create_maintenance_log: 'Maintenance Log',
  update_inventory: 'Update Inventory',
  submit_timecard: 'Submit Timecard',
  update_corrective_action: 'Update Corrective Action',
  edit_log: 'Edit Record',
  batch_create_cleaning_logs: 'Batch Cleaning Logs',
  batch_create_inspection_logs: 'Batch Inspection Logs',
  mark_recall: 'Mark Recall',
  recall_checklist: 'Recall Protocol',
  add_shopping_item: 'Add to Shopping List',
  create_reminder: 'New Reminder',
  navigate_to: 'Open Form',
}

const ACTION_COLORS = {
  create_ingredient: '#1d4ed8',
  receive_lot: '#15803d',
  create_batch: '#7e22ce',
  create_sop: '#0891b2',
  create_production_log: '#1d4ed8',
  create_cleaning_log: '#15803d',
  create_maintenance_log: '#b45309',
  update_inventory: '#b45309',
  submit_timecard: '#7e22ce',
  update_corrective_action: '#dc2626',
  edit_log: '#dc2626',
  mark_recall: '#dc2626',
  recall_checklist: '#dc2626',
}

// Non-write action types
const DISPLAY_ONLY_TYPES = new Set(['recall_checklist', 'navigate_to'])

// Fields to skip rendering as inputs (handled specially or auto-set)
const SKIP_FIELDS = new Set(['type', 'label', 'navigateTo'])

// Fields that are arrays or objects — render as JSON textarea
function isComplex(val) {
  return Array.isArray(val) || (val !== null && typeof val === 'object')
}

function FieldEditor({ fieldKey, value, onChange }) {
  if (isComplex(value)) {
    return (
      <textarea
        value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        onChange={e => {
          try { onChange(fieldKey, JSON.parse(e.target.value)) }
          catch { onChange(fieldKey, e.target.value) }
        }}
        style={{ ...fieldInput, minHeight: 80, fontFamily: 'monospace', fontSize: '0.8rem' }}
      />
    )
  }
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={e => onChange(fieldKey, e.target.value)}
      style={fieldInput}
    />
  )
}

function ActionCard({ action, index, onDataChange }) {
  const color = ACTION_COLORS[action.type] ?? '#374151'
  const label = ACTION_LABELS[action.type] ?? action.type

  // navigate_to: render as an "Open Form" suggestion
  if (action.type === 'navigate_to') {
    return (
      <div style={{ ...card, borderLeft: `4px solid #0891b2`, marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ ...typeBadge, background: '#0891b2' }}>Open Form</span>
          <span style={{ fontSize: '0.9rem', color: '#111827', flex: 1 }}>{action.data.label}</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0.5rem 0 0' }}>
          Clicking Confirm will open this form directly.
        </p>
      </div>
    )
  }

  // recall_checklist: render as a read-only checklist
  if (action.type === 'recall_checklist') {
    return (
      <div style={{ ...card, borderLeft: `4px solid ${color}`, marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ ...typeBadge, background: color }}>Recall Protocol</span>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            {Array.isArray(action.data.lotNumbers) ? action.data.lotNumbers.join(', ') : ''}
          </span>
        </div>
        {Array.isArray(action.data.steps) && (
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#374151', lineHeight: 1.7 }}>
            {action.data.steps.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        )}
        <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.75rem', marginBottom: 0 }}>
          This is a protocol checklist — no records will be created automatically.
        </p>
      </div>
    )
  }

  const fields = Object.entries(action.data || {}).filter(([k]) => !SKIP_FIELDS.has(k))

  return (
    <div style={{ ...card, borderLeft: `4px solid ${color}`, marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ ...typeBadge, background: color }}>#{index + 1} {label}</span>
        {action.label && (
          <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{action.label}</span>
        )}
      </div>
      <div className="form-row" style={{ gap: '0.5rem 1rem' }}>
        {fields.map(([key, val]) => (
          <div key={key} style={isComplex(val) ? { gridColumn: '1 / -1' } : {}}>
            <div style={fieldLabel}>{camelToLabel(key)}</div>
            <FieldEditor
              fieldKey={key}
              value={val}
              onChange={(k, v) => onDataChange(index, k, v)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ActionConfirmPanel({ actions, onConfirm, onCancel, loading }) {
  const [editedActions, setEditedActions] = useState(() =>
    actions.map(a => ({ ...a, data: { ...a.data } }))
  )

  function handleDataChange(actionIndex, fieldKey, value) {
    setEditedActions(prev => {
      const updated = [...prev]
      updated[actionIndex] = {
        ...updated[actionIndex],
        data: { ...updated[actionIndex].data, [fieldKey]: value }
      }
      return updated
    })
  }

  // Separate write actions from display-only (recall checklist stays display-only, navigate_to goes through)
  const writeActions = editedActions.filter(a => a.type !== 'recall_checklist')
  const hasActions = writeActions.length > 0
  const onlyNav = writeActions.length > 0 && writeActions.every(a => a.type === 'navigate_to')

  return (
    <div style={panelWrap}>
      <div style={panelHeader}>
        <span style={{ fontWeight: 600, color: '#111827' }}>
          {onlyNav ? 'Open form?' : `Review ${writeActions.length} action${writeActions.length > 1 ? 's' : ''} before confirming`}
        </span>
        {!onlyNav && <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>You can edit any field before confirming</span>}
      </div>

      {editedActions.map((action, i) => (
        <ActionCard
          key={i}
          action={action}
          index={i}
          onDataChange={handleDataChange}
        />
      ))}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        {hasActions && (
          <button
            style={{ ...btn.success, fontSize: '0.9rem', padding: '0.65rem 1.25rem', opacity: loading ? 0.6 : 1 }}
            onClick={() => onConfirm(writeActions)}
            disabled={loading}
          >
            {loading ? 'Saving…' : onlyNav ? 'Open Form →' : `Confirm${writeActions.filter(a => a.type !== 'navigate_to').length > 1 ? ` All (${writeActions.filter(a => a.type !== 'navigate_to').length})` : ''}`}
          </button>
        )}
        <button
          style={{ ...btn.secondary, fontSize: '0.9rem', padding: '0.65rem 1.25rem' }}
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function camelToLabel(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim()
}

// ─── styles ───────────────────────────────────────────────────────────────────

const panelWrap = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '1rem',
  marginTop: '0.75rem',
}

const panelHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.875rem',
}

const typeBadge = {
  color: '#fff',
  fontSize: '0.72rem',
  fontWeight: 700,
  padding: '0.2rem 0.6rem',
  borderRadius: 99,
  letterSpacing: '0.02em',
}

const fieldLabel = {
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#6b7280',
  marginBottom: '0.2rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const fieldInput = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '0.4rem 0.6rem',
  fontSize: '0.875rem',
  background: '#fff',
  boxSizing: 'border-box',
}
