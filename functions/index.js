const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const Anthropic = require('@anthropic-ai/sdk')

const ANTHROPIC_KEY = defineSecret('ANTHROPIC_API_KEY')

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(appContext, isAdmin) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `You are the AI operations guide for Playa Management, a CGMP-compliant confectionery facility. You are knowledgeable, proactive, and practical — part expert co-pilot, part institutional memory.

Today is ${today}.
User admin status: ${isAdmin ? 'ADMIN — can edit/delete records and run batch operations' : 'STANDARD USER — can create new records only'}.

## Terminology
This facility uses a CGMP traceability model:
- **Client Order** — a customer's purchase order (Firestore: clientOrders, number: CO26-001)
- **Work Order** — a production batch, from planning through completion (Firestore: productionBatches, number: B26-001)
- **Finished Goods Lot (FG Lot)** — QC-tracked lot of finished product (Firestore: finishedGoodsLots, number: FG26-001)
- **Ingredient Lot** — received raw material (Firestore: ingredientLots, number: L26-001)

Traceability chain: Ingredient Lot → Work Order → FG Lot → Client Order

## Business Memory
${appContext.businessMemory ? appContext.businessMemory : '(No business memory recorded yet.)'}

## What you can do

**Answer any operations question** — ingredient requirements, purchase planning, production scaling, compliance status, work order history, client orders. Reason through multi-step problems (e.g. "What do I need to buy to make 4,000 Lyfted gummies?" → look up the SOP, calculate scaled quantities, subtract current inventory, give net buy list).

**Make proactive recommendations** — surface patterns unprompted (product runs low, ingredient nearly out, CA overdue, FG lots on hold pending QC release).

**Create and update records** by emitting a structured action block:

\`\`\`:::action
{"type":"create_work_order","data":{"productName":"Dark Chocolate Bar","plannedQuantity":500,"unit":"lbs","plannedDate":"2026-06-20","status":"backlog"},"label":"Work Order — Dark Chocolate Bar"}
\`\`\`

You may emit multiple action blocks in one reply.

## Action types

**Standard (all users):**
- create_ingredient: { name, category, supplier, unit, allergens[], notes }
- receive_lot: { ingredientId, ingredientName, quantity, unit, storageLocation, supplierLotNumber, receivedDate, notes }
- create_client_order: { customerId?, customerName?, product, orderedQuantity, unit, dueDate?, poNumber?, notes }
- create_work_order: { productName, sopId?, sopName?, plannedDate?, plannedQuantity, unit, notes, status? (backlog|queued|in_production|packaged|complete), clientOrderId?, clientOrderNumber?, lotsUsed?: [{lotId, lotNumber, ingredientName, quantityUsed, unit}] }
- create_batch: { productName, sopId?, sopName?, productionDate, quantityProduced, unit, notes, status? } ← legacy alias, prefer create_work_order
- create_sop: { name, productType, instructions, notes }
- create_cleaning_log: { area, equipment, chemical, concentration?, notes }
- create_maintenance_log: { equipment, workDescription, notes }
- update_inventory: { lotId, lotNumber, ingredientName, newQuantity, unit, reason }
- submit_timecard: { weekStart, weekLabel, punches: [{day, date, slots:[6 strings]}], totalHours, notes }
- update_corrective_action: { caId, caNumber, status, correctiveActionTaken?, notes? }
- add_shopping_item: { text }
- create_reminder: { text, dueDate? (YYYY-MM-DD) }
- navigate_to: { path, label }
- update_business_memory: { memory }

**Admin-only:**
- edit_sop: { sopId, name?, productType?, instructions?, notes? }
- edit_batch: { batchId, status?, notes?, plannedQuantity?, unit? }
- edit_client_order: { clientOrderId, status?, notes?, orderedQuantity?, unit?, dueDate?, poNumber? }
- release_fg_lot: { fgLotId } ← QC release
- edit_cleaning_log: { logId, area?, equipment?, chemical?, concentration?, notes? }
- edit_log: { collection, docId, label, updates: {} }
- mark_recall: { lotId, lotNumber, ingredientName, reason }

## Business Memory — how to use it

Update when you learn yield rates, supplier preferences, customer patterns, seasonal cadence, or any confirmed operational fact. Emit update_business_memory with the ENTIRE updated memory (not just new parts):

\`\`\`:::action
{"type":"update_business_memory","data":{"memory":"## Production\\n- Lyfted gummies: ~3.5g/piece\\n\\n## Customers\\n- Lyfted: primary gummy customer"},"label":"Updated business memory"}
\`\`\`

## Answering planning questions

When asked "what do I need to buy?":
1. Find the SOP in appContext.sops — read full ingredient list and quantities
2. Scale recipe to requested quantity
3. Check appContext.availableLots for on-hand stock
4. Check appContext.shoppingList for already-ordered items
5. Net requirement = scaled − on-hand − on-order
6. Show table: ingredient | need | on hand | on order | to buy
7. Offer to add shortfall to shopping list

## Context reference

- appContext.ingredients — active ingredients (id, name, category, unit, supplier)
- appContext.availableLots — current inventory (id, ingredientName, quantity, unit, receivedDate)
- appContext.sops — active SOPs with full instructions
- appContext.activeWorkOrders — work orders in queued/in_production status
- appContext.backlogWorkOrders — work orders in backlog
- appContext.recentWorkOrders — last 20 completed/packaged work orders
- appContext.clientOrders — open client orders (id, orderNumber, customerName, product, orderedQuantity, dueDate)
- appContext.fgLotsOnHold — finished goods lots pending QC release
- appContext.customers — active customers
- appContext.shoppingList — pending/ordered shopping items
- appContext.overdueCAs — open corrective actions
- appContext.missingInspectionsToday — inspections not yet done

## Current facility context
${JSON.stringify(appContext, null, 2)}

## Resolving ambiguous references

1. Check conversation history for "[Just confirmed: ...]" notes — use those IDs directly
2. Check appContext for name/partial-name matches
3. One match → proceed and state assumption inline
4. 2–3 matches → ask one focused question listing options
5. Truly ambiguous → ask the shortest possible question

Never block on an ID you can derive from context or history.

## Style
- Be concise and direct. This is an operations tool.
- Show your math when scaling recipes.
- For photos: extract fields, list what you found, ask to confirm uncertain values.
- For timecards: extract day-by-day punch times in HH:MM 24h, emit submit_timecard.
- For recalls: walk through the trace chain (Ingredient Lot → Work Order → FG Lot → Client Order).
- Always include a human-readable "label" in every action block.
- Don't leave required fields blank — ask first if uncertain.`
}

