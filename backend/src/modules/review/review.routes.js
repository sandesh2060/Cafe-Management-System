// src/modules/review/review.routes.js
import { Router }        from 'express'
import { authenticate }  from '../auth/auth.middleware.js'
import {
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleLike,
  getMyReview,
} from './review.controller.js'

const router = Router()

// ── Public ────────────────────────────────────────────────────────────────────
// GET /api/reviews/:menuItemId          → paginated reviews + summary
router.get('/:menuItemId', getReviews)

// ── Authenticated ─────────────────────────────────────────────────────────────
router.use(authenticate)

// GET  /api/reviews/:menuItemId/my      → current user's review (if any)
router.get('/:menuItemId/my', getMyReview)

// POST /api/reviews/:menuItemId         → create review
router.post('/:menuItemId', createReview)

// PATCH  /api/reviews/review/:reviewId  → edit own review
router.patch('/review/:reviewId', updateReview)

// DELETE /api/reviews/review/:reviewId  → delete own review
router.delete('/review/:reviewId', deleteReview)

// POST /api/reviews/review/:reviewId/like → toggle like
router.post('/review/:reviewId/like', toggleLike)

export default router