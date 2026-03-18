// backend/src/modules/messaging/message.routes.js
//
// FIXES:
// ✅ Uses protect + requireRole (your app's actual middleware) — was using
//    authenticate + authorize which don't exist → every call was 401/403
// ✅ /unread-count route moved BEFORE /:userId to prevent Express matching
//    "unread-count" as a userId param
// ✅ All routes use service layer (message.service.js) instead of inline DB calls
// ✅ POST /send emits socket for real-time delivery
// ✅ GET /thread/:threadId — new route for ManagerMessageHub
// ✅ GET /:userId — kept for WaiterChatPanel backward compat

import { Router }   from 'express'
import { protect }  from '../auth/auth.middleware.js'
import requireRole  from '../../shared/middleware/requireRole.js'
import catchAsync   from '../../shared/utils/catchAsync.js'
import AppError     from '../../shared/utils/AppError.js'
import { sendSuccess } from '../../shared/utils/response.js'
import * as svc     from './message.service.js'

const router = Router()

// All messaging routes require authentication
router.use(protect)
router.use(requireRole('waiter', 'kitchen', 'cashier', 'manager', 'admin'))

// ── GET /messages/threads ─────────────────────────────────────────────────────
router.get('/threads', catchAsync(async (req, res) => {
  const threads = await svc.getThreads(req.user._id, req.user.cafeId)
  sendSuccess(res, { threads }, 'OK')
}))

// ── GET /messages/unread-count ────────────────────────────────────────────────
// IMPORTANT: must come BEFORE /:userId to avoid route collision
router.get('/unread-count', catchAsync(async (req, res) => {
  const count = await svc.getUnreadCount(req.user._id, req.user.cafeId)
  sendSuccess(res, { count }, 'OK')
}))

// ── GET /messages/thread/:threadId ────────────────────────────────────────────
// Used by ManagerMessageHub
router.get('/thread/:threadId', catchAsync(async (req, res) => {
  const { before, limit } = req.query
  const messages = await svc.getThread(
    req.params.threadId,
    req.user._id,
    req.user.cafeId,
    { before, limit }
  )
  sendSuccess(res, { messages }, 'OK')
}))

// ── POST /messages/send ───────────────────────────────────────────────────────
router.post('/send', catchAsync(async (req, res) => {
  const { toUserId, content, orderRef, itemRef, type } = req.body
  if (!toUserId || !content?.trim())
    throw new AppError('toUserId and content are required', 400)

  const io  = req.app.get('io')
  const msg = await svc.sendMessage({
    fromUserId: req.user._id,
    fromRole:   req.user.role,
    toUserId,
    cafeId:     req.user.cafeId,
    content,
    orderRef,
    itemRef,
    type,
  }, io)

  sendSuccess(res, { message: msg }, 'Sent', 201)
}))

// ── PATCH /messages/thread/:threadId/read ─────────────────────────────────────
router.patch('/thread/:threadId/read', catchAsync(async (req, res) => {
  await svc.markThreadRead(req.params.threadId, req.user._id)
  sendSuccess(res, null, 'Marked read')
}))

// ── PATCH /messages/:userId/read (backward compat for WaiterChatPanel) ───────
router.patch('/:userId/read', catchAsync(async (req, res) => {
  const { buildThreadId } = await import('./message.service.js')
  const threadId = buildThreadId(req.user._id, req.params.userId)
  await svc.markThreadRead(threadId, req.user._id)
  sendSuccess(res, null, 'Marked read')
}))

// ── GET /messages/:userId ─────────────────────────────────────────────────────
// Backward compat for WaiterChatPanel — MUST be last to avoid catching other routes
router.get('/:userId', catchAsync(async (req, res) => {
  const { before, limit } = req.query
  const messages = await svc.getMessagesByUserId(
    req.user._id,
    req.params.userId,
    req.user.cafeId,
    { before, limit }
  )
  sendSuccess(res, { messages }, 'OK')
}))

export default router