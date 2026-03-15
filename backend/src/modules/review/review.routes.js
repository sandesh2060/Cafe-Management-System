// src/modules/review/review.routes.js
import { Router }       from 'express'
import { authenticate } from '../auth/auth.middleware.js'
import requireRole  from '../../shared/middleware/requireRole.js'
import { uploadReview } from '../../config/cloudinary.js'
import {
  getReviews,
  getMyReview,
  createReview,
  updateReview,
  deleteReview,
  toggleLike,
  managerReply,
  setVisibility,
} from './review.controller.js'

const router = Router()

// ── Public ────────────────────────────────────────────────────────────────────
// GET /api/reviews?page=1&limit=12&rating=5&sort=recent|top
router.get('/', getReviews)

// ── Auth required ──────────────────────────────────────────────────────────────
router.use(authenticate)

// GET  /api/reviews/my
router.get('/my', getMyReview)

// POST /api/reviews        — create (optional image upload)
router.post('/', uploadReview.single('image'), createReview)

// PATCH  /api/reviews/:reviewId   — edit own
router.patch('/:reviewId', uploadReview.single('image'), updateReview)

// DELETE /api/reviews/:reviewId   — delete own
router.delete('/:reviewId', deleteReview)

// POST /api/reviews/:reviewId/like — toggle like
router.post('/:reviewId/like', toggleLike)

// ── Manager only ───────────────────────────────────────────────────────────────
router.post(  '/:reviewId/reply',      requireRole('manager', 'admin'), managerReply)
router.patch( '/:reviewId/visibility', requireRole('manager', 'admin'), setVisibility)

export default router