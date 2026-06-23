import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  collection, addDoc, doc, updateDoc, deleteDoc, getDocs,
  query, where, serverTimestamp, Timestamp, runTransaction, arrayUnion
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db, storage } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { buildAgentContext } from '../utils/agentContext'
import { getNextBatchNumber } from '../utils/batchNumber'
import { getNextLotNumber } from '../utils/lotNumber'
import { getNextSopNumber } from '../utils/sopNumber'
import { getWeekStart, weekLabel, weekStartStr } from '../utils/timecard'
import ActionConfirmPanel from '../components/ActionConfirmPanel'
import ActionSummaryModal from '../components/ActionSummaryModal'

const functions = getFunctions()
const agentChatFn = httpsCallable(functions, 'agentChat')

const WELCOME = {
  role: 'assistant',
  text: "Hi! I'm your Playa Management co-pilot. Ask me what to do today, describe something you want to log, or attach a photo of an ingredient or time card.",
  proposedActions: []
}

// ─── Write handlers ───────────────────────────────────────────────────────────

async function executeAction(action, currentUser, isAdmin) {
  const userInfo = {
    uid: currentUser.uid,
    displayName: currentUser.displayName || currentUser.email,
    email: currentUser.email
  }
  const now = Timestamp.now()

  switch (action.type) {
    case 'create_ingredient': {
      const d = action.data
      const allergens = Array.isArray(d.allergens) ? d.allergens : []
      const r = await addDoc(collection(db, 'ingredients'), {
        name: d.name, category: d.category || 'Base', supplier: d.supplier || '',
        unit: d.unit || 'lbs', allergens, allergenFlag: allergens.length > 0,
        notes: d.notes || '', status: 'active',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        createdBy: userInfo, auditLog: [{ action: 'created', changedBy: userInfo, changedAt: now }]
      })
      return { label: `Ingredient — ${d.name}`, navigateTo: `/operations/ingredients/${r.id}` }
    }
    case 'receive_lot': {
      const d = action.data
      const receivedDate = d.receivedDate ? new Date(d.receivedDate + (d.receivedDate.length === 10 ? 'T00:00:00' : '')) : new Date()
      const lotNumber = await getNextLotNumber()
      const r = await addDoc(collection(db, 'ingredientLots'), {
        ingredientId: d.ingredientId || '', ingredientName: d.ingredientName || '',
        internalLotNumber: lotNumber, supplierLotNumber: d.supplierLotNumber || '',
        supplier: d.supplier || '', receivedDate: Timestamp.fromDate(receivedDate),
        originalQuantity: Number(d.quantity) || 0, currentQuantity: Number(d.quantity) || 0,
        unit: d.unit || 'lbs', storageLocation: d.storageLocation || '', status: 'available',
        receivedBy: userInfo, notes: d.notes || '',
        createdAt: serverTimestamp(), auditLog: [{ action: 'received', changedBy: userInfo, changedAt: now }]
      })
      return { label: `Lot ${lotNumber} — ${d.ingredientName}`, navigateTo: `/operations/lots/${r.id}` }
    }
    case 'create_batch': {
      const d = action.data
      const batchNumber = await getNextBatchNumber()
      const productionDate = d.productionDate ? new Date(d.productionDate + (d.productionDate.length === 10 ? 'T00:00:00' : '')) : new Date()
      const batchRef = await addDoc(collection(db, 'productionBatches'), {
        batchNumber, productName: d.productName, sopId: d.sopId || '', sopName: d.sopName || '',
        productionDate: Timestamp.fromDate(productionDate), quantityProduced: Number(d.quantityProduced) || 0,
        unit: d.unit || 'lbs', status: 'scheduled', notes: d.notes || '',
        createdAt: serverTimestamp(), createdBy: userInfo, auditLog: [{ action: 'created', changedBy: userInfo, changedAt: now }]
      })
      // Write ingredient usage records for any recommended lots
      if (Array.isArray(d.lotsUsed) && d.lotsUsed.length > 0) {
        for (const lotEntry of d.lotsUsed) {
          if (!lotEntry.lotId || !lotEntry.quantityUsed) continue
          const qty = Number(lotEntry.quantityUsed)
          if (!qty || qty <= 0) continue
          try {
            const lotRef = doc(db, 'ingredientLots', lotEntry.lotId)
            const usageRef = doc(collection(db, 'ingredientUsage'))
            await runTransaction(db, async (tx) => {
              const lotSnap = await tx.get(lotRef)
              if (!lotSnap.exists() || lotSnap.data().status !== 'available') return
              const lot = lotSnap.data()
              const newQty = Math.max(0, lot.currentQuantity - qty)
              tx.update(lotRef, {
                currentQuantity: newQty,
                ...(newQty === 0 ? { status: 'used' } : {}),
                auditLog: arrayUnion({ action: `used ${qty} ${lot.unit} in batch ${batchNumber}`, changedBy: userInfo, changedAt: Timestamp.now() }),
              })
              tx.set(usageRef, {
                batchId: batchRef.id, batchNumber, productName: d.productName,
                ingredientId: lot.ingredientId, ingredientName: lot.ingredientName,
                lotId: lotEntry.lotId, internalLotNumber: lot.internalLotNumber, supplierLotNumber: lot.supplierLotNumber || '',
                quantityUsed: qty, unit: lot.unit,
                addedBy: userInfo, usedAt: Timestamp.now(), createdAt: serverTimestamp(),
                auditLog: [{ action: 'created via AI agent', changedBy: userInfo, changedAt: Timestamp.now() }],
              })
            })
          } catch (_) { /* skip lots that fail — don't block batch creation */ }
        }
      }
      return { label: `Batch ${batchNumber} — ${d.productName}`, navigateTo: `/operations/batches/${batchRef.id}` }
    }
    case 'create_sop': {
      const d = action.data
      const sopNumber = await getNextSopNumber()
      const r = await addDoc(collection(db, 'sops'), {
        name: d.name, sopNumber, productType: d.productType || '', instructions: d.instructions || '',
        notes: d.notes || '', status: 'active',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        createdBy: userInfo, auditLog: [{ action: 'created', changedBy: userInfo, changedAt: now }]
      })
      return { label: `SOP ${sopNumber} — ${d.name}`, navigateTo: `/operations/sops/${r.id}` }
    }
    case 'create_cleaning_log': {
      const d = action.data
      const r = await addDoc(collection(db, 'cleaningLogs'), {
        area: d.area || '', equipment: d.equipment || '', chemical: d.chemical || '',
        concentration: d.concentration || '', notes: d.notes || '', verificationStatus: 'pending',
        completedAt: serverTimestamp(), createdBy: userInfo,
        auditLog: [{ action: 'created', changedBy: userInfo, changedAt: now }]
      })
      return { label: `Cleaning Log — ${d.area || d.equipment}`, navigateTo: `/cleaning/${r.id}` }
    }
    case 'create_maintenance_log': {
      const d = action.data
      const r = await addDoc(collection(db, 'maintenanceLogs'), {
        equipment: d.equipment || '', workDescription: d.workDescription || '',
        notes: d.notes || '', photoUrl: d.photoUrl || '', performedBy: userInfo,
        completedAt: serverTimestamp(), createdAt: serverTimestamp()
      })
      return { label: `Maintenance — ${d.equipment}`, navigateTo: null }
    }
    case 'update_inventory': {
      const d = action.data
      await updateDoc(doc(db, 'ingredientLots', d.lotId), {
        currentQuantity: Number(d.newQuantity), updatedAt: serverTimestamp(),
        auditLog: [{ action: `quantity updated to ${d.newQuantity} ${d.unit || ''}${d.reason ? ` — ${d.reason}` : ''}`, changedBy: userInfo, changedAt: now }]
      })
      return { label: `Inventory Updated — ${d.ingredientName || d.lotNumber} → ${d.newQuantity} ${d.unit || ''}`, navigateTo: d.lotId ? `/operations/lots/${d.lotId}` : null }
    }
    case 'submit_timecard': {
      const d = action.data
      const weekStartDate = d.weekStart ? new Date(d.weekStart) : getWeekStart()
      const wLabel = d.weekLabel || weekLabel(weekStartDate)
      const wStr = weekStartStr(weekStartDate)
      let totalHrs = 0
      const punches = Array.isArray(d.punches) ? d.punches : []
      punches.forEach(p => {
        const filled = (p.slots || []).filter(Boolean)
        for (let i = 0; i + 1 < filled.length; i += 2) {
          const [h1, m1] = filled[i].split(':').map(Number)
          const [h2, m2] = filled[i + 1].split(':').map(Number)
          totalHrs += ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60
        }
      })
      await addDoc(collection(db, 'timecards'), {
        userId: currentUser.uid, userEmail: currentUser.email,
        userName: currentUser.displayName || currentUser.email,
        weekStart: Timestamp.fromDate(weekStartDate), weekStartStr: wStr, weekLabel: wLabel,
        punches, totalHours: totalHrs, notes: d.notes || '', submittedAt: serverTimestamp()
      })
      return { label: `Timecard — ${wLabel}`, navigateTo: '/timecard' }
    }
    case 'update_corrective_action': {
      const d = action.data
      const updates = { status: d.status || 'in_progress', updatedAt: serverTimestamp() }
      if (d.correctiveActionTaken) updates.correctiveActionTaken = d.correctiveActionTaken
      if (d.notes) updates.verificationNotes = d.notes
      await updateDoc(doc(db, 'correctiveActions', d.caId), {
        ...updates, auditLog: [{ action: `status → ${d.status}`, changedBy: userInfo, changedAt: now }]
      })
      return { label: `Corrective Action ${d.caNumber || d.caId} → ${d.status}`, navigateTo: d.caId ? `/corrective-actions/${d.caId}` : null }
    }
    case 'edit_sop': {
      if (!isAdmin) throw new Error('Admin access required to edit records.')
      const d = action.data
      if (!d.sopId) throw new Error('Could not identify which SOP to edit — sopId is missing.')
      const updates = {}
      ;['name','productType','instructions','notes'].forEach(k => { if (d[k] !== undefined) updates[k] = d[k] })
      await updateDoc(doc(db, 'sops', d.sopId), {
        ...updates, updatedAt: serverTimestamp(),
        auditLog: [{ action: 'edited via AI agent', changedBy: userInfo, changedAt: now, changes: updates }]
      })
      return { label: `Edited SOP — ${updates.name || d.sopId}`, navigateTo: `/operations/sops/${d.sopId}` }
    }

    case 'edit_batch': {
      if (!isAdmin) throw new Error('Admin access required to edit records.')
      const d = action.data
      if (!d.batchId) throw new Error('Could not identify which batch to edit — batchId is missing.')
      const updates = {}
      ;['status','notes','quantityProduced','unit'].forEach(k => { if (d[k] !== undefined) updates[k] = d[k] })
      await updateDoc(doc(db, 'productionBatches', d.batchId), {
        ...updates, updatedAt: serverTimestamp(),
        auditLog: [{ action: 'edited via AI agent', changedBy: userInfo, changedAt: now, changes: updates }]
      })
      return { label: `Edited Batch — ${d.batchId}`, navigateTo: `/operations/batches/${d.batchId}` }
    }

    case 'edit_cleaning_log': {
      if (!isAdmin) throw new Error('Admin access required to edit records.')
      const d = action.data
      if (!d.logId) throw new Error('Could not identify which cleaning log to edit — logId is missing.')
      const updates = {}
      ;['area','equipment','chemical','concentration','notes'].forEach(k => { if (d[k] !== undefined) updates[k] = d[k] })
      await updateDoc(doc(db, 'cleaningLogs', d.logId), {
        ...updates, updatedAt: serverTimestamp(),
        auditLog: [{ action: 'edited via AI agent', changedBy: userInfo, changedAt: now, changes: updates }]
      })
      return { label: `Edited Cleaning Log`, navigateTo: `/cleaning/${d.logId}` }
    }

    case 'edit_log': {
      if (!isAdmin) throw new Error('Admin access required to edit records.')
      const d = action.data
      if (!d.docId || !d.collection) throw new Error('Could not identify which record to edit. Please be more specific.')
      await updateDoc(doc(db, d.collection, d.docId), {
        ...d.updates, updatedAt: serverTimestamp(),
        auditLog: [{ action: 'edited via AI agent', changedBy: userInfo, changedAt: now, changes: d.updates }]
      })
      return { label: `Edited: ${d.label || d.docId}`, navigateTo: null }
    }
    case 'mark_recall': {
      if (!isAdmin) throw new Error('Admin access required to mark recalls.')
      const d = action.data
      await updateDoc(doc(db, 'ingredientLots', d.lotId), {
        status: 'recalled', updatedAt: serverTimestamp(),
        auditLog: [{ action: `marked recalled — ${d.reason || ''}`, changedBy: userInfo, changedAt: now }]
      })
      return { label: `Lot ${d.lotNumber} marked as RECALLED`, navigateTo: `/operations/lots/${d.lotId}` }
    }
    case 'add_shopping_item': {
      const d = action.data
      await addDoc(collection(db, 'shoppingList'), { text: d.text, status: 'pending', addedBy: userInfo, addedAt: serverTimestamp() })
      return { label: `Shopping List — ${d.text}`, navigateTo: null }
    }
    case 'create_reminder': {
      const d = action.data
      const dueDate = d.dueDate ? Timestamp.fromDate(new Date(d.dueDate)) : null
      await addDoc(collection(db, 'reminders'), { text: d.text, dueDate, status: 'open', addedBy: userInfo, addedAt: serverTimestamp() })
      return { label: `Reminder — ${d.text}`, navigateTo: null }
    }
    case 'navigate_to':
      return { label: action.data.label, navigateTo: action.data.path }
    default:
      throw new Error(`Unknown action type: ${action.type}`)
  }
}

