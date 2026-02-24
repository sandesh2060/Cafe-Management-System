// src/modules/messaging/message.routes.js
import express        from 'express'
import { authenticate, authorize } from '../auth/auth.middleware.js'
import { catchAsync } from '../../shared/middleware/errorHandler.js'
import Message        from './message.model.js'

const STAFF_ROLES = ['waiter', 'kitchen', 'cashier', 'manager']

const router = express.Router()
router.use(authenticate)
router.use(authorize(...STAFF_ROLES))  // Messaging only between staff

// Get all threads for current user
router.get('/threads', catchAsync(async (req, res) => {
  const msgs = await Message.aggregate([
    {
      $match: {
        $or: [{ fromUserId: req.user._id }, { toUserId: req.user._id }],
        cafeId: req.user.cafeId,
      },
    },
    { $sort:  { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: {
            if: { $lt: ['$fromUserId', '$toUserId'] },
            then: { a: '$fromUserId', b: '$toUserId' },
            else: { a: '$toUserId',  b: '$fromUserId' },
          },
        },
        lastMessage: { $first: '$$ROOT' },
        unread: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$toUserId', req.user._id] }, { $eq: ['$readAt', null] }] },
              1, 0,
            ],
          },
        },
      },
    },
  ])
  res.json({ success: true, threads: msgs })
}))

// Get message history for a thread
router.get('/:userId', catchAsync(async (req, res) => {
  const { userId } = req.params
  const { before, limit = 30 } = req.query

  const query = {
    cafeId: req.user.cafeId,
    $or: [
      { fromUserId: req.user._id, toUserId: userId },
      { fromUserId: userId,       toUserId: req.user._id },
    ],
  }
  if (before) query.createdAt = { $lt: new Date(before) }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean()

  res.json({ success: true, messages: messages.reverse() })
}))

// Send message
router.post('/send', catchAsync(async (req, res) => {
  const { toUserId, content, orderRef, itemRef, type = 'text' } = req.body
  const msg = await Message.create({
    cafeId:     req.user.cafeId,
    fromUserId: req.user._id,
    fromRole:   req.user.role,
    toUserId,
    toRole:     null,
    content:    content.slice(0, 1000),
    orderRef:   orderRef || null,
    itemRef:    itemRef  || null,
    type,
  })
  res.status(201).json({ success: true, message: msg })
}))

// Mark thread as read
router.post('/:userId/read', catchAsync(async (req, res) => {
  await Message.updateMany(
    { fromUserId: req.params.userId, toUserId: req.user._id, readAt: null },
    { readAt: new Date() }
  )
  res.json({ success: true })
}))

// Unread count
router.get('/unread-count', catchAsync(async (req, res) => {
  const count = await Message.countDocuments({
    toUserId: req.user._id,
    readAt:   null,
  })
  res.json({ success: true, count })
}))

export default router