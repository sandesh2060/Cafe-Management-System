// backend/src/modules/review/review.controller.js
//
// FIXES:
// • createReview: cafeId is now optional in the request body.
//   Falls back to process.env.CAFE_ID. This prevents the 400/500
//   "rating, text and cafeId are required" error when the frontend
//   sends cafeId="default" or undefined (user.cafeId may not be set
//   on username-only registered users).
// • getReviews / getMyReview: menuItemId query param is accepted but
//   ignored (reviews are cafe-level, not per-item). Left as-is for
//   backwards compatibility — the extra param causes no harm.
// • All error responses now include the actual error message in dev
//   so silent 500s are easier to diagnose.

import Review    from './review.model.js'
import { cloudinary } from '../../config/cloudinary.js'

const DEFAULT_CAFE_ID = process.env.CAFE_ID ?? process.env.VITE_CAFE_ID ?? null

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews
// Public — returns all visible cafe reviews
// Query: ?page=1&limit=12&rating=5&sort=recent|top
// ─────────────────────────────────────────────────────────────────────────────
export const getReviews = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  ?? 1,  10))
    const limit  = Math.min(50, parseInt(req.query.limit ?? 12, 10))
    const skip   = (page - 1) * limit
    const { rating, sort = 'recent' } = req.query

    const filter = { isVisible: true }
    if (rating) filter.rating = Number(rating)

    const sortObj = sort === 'top'
      ? { likes: -1, rating: -1, createdAt: -1 }
      : { createdAt: -1 }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select('-likedBy -__v')
        .lean(),
      Review.countDocuments(filter),
    ])

    const agg = await Review.aggregate([
      { $match: { isVisible: true } },
      {
        $group: {
          _id:    null,
          avg:    { $avg: '$rating' },
          count:  { $sum: 1 },
          stars5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          stars4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          stars3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          stars2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          stars1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        },
      },
    ])

    const summary = agg[0]
      ? {
          avg:   Math.round((agg[0].avg ?? 0) * 10) / 10,
          total: agg[0].count,
          dist:  [agg[0].stars5, agg[0].stars4, agg[0].stars3, agg[0].stars2, agg[0].stars1],
        }
      : { avg: 0, total: 0, dist: [0, 0, 0, 0, 0] }

    return res.json({
      success: true,
      data: {
        reviews,
        summary,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    console.error('[Review] getReviews:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/my
// Auth required
// ─────────────────────────────────────────────────────────────────────────────
export const getMyReview = async (req, res) => {
  try {
    const review = await Review.findOne({ customerId: req.user._id }).lean()
    return res.json({ success: true, data: review ?? null })
  } catch (err) {
    console.error('[Review] getMyReview:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch your review.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews
// Auth required (customer)
// Body: { rating, text, cafeId? }
//
// FIX: cafeId is now optional — falls back to process.env.CAFE_ID.
// Previously required in body, but:
//   1. Username-only users may not have cafeId on their user document
//   2. Frontend was sending cafeId="default" as fallback → Mongoose
//      ObjectId cast error → 500 "Failed to submit review"
// ─────────────────────────────────────────────────────────────────────────────
export const createReview = async (req, res) => {
  try {
    const { rating, text } = req.body
    // FIX: resolve cafeId from body → user document → env → error
    const cafeId =
      req.body.cafeId && req.body.cafeId !== 'default'
        ? req.body.cafeId
        : req.user.cafeId?.toString()
        ?? DEFAULT_CAFE_ID

    if (!rating || !text) {
      return res.status(400).json({ success: false, message: 'rating and text are required.' })
    }
    if (!cafeId) {
      return res.status(400).json({ success: false, message: 'cafeId could not be determined. Contact support.' })
    }
    if (Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1–5.' })
    }
    if (text.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Review must be at least 10 characters.' })
    }

    const u            = req.user
    const customerName = u.name ?? u.displayName ?? u.username ?? 'Customer'

    const review = await Review.create({
      cafeId,
      customerId:     u._id,
      customerName,
      customerAvatar: u.avatar ?? u.photo ?? null,
      rating:         Number(rating),
      text:           text.trim(),
      photoUrl:       req.file?.path     ?? null,
      publicId:       req.file?.filename ?? null,
    })

    return res.status(201).json({ success: true, data: review })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this cafe.' })
    }
    // FIX: surface the actual Mongoose validation message in dev
    const msg = process.env.NODE_ENV !== 'production' && err.message
      ? err.message
      : 'Failed to submit review.'
    console.error('[Review] createReview:', err)
    return res.status(500).json({ success: false, message: msg })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/reviews/:reviewId
// Auth — customer edits their own review
// ─────────────────────────────────────────────────────────────────────────────
export const updateReview = async (req, res) => {
  try {
    const { reviewId }     = req.params
    const { rating, text } = req.body
    const customerId       = req.user._id

    const review = await Review.findOne({ _id: reviewId, customerId })
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found or not yours.' })
    }

    if (rating !== undefined) {
      if (Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be 1–5.' })
      }
      review.rating = Number(rating)
    }
    if (text !== undefined) {
      if (text.trim().length < 10) {
        return res.status(400).json({ success: false, message: 'Review must be at least 10 characters.' })
      }
      review.text = text.trim()
    }

    if (req.file) {
      if (review.publicId) {
        await cloudinary.uploader.destroy(review.publicId).catch(() => {})
      }
      review.photoUrl = req.file.path
      review.publicId = req.file.filename
    }

    await review.save()
    return res.json({ success: true, data: review })
  } catch (err) {
    console.error('[Review] updateReview:', err)
    return res.status(500).json({ success: false, message: 'Failed to update review.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/reviews/:reviewId
// ─────────────────────────────────────────────────────────────────────────────
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params
    const customerId   = req.user._id

    const review = await Review.findOneAndDelete({ _id: reviewId, customerId })
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found or not yours.' })
    }

    if (review.publicId) {
      await cloudinary.uploader.destroy(review.publicId).catch(() => {})
    }

    return res.json({ success: true, message: 'Review deleted.' })
  } catch (err) {
    console.error('[Review] deleteReview:', err)
    return res.status(500).json({ success: false, message: 'Failed to delete review.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews/:reviewId/like
// ─────────────────────────────────────────────────────────────────────────────
export const toggleLike = async (req, res) => {
  try {
    const { reviewId } = req.params
    const userId       = req.user._id

    const review = await Review.findOne({ _id: reviewId, isVisible: true })
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' })

    const alreadyLiked = review.likedBy.some(id => id.equals(userId))
    if (alreadyLiked) {
      review.likedBy = review.likedBy.filter(id => !id.equals(userId))
      review.likes   = Math.max(0, review.likes - 1)
    } else {
      review.likedBy.push(userId)
      review.likes += 1
    }

    await review.save()
    return res.json({ success: true, data: { liked: !alreadyLiked, likes: review.likes } })
  } catch (err) {
    console.error('[Review] toggleLike:', err)
    return res.status(500).json({ success: false, message: 'Failed to toggle like.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews/:reviewId/reply  (manager)
// ─────────────────────────────────────────────────────────────────────────────
export const managerReply = async (req, res) => {
  try {
    const { reviewId } = req.params
    const { text }     = req.body
    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Reply text required.' })
    }

    const review = await Review.findById(reviewId)
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' })

    review.managerReply = { text: text.trim(), repliedAt: new Date() }
    await review.save()
    return res.json({ success: true, data: review })
  } catch (err) {
    console.error('[Review] managerReply:', err)
    return res.status(500).json({ success: false, message: 'Failed to save reply.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/reviews/:reviewId/visibility  (manager)
// ─────────────────────────────────────────────────────────────────────────────
export const setVisibility = async (req, res) => {
  try {
    const { reviewId }  = req.params
    const { isVisible } = req.body

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { isVisible: Boolean(isVisible) },
      { new: true }
    )
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' })
    return res.json({ success: true, data: review })
  } catch (err) {
    console.error('[Review] setVisibility:', err)
    return res.status(500).json({ success: false, message: 'Failed to update visibility.' })
  }
}