// src/modules/review/review.controller.js
import Review   from './review.model.js'
import MenuItem from '../menu/menu.model.js'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Recompute and persist avgRating + reviewCount on MenuItem after any write
const syncMenuItemRating = async (menuItemId) => {
  const agg = await Review.aggregate([
    { $match: { menuItemId, isVisible: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])
  const avg   = agg[0]?.avg   ?? 0
  const count = agg[0]?.count ?? 0
  await MenuItem.findByIdAndUpdate(menuItemId, {
    avgRating:   Math.round(avg * 10) / 10,   // 1 decimal place
    reviewCount: count,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/:menuItemId
// Public — returns visible reviews for an item, newest first
// Query: ?page=1&limit=10
// ─────────────────────────────────────────────────────────────────────────────
export const getReviews = async (req, res) => {
  try {
    const { menuItemId } = req.params
    const page  = Math.max(1, parseInt(req.query.page  ?? 1,  10))
    const limit = Math.min(50, parseInt(req.query.limit ?? 10, 10))
    const skip  = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      Review.find({ menuItemId, isVisible: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-likedBy -__v')
        .lean(),
      Review.countDocuments({ menuItemId, isVisible: true }),
    ])

    // Also return the aggregate summary so the UI can render star bars
    const agg = await Review.aggregate([
      { $match: { menuItemId: new (await import('mongoose')).default.Types.ObjectId(menuItemId), isVisible: true } },
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
// POST /api/reviews/:menuItemId
// Auth required (customer)
// Body: { rating: 1-5, text: string, cafeId: string }
// ─────────────────────────────────────────────────────────────────────────────
export const createReview = async (req, res) => {
  try {
    const { menuItemId }         = req.params
    const { rating, text, cafeId } = req.body
    const customerId             = req.user._id

    if (!rating || !text || !cafeId) {
      return res.status(400).json({ success: false, message: 'rating, text and cafeId are required.' })
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' })
    }
    if (text.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Review must be at least 10 characters.' })
    }

    // Build a display name from the user object (handle guest/google/email shapes)
    const u            = req.user
    const customerName = u.name ?? u.displayName ?? u.email?.split('@')[0] ?? 'Customer'

    const review = await Review.create({
      menuItemId,
      cafeId,
      customerId,
      customerName,
      customerAvatar: u.avatar ?? u.photo ?? null,
      rating:  Number(rating),
      text:    text.trim(),
    })

    // Keep MenuItem.avgRating in sync
    await syncMenuItemRating(menuItemId)

    return res.status(201).json({ success: true, data: review })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this item.' })
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message })
    }
    console.error('[Review] createReview:', err)
    return res.status(500).json({ success: false, message: 'Failed to submit review.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/reviews/:reviewId
// Auth required — customer can only edit their own review
// Body: { rating?, text? }
// ─────────────────────────────────────────────────────────────────────────────
export const updateReview = async (req, res) => {
  try {
    const { reviewId }   = req.params
    const { rating, text } = req.body
    const customerId     = req.user._id

    const review = await Review.findOne({ _id: reviewId, customerId })
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found or not yours.' })
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' })
      }
      review.rating = Number(rating)
    }
    if (text !== undefined) {
      if (text.trim().length < 10) {
        return res.status(400).json({ success: false, message: 'Review must be at least 10 characters.' })
      }
      review.text = text.trim()
    }

    await review.save()
    await syncMenuItemRating(review.menuItemId.toString())

    return res.json({ success: true, data: review })
  } catch (err) {
    console.error('[Review] updateReview:', err)
    return res.status(500).json({ success: false, message: 'Failed to update review.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/reviews/:reviewId
// Auth required — customer can delete their own review
// ─────────────────────────────────────────────────────────────────────────────
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params
    const customerId   = req.user._id

    const review = await Review.findOneAndDelete({ _id: reviewId, customerId })
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found or not yours.' })
    }

    await syncMenuItemRating(review.menuItemId.toString())
    return res.json({ success: true, message: 'Review deleted.' })
  } catch (err) {
    console.error('[Review] deleteReview:', err)
    return res.status(500).json({ success: false, message: 'Failed to delete review.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reviews/:reviewId/like
// Auth required — toggle like (idempotent)
// ─────────────────────────────────────────────────────────────────────────────
export const toggleLike = async (req, res) => {
  try {
    const { reviewId } = req.params
    const userId       = req.user._id

    const review = await Review.findOne({ _id: reviewId, isVisible: true })
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' })
    }

    const alreadyLiked = review.likedBy.some(id => id.equals(userId))
    if (alreadyLiked) {
      review.likedBy = review.likedBy.filter(id => !id.equals(userId))
      review.likes   = Math.max(0, review.likes - 1)
    } else {
      review.likedBy.push(userId)
      review.likes += 1
    }

    await review.save()
    return res.json({
      success: true,
      data: { liked: !alreadyLiked, likes: review.likes },
    })
  } catch (err) {
    console.error('[Review] toggleLike:', err)
    return res.status(500).json({ success: false, message: 'Failed to toggle like.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reviews/:menuItemId/my
// Auth required — fetch the current user's review for this item (if any)
// Used to pre-fill the edit form and know if the user has already reviewed
// ─────────────────────────────────────────────────────────────────────────────
export const getMyReview = async (req, res) => {
  try {
    const { menuItemId } = req.params
    const customerId     = req.user._id

    const review = await Review.findOne({ menuItemId, customerId }).lean()
    return res.json({ success: true, data: review ?? null })
  } catch (err) {
    console.error('[Review] getMyReview:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch your review.' })
  }
}