// ─── Conversation persistence helpers ────────────────────────────────────────

function serializeMessages(msgs) {
  return msgs.map(m => ({
    role: m.role,
    text: m.text || '',
    isSystemNote: m.isSystemNote || false
  }))
}

function titleFromMessages(msgs) {
  const first = msgs.find(m => m.role === 'user' && m.text)
  if (!first) return 'New Conversation'
  return first.text.length > 50 ? first.text.slice(0, 50) + '…' : first.text
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Agent() {
  const { currentUser, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [pendingActions, setPendingActions] = useState(null)
  const [summaryResults, setSummaryResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [attachedImage, setAttachedImage] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [appContext, setAppContext] = useState({})

  // Conversation state
  const [convId, setConvId] = useState(null)
  const [convList, setConvList] = useState([])
  const [showConvList, setShowConvList] = useState(false)

  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const autoSentRef = useRef(false)

  // Load conversations list
  async function loadConvList() {
    try {
      const snap = await getDocs(query(
        collection(db, 'agentConversations'),
        where('userId', '==', currentUser.uid)
      ))
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.updatedAt?.toDate?.() || 0) - (a.updatedAt?.toDate?.() || 0))
        .slice(0, 30)
      setConvList(list)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    buildAgentContext(currentUser).then(ctx => {
      setAppContext(ctx)
      const prefilled = location.state?.message
      if (prefilled && !autoSentRef.current) {
        autoSentRef.current = true
        setTimeout(() => sendMessageWithText(prefilled, null, ctx), 100)
      }
    }).catch(() => {})
    loadConvList()
  }, [currentUser])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingActions])

  // Save/update conversation in Firestore
  async function saveConversation(updatedMessages, currentConvId) {
    const serialized = serializeMessages(updatedMessages)
    const title = titleFromMessages(updatedMessages)
    try {
      if (!currentConvId) {
        const r = await addDoc(collection(db, 'agentConversations'), {
          userId: currentUser.uid, title, messages: serialized,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        })
        setConvId(r.id)
        loadConvList()
        return r.id
      } else {
        await updateDoc(doc(db, 'agentConversations', currentConvId), {
          title, messages: serialized, updatedAt: serverTimestamp()
        })
        loadConvList()
        return currentConvId
      }
    } catch { /* non-critical */ }
    return currentConvId
  }

  function loadConversation(conv) {
    setConvId(conv.id)
    setMessages(conv.messages?.length ? conv.messages : [WELCOME])
    setPendingActions(null)
    setShowConvList(false)
  }

  function startNewConversation() {
    setConvId(null)
    setMessages([WELCOME])
    setPendingActions(null)
    setShowConvList(false)
  }

  async function deleteConversation(e, id) {
    e.stopPropagation()
    await deleteDoc(doc(db, 'agentConversations', id))
    if (convId === id) startNewConversation()
    setConvList(prev => prev.filter(c => c.id !== id))
  }

  function buildHistory(msgs) {
    return (msgs || messages)
      .filter(m => m.text)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }))
      .slice(-16)
  }

  async function sendMessageWithText(text, image, ctx, currentMessages) {
    const userText = text.trim() || '(photo attached)'
    setInput('')
    setLoading(true)
    setPendingActions(null)

    const userMsg = { role: 'user', text: userText, imagePreview: image?.previewUrl }
    const msgsWithUser = [...(currentMessages || messages), userMsg]
    setMessages(msgsWithUser)

    let imageUrl = null
    if (image) {
      setUploadingPhoto(true)
      try {
        const storageRef = ref(storage, `agentPhotos/${currentUser.uid}/${Date.now()}_${image.file.name}`)
        await uploadBytes(storageRef, image.file)
        imageUrl = await getDownloadURL(storageRef)
      } catch (err) { console.error('Photo upload failed:', err) }
      finally { setUploadingPhoto(false); setAttachedImage(null) }
    }

    try {
      const result = await agentChatFn({
        message: userText, history: buildHistory(msgsWithUser),
        imageUrl, appContext: ctx ?? appContext, isAdmin
      })
      const { reply, proposedActions } = result.data
      const aiMsg = { role: 'assistant', text: reply, proposedActions: proposedActions || [] }
      const finalMsgs = [...msgsWithUser, aiMsg]
      setMessages(finalMsgs)
      if (proposedActions?.length > 0) setPendingActions(proposedActions)

      // Save conversation (pass current convId via closure)
      setConvId(prev => {
        saveConversation(finalMsgs, prev)
        return prev
      })
    } catch (err) {
      console.error('Agent error:', err)
      const errMsg = { role: 'assistant', text: `Sorry, something went wrong: ${err.message}`, proposedActions: [] }
      const finalMsgs = [...msgsWithUser, errMsg]
      setMessages(finalMsgs)
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    if (!input.trim() && !attachedImage) return
    await sendMessageWithText(input, attachedImage, null, messages)
  }

  async function handleConfirmActions(actionsToExecute) {
    setConfirming(true)
    const results = []
    const errors = []
    const navAction = actionsToExecute.find(a => a.type === 'navigate_to')

    for (const action of actionsToExecute) {
      if (action.type === 'navigate_to') continue
      try {
        results.push(await executeAction(action, currentUser, isAdmin))
      } catch (err) {
        errors.push(`${action.type}: ${err.message}`)
      }
    }

    setConfirming(false)
    setPendingActions(null)

    if (errors.length > 0) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Some actions failed:\n${errors.join('\n')}`, proposedActions: [] }])
    }

    if (results.length > 0) {
      setSummaryResults(results)
      buildAgentContext(currentUser).then(setAppContext).catch(() => {})

      const note = results.map(r => `${r.label}${r.navigateTo ? ` [path: ${r.navigateTo}]` : ''}`).join('\n')
      const noteMsg = { role: 'assistant', text: `[Just confirmed:\n${note}]`, proposedActions: [], isSystemNote: true }
      setMessages(prev => {
        const updated = [...prev, noteMsg]
        setConvId(id => { saveConversation(updated, id); return id })
        return updated
      })
    }

    if (navAction) navigate(navAction.data.path)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachedImage({ file, previewUrl: URL.createObjectURL(file) })
    e.target.value = ''
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const convTitle = titleFromMessages(messages)

  return (
    <div style={pageWrap}>
      {/* Conversation header */}
      <div style={convHeader}>
        <button style={newConvBtn} onClick={startNewConversation} title="New conversation">+ New</button>
        <span style={convTitleStyle} title={convTitle}>{convTitle}</span>
        <button
          style={{ ...newConvBtn, background: showConvList ? '#dbeafe' : '#f3f4f6', color: showConvList ? '#1d4ed8' : '#6b7280' }}
          onClick={() => setShowConvList(s => !s)}
        >
          History {convList.length > 0 ? `(${convList.length})` : ''}
        </button>
      </div>

      {/* Conversation list dropdown */}
      {showConvList && (
        <div style={convListWrap}>
          {convList.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '0.5rem 0' }}>No saved conversations.</p>}
          {convList.map(conv => (
            <div
              key={conv.id}
              style={{ ...convItem, background: conv.id === convId ? '#eff6ff' : '#fff' }}
              onClick={() => loadConversation(conv)}
            >
              <span style={{ flex: 1, fontSize: '0.85rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conv.title || 'Untitled'}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', flexShrink: 0 }}>
                {conv.updatedAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <button style={deleteConvBtn} onClick={e => deleteConversation(e, conv.id)} title="Delete">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={msgList} onClick={() => setShowConvList(false)}>
        {messages.map((msg, i) => {
          if (msg.isSystemNote) {
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <span style={systemNote}>✓ {msg.text.replace('[Just confirmed:\n', '').replace(']', '')}</span>
              </div>
            )
          }
          return (
            <div key={i} style={msg.role === 'user' ? userMsgWrap : aiMsgWrap}>
              {msg.imagePreview && <img src={msg.imagePreview} alt="attached" style={imgPreview} />}
              <div style={msg.role === 'user' ? userBubble : aiBubble}>
                {msg.text.split('\n').map((line, j, arr) => (
                  <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                ))}
              </div>
            </div>
          )
        })}

        {loading && (
          <div style={aiMsgWrap}>
            <div style={{ ...aiBubble, color: '#9ca3af' }}>{uploadingPhoto ? 'Uploading photo…' : 'Thinking…'}</div>
          </div>
        )}

        {pendingActions && !loading && (
          <div style={{ padding: '0 0.25rem' }}>
            <ActionConfirmPanel
              actions={pendingActions}
              onConfirm={handleConfirmActions}
              onCancel={() => setPendingActions(null)}
              loading={confirming}
            />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={inputRow}>
        {attachedImage && (
          <div style={imageChip}>
            <img src={attachedImage.previewUrl} alt="preview" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
            <span style={{ fontSize: '0.78rem', color: '#374151', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {attachedImage.file.name}
            </span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1rem', padding: 0 }} onClick={() => setAttachedImage(null)}>✕</button>
          </div>
        )}
        <div style={inputWrap}>
          <button style={attachBtn} onClick={() => fileInputRef.current?.click()} title="Attach photo">📎</button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileSelect} />
          <textarea
            style={textArea}
            placeholder="Ask anything, or describe what you'd like to log…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            style={{ ...sendBtn, opacity: (loading || (!input.trim() && !attachedImage)) ? 0.5 : 1 }}
            onClick={sendMessage}
            disabled={loading || (!input.trim() && !attachedImage)}
          >↑</button>
        </div>
      </div>

      {summaryResults && <ActionSummaryModal results={summaryResults} onDone={() => setSummaryResults(null)} />}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageWrap = {
  display: 'flex', flexDirection: 'column',
  height: 'calc(100vh - 56px - 2rem)', maxHeight: 860,
  background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden',
}
const convHeader = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6',
  background: '#fafafa', flexShrink: 0,
}
const convTitleStyle = {
  flex: 1, fontSize: '0.82rem', color: '#374151', fontWeight: 500,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const newConvBtn = {
  background: '#f3f4f6', border: 'none', borderRadius: 6,
  padding: '0.3rem 0.65rem', fontSize: '0.78rem', color: '#374151',
  cursor: 'pointer', flexShrink: 0,
}
const convListWrap = {
  borderBottom: '1px solid #e5e7eb', maxHeight: 240, overflowY: 'auto',
  padding: '0.25rem 0.75rem', background: '#fff', flexShrink: 0,
}
const convItem = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.5rem 0.4rem', cursor: 'pointer', borderRadius: 6,
  borderBottom: '1px solid #f3f4f6',
}
const deleteConvBtn = {
  background: 'none', border: 'none', color: '#d1d5db',
  cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem 0.25rem', flexShrink: 0,
}
const msgList = {
  flex: 1, overflowY: 'auto', padding: '1rem',
  display: 'flex', flexDirection: 'column', gap: '0.625rem',
}
const userMsgWrap = { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }
const aiMsgWrap = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }
const userBubble = {
  background: '#1d4ed8', color: '#fff', borderRadius: '18px 18px 4px 18px',
  padding: '0.6rem 0.9rem', maxWidth: '78%', fontSize: '0.9rem',
  lineHeight: 1.5, wordBreak: 'break-word',
}
const aiBubble = {
  background: '#f3f4f6', color: '#111827', borderRadius: '18px 18px 18px 4px',
  padding: '0.6rem 0.9rem', maxWidth: '82%', fontSize: '0.9rem',
  lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
}
const imgPreview = { maxWidth: 180, borderRadius: 8, marginBottom: '0.25rem' }
const systemNote = {
  display: 'inline-block', fontSize: '0.75rem', color: '#16a34a',
  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 99, padding: '0.2rem 0.75rem',
}
const inputRow = {
  borderTop: '1px solid #e5e7eb', padding: '0.75rem',
  display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#fff', flexShrink: 0,
}
const inputWrap = {
  display: 'flex', alignItems: 'flex-end', gap: '0.5rem',
  background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.4rem 0.5rem',
}
const attachBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0.25rem', flexShrink: 0, opacity: 0.7 }
const textArea = {
  flex: 1, border: 'none', background: 'transparent', resize: 'none',
  fontSize: '0.9rem', lineHeight: 1.5, outline: 'none', fontFamily: 'inherit',
  padding: '0.25rem 0', maxHeight: 120, overflowY: 'auto',
}
const sendBtn = {
  width: 32, height: 32, background: '#1d4ed8', color: '#fff', border: 'none',
  borderRadius: '50%', cursor: 'pointer', fontSize: '1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
const imageChip = {
  display: 'flex', alignItems: 'center', gap: '0.4rem',
  background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8,
  padding: '0.3rem 0.5rem', alignSelf: 'flex-start',
}
