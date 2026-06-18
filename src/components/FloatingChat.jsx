import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
  collection, addDoc, updateDoc, deleteDoc, getDocs,
  query, where, doc, serverTimestamp,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { storage, db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { buildAgentContext } from '../utils/agentContext'
import { executeAction } from '../utils/agentExecute'
import ActionConfirmPanel from './ActionConfirmPanel'
import ActionSummaryModal from './ActionSummaryModal'

const functions = getFunctions()
const agentChatFn = httpsCallable(functions, 'agentChat')

const WELCOME = {
  role: 'assistant',
  text: "Hi! Ask me anything about the shop, or describe what you'd like to log.",
}

export default function FloatingChat() {
  const { currentUser, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'chat'
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [conversations, setConversations] = useState([])
  const [convsLoading, setConvsLoading] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [currentConvId, setCurrentConvId] = useState(null)
  const currentConvIdRef = useRef(null)

  const [messages, setMessages] = useState([WELCOME])
  const [inputVal, setInputVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pendingActions, setPendingActions] = useState(null)
  const [summaryResults, setSummaryResults] = useState(null)
  const [attachedImage, setAttachedImage] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [appContext, setAppContext] = useState({})

  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const contextLoadedRef = useRef(false)

  useEffect(() => { currentConvIdRef.current = currentConvId }, [currentConvId])

  useEffect(() => {
    if (open && !contextLoadedRef.current && currentUser) {
      contextLoadedRef.current = true
      buildAgentContext(currentUser).then(setAppContext).catch(() => {})
    }
  }, [open, currentUser])

  // On open: if no active conversation in progress, show list
  useEffect(() => {
    if (!open || !currentUser) return
    if (!currentConvIdRef.current) loadConversations()
  }, [open])

  useEffect(() => {
    if (open && view === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingActions, open, view])

  async function loadConversations() {
    setConvsLoading(true)
    try {
      const snap = await getDocs(query(
        collection(db, 'agentConversations'),
        where('userId', '==', currentUser.uid)
      ))
      const convs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.updatedAt?.toDate?.() || 0) - (a.updatedAt?.toDate?.() || 0))
        .slice(0, 25)
      setConversations(convs)
      setView(convs.length > 0 ? 'list' : 'chat')
    } catch {
      setView('chat')
    }
    setConvsLoading(false)
  }

  function openConversation(conv) {
    setCurrentConvId(conv.id)
    currentConvIdRef.current = conv.id
    const stored = conv.messages?.length > 0 ? conv.messages.map(m => ({ ...m })) : [WELCOME]
    setMessages(stored)
    setPendingActions(null)
    setView('chat')
  }

  function newChat() {
    setCurrentConvId(null)
    currentConvIdRef.current = null
    setMessages([WELCOME])
    setPendingActions(null)
    setView('chat')
  }

  async function showList() {
    await loadConversations()
  }

  async function deleteConversation(e, convId) {
    e.stopPropagation()
    setDeleting(convId)
    try {
      await deleteDoc(doc(db, 'agentConversations', convId))
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (currentConvIdRef.current === convId) {
        setCurrentConvId(null)
        currentConvIdRef.current = null
        setMessages([WELCOME])
      }
    } catch { /* ignore */ }
    setDeleting(null)
  }

  function serializeMessages(msgs) {
    return msgs
      .filter(m => m.text)
      .map(({ imagePreview, ...rest }) => rest)
  }

  async function saveMessages(convId, msgs) {
    if (!convId) return
    try {
      await updateDoc(doc(db, 'agentConversations', convId), {
        messages: serializeMessages(msgs),
        updatedAt: serverTimestamp(),
      })
    } catch { /* best effort */ }
  }

  function buildHistory() {
    return messages
      .filter(m => m.text && !m.isSystemNote)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }))
      .slice(-12)
  }

  async function sendMessage() {
    const text = inputVal.trim()
    if (!text && !attachedImage) return
    const userText = text || '(photo attached)'
    setInputVal('')
    setLoading(true)
    setPendingActions(null)

    const userMsg = { role: 'user', text: userText, imagePreview: attachedImage?.previewUrl }
    const msgsWithUser = [...messages, userMsg]
    setMessages(msgsWithUser)

    // Create Firestore doc on first message of a new conversation
    let convId = currentConvIdRef.current
    if (!convId) {
      try {
        const docRef = await addDoc(collection(db, 'agentConversations'), {
          userId: currentUser.uid,
          title: userText.slice(0, 50),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          messages: [{ role: 'user', text: userText }],
        })
        convId = docRef.id
        setCurrentConvId(convId)
        currentConvIdRef.current = convId
      } catch { /* continue without persistence */ }
    }

    let imageUrl = null
    if (attachedImage) {
      setUploadingPhoto(true)
      try {
        const sRef = storageRef(storage, `agentPhotos/${currentUser.uid}/${Date.now()}_${attachedImage.file.name}`)
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timed out')), 20000))
        await Promise.race([uploadBytes(sRef, attachedImage.file), timeout])
        imageUrl = await getDownloadURL(sRef)
      } catch (err) {
        const errMsg = { role: 'assistant', text: `Photo upload failed: ${err.message}. Check that Firebase Storage is enabled in your Firebase console, then try again. You can also send your message without the photo.` }
        setMessages(prev => [...prev, errMsg])
        setLoading(false)
        setUploadingPhoto(false)
        setAttachedImage(null)
        return
      }
      setUploadingPhoto(false)
      setAttachedImage(null)
    }

    try {
      const result = await agentChatFn({
        message: userText, history: buildHistory(),
        imageUrl, appContext, isAdmin,
      })
      const { reply, proposedActions } = result.data
      const aiMsg = { role: 'assistant', text: reply, proposedActions: proposedActions || [] }
      const finalMsgs = [...msgsWithUser, aiMsg]
      setMessages(finalMsgs)
      if (proposedActions?.length > 0) setPendingActions(proposedActions)
      await saveMessages(convId, finalMsgs)
    } catch (err) {
      const errMsg = { role: 'assistant', text: `Sorry, something went wrong: ${err.message}` }
      const finalMsgs = [...msgsWithUser, errMsg]
      setMessages(finalMsgs)
      await saveMessages(convId, finalMsgs)
    }
    setLoading(false)
  }

  async function handleConfirm(actionsToExecute) {
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

    const newMsgs = [...messages]
    if (errors.length > 0) {
      newMsgs.push({ role: 'assistant', text: `Some actions failed:\n${errors.join('\n')}` })
    }
    if (results.length > 0) {
      setSummaryResults(results)
      buildAgentContext(currentUser).then(setAppContext).catch(() => {})
      const note = results.map(r => `${r.label}${r.navigateTo ? ` [path: ${r.navigateTo}]` : ''}`).join('\n')
      newMsgs.push({ role: 'assistant', text: `[Just confirmed:\n${note}]`, isSystemNote: true })
    }
    setMessages(newMsgs)
    await saveMessages(currentConvIdRef.current, newMsgs)

    if (navAction) {
      navigate(navAction.data.path)
      setOpen(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachedImage({ file, previewUrl: URL.createObjectURL(file) })
    e.target.value = ''
  }

  return (
    <>
      {!open && (
        <button style={tabBtn} onClick={() => setOpen(true)} aria-label="Open AI assistant">
          <span style={{ fontSize: '1rem' }}>✨</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>AI</span>
        </button>
      )}

      {open && (
        <div style={isMobile ? panelMobile : (expanded ? panelExpanded : panel)}>
          <div style={panelHeader}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
              {view === 'list' ? '✨ AI Conversations' : '✨ AI Assistant'}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {view === 'chat' && (
                <button style={iconBtn} onClick={showList} title="All conversations">☰</button>
              )}
              {view === 'chat' && (
                <button style={iconBtn} onClick={newChat} title="New chat">✎</button>
              )}
              {!isMobile && (
                <button style={iconBtn} onClick={() => setExpanded(e => !e)} title={expanded ? 'Collapse' : 'Expand'}>
                  {expanded ? '⊡' : '⊞'}
                </button>
              )}
              <button style={iconBtn} onClick={() => setOpen(false)} title="Close">✕</button>
            </div>
          </div>

          {/* Conversation list */}
          {view === 'list' && (
            <div style={listView}>
              <button style={newChatBtn} onClick={newChat}>+ New Conversation</button>
              {convsLoading && <p style={muted}>Loading…</p>}
              {!convsLoading && conversations.length === 0 && (
                <p style={muted}>No past conversations yet.</p>
              )}
              {conversations.map(conv => (
                <div key={conv.id} style={convRowWrap}>
                  <button style={convRow} onClick={() => openConversation(conv)}>
                    <span style={convTitle}>{conv.title || 'Conversation'}</span>
                  </button>
                  <button
                    style={deleteBtn}
                    disabled={deleting === conv.id}
                    onClick={e => deleteConversation(e, conv.id)}
                    title="Delete"
                  >
                    {deleting === conv.id ? '…' : '🗑'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chat */}
          {view === 'chat' && (
            <>
              <div style={msgList}>
                {messages.map((msg, i) => {
                  if (msg.isSystemNote) {
                    return (
                      <div key={i} style={{ textAlign: 'center', padding: '0.25rem 0' }}>
                        <span style={systemNote}>✓ {msg.text.replace('[Just confirmed:\n', '').replace(']', '')}</span>
                      </div>
                    )
                  }
                  return (
                    <div key={i} style={msg.role === 'user' ? userWrap : aiWrap}>
                      {msg.imagePreview && (
                        <img src={msg.imagePreview} alt="attached"
                          style={{ maxWidth: 140, borderRadius: 6, marginBottom: '0.2rem' }} />
                      )}
                      <div style={msg.role === 'user' ? userBubble : aiBubble}>
                        {msg.text.split('\n').map((line, j, arr) => (
                          <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {loading && (
                  <div style={aiWrap}>
                    <div style={{ ...aiBubble, color: '#9ca3af' }}>
                      {uploadingPhoto ? 'Uploading…' : 'Thinking…'}
                    </div>
                  </div>
                )}

                {pendingActions && !loading && (
                  <div style={{ padding: '0 0.125rem' }}>
                    <ActionConfirmPanel
                      actions={pendingActions}
                      onConfirm={handleConfirm}
                      onCancel={() => setPendingActions(null)}
                      loading={confirming}
                    />
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div style={inputArea}>
                {attachedImage && (
                  <div style={imgChip}>
                    <img src={attachedImage.previewUrl} alt=""
                      style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }} />
                    <span style={{ fontSize: '0.72rem', color: '#374151', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {attachedImage.file.name}
                    </span>
                    <button style={clearBtn} onClick={() => setAttachedImage(null)}>✕</button>
                  </div>
                )}
                <div style={inputRow}>
                  <button style={attachBtnStyle} onClick={() => fileInputRef.current?.click()} title="Attach photo">📎</button>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFile} />
                  <textarea
                    style={textArea}
                    placeholder="Ask anything…"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    style={{ ...sendBtnStyle, opacity: loading || (!inputVal.trim() && !attachedImage) ? 0.4 : 1 }}
                    onClick={sendMessage}
                    disabled={loading || (!inputVal.trim() && !attachedImage)}
                  >↑</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {summaryResults && (
        <ActionSummaryModal results={summaryResults} onDone={() => setSummaryResults(null)} />
      )}
    </>
  )
}

function relativeTime(date) {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Styles ────────────────────────────────────────────────────────────────────

const tabBtn = {
  position: 'fixed', bottom: 24, right: 24, zIndex: 900,
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
  background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 14,
  padding: '0.625rem 0.875rem', cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(29,78,216,0.35)',
}
const panelMobile = {
  position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 900,
  width: '100%', height: '82vh',
  background: '#fff', borderRadius: '16px 16px 0 0',
  boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
  border: '1px solid #e5e7eb',
}
const panel = {
  position: 'fixed', bottom: 24, right: 24, zIndex: 900,
  width: 360, maxWidth: 'calc(100vw - 48px)',
  height: 520, maxHeight: 'calc(100vh - 80px)',
  background: '#fff', borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
  border: '1px solid #e5e7eb',
  transition: 'width 0.2s ease, height 0.2s ease, bottom 0.2s ease, right 0.2s ease',
}
const panelExpanded = {
  position: 'fixed', bottom: 24, right: 24, zIndex: 900,
  width: 'min(720px, calc(100vw - 48px))',
  height: 'calc(100vh - 80px)',
  background: '#fff', borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
  border: '1px solid #e5e7eb',
  transition: 'width 0.2s ease, height 0.2s ease',
}
const panelHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '0.75rem 0.875rem', borderBottom: '1px solid #f3f4f6',
  background: '#fafafa', flexShrink: 0,
}
const iconBtn = {
  background: '#f3f4f6', border: 'none', borderRadius: 6,
  width: 26, height: 26, fontSize: '0.8rem', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
}
const listView = {
  flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
}
const newChatBtn = {
  margin: '0.625rem', padding: '0.6rem', background: '#eff6ff', color: '#1d4ed8',
  border: '1.5px dashed #bfdbfe', borderRadius: 8, cursor: 'pointer',
  fontSize: '0.85rem', fontWeight: 600, flexShrink: 0,
}
const convRowWrap = {
  display: 'flex', alignItems: 'center',
  borderBottom: '1px solid #f3f4f6', flexShrink: 0,
}
const convRow = {
  flex: 1, minWidth: 0, textAlign: 'left', padding: '0.65rem 0.75rem',
  background: 'transparent', border: 'none', cursor: 'pointer',
}
const deleteBtn = {
  flexShrink: 0, background: 'transparent', border: 'none',
  padding: '0.65rem 0.75rem', cursor: 'pointer',
  fontSize: '0.85rem', color: '#d1d5db',
  lineHeight: 1,
}
const convTitle = {
  display: 'block', fontSize: '0.875rem', color: '#111827', fontWeight: 400,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const muted = { color: '#9ca3af', fontSize: '0.875rem', padding: '0.75rem' }
const msgList = {
  flex: 1, overflowY: 'auto', padding: '0.75rem',
  display: 'flex', flexDirection: 'column', gap: '0.5rem',
}
const userWrap = { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }
const aiWrap = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }
const userBubble = {
  background: '#1d4ed8', color: '#fff', borderRadius: '16px 16px 3px 16px',
  padding: '0.5rem 0.75rem', maxWidth: '85%', fontSize: '0.85rem', lineHeight: 1.5, wordBreak: 'break-word',
}
const aiBubble = {
  background: '#f3f4f6', color: '#111827', borderRadius: '16px 16px 16px 3px',
  padding: '0.5rem 0.75rem', maxWidth: '90%', fontSize: '0.85rem', lineHeight: 1.55, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
}
const systemNote = {
  display: 'inline-block', fontSize: '0.7rem', color: '#16a34a',
  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 99, padding: '0.15rem 0.6rem',
}
const inputArea = {
  borderTop: '1px solid #e5e7eb', padding: '0.5rem 0.625rem',
  display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0,
}
const inputRow = {
  display: 'flex', alignItems: 'flex-end', gap: '0.35rem',
  background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.3rem 0.4rem',
}
const textArea = {
  flex: 1, border: 'none', background: 'transparent', resize: 'none',
  fontSize: '0.85rem', lineHeight: 1.5, outline: 'none', fontFamily: 'inherit',
  padding: '0.2rem 0', maxHeight: 80, overflowY: 'auto',
}
const attachBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', padding: '0.2rem', flexShrink: 0, opacity: 0.6 }
const sendBtnStyle = {
  width: 28, height: 28, background: '#1d4ed8', color: '#fff', border: 'none',
  borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
const imgChip = {
  display: 'flex', alignItems: 'center', gap: '0.3rem',
  background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6,
  padding: '0.25rem 0.4rem', alignSelf: 'flex-start',
}
const clearBtn = { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.85rem', padding: 0 }