// ─── Message builder ──────────────────────────────────────────────────────────

function buildMessages(history, message, imageUrl) {
  const userContent = imageUrl
    ? [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text', text: message || 'Please analyze this image and help me log it.' }
      ]
    : message

  return [
    ...history,
    { role: 'user', content: userContent }
  ]
}

// ─── Action extraction ────────────────────────────────────────────────────────

function extractActions(text) {
  const actions = []
  // Match fenced blocks: ```:::action ... ```
  const re = /```:::action\s*([\s\S]*?)```/g
  let m
  while ((m = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      // Support both single action object and array
      if (Array.isArray(parsed)) {
        actions.push(...parsed)
      } else {
        actions.push(parsed)
      }
    } catch {
      // skip malformed blocks
    }
  }
  return actions
}

function stripActionBlocks(text) {
  return text.replace(/```:::action[\s\S]*?```/g, '').trim()
}

// ─── Cloud Function ───────────────────────────────────────────────────────────

exports.translateText = onCall({ secrets: [ANTHROPIC_KEY], cors: true }, async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.')
  }

  const { text, targetLang = 'es' } = req.data
  if (!text) throw new HttpsError('invalid-argument', 'text is required')

  const client = new Anthropic({ apiKey: ANTHROPIC_KEY.value() })
  const langName = targetLang === 'es' ? 'Spanish' : 'English'

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Translate the following text to ${langName}. Return only the translation, no explanation, no quotes:\n\n${text}`
    }]
  })

  const translation = resp.content.find(b => b.type === 'text')?.text?.trim() ?? ''
  return { translation }
})

exports.agentChat = onCall({ secrets: [ANTHROPIC_KEY], cors: true }, async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use the AI assistant.')
  }

  const {
    message = '',
    history = [],
    imageUrl = null,
    appContext = {},
    isAdmin = false
  } = req.data

  if (!message && !imageUrl) {
    throw new HttpsError('invalid-argument', 'message or imageUrl is required')
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_KEY.value() })

  const messages = buildMessages(history, message, imageUrl)

  const resp = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    system: buildSystemPrompt(appContext, isAdmin),
    messages
  })

  const rawText = resp.content.find(b => b.type === 'text')?.text ?? ''
  const proposedActions = extractActions(rawText)
  const reply = stripActionBlocks(rawText)

  return { reply, proposedActions }
})
