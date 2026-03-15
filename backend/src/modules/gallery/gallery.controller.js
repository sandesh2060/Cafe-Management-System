// src/modules/gallery/gallery.controller.js
import GalleryPhoto from './gallery.model.js'
import { cloudinary } from '../../config/cloudinary.js'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gallery
// Public — returns visible photos, newest first, with optional category filter
// Query: ?page=1&limit=20&category=kitchen&featured=true
// ─────────────────────────────────────────────────────────────────────────────
export const getPhotos = async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page  ?? 1,  10))
    const limit    = Math.min(60, parseInt(req.query.limit ?? 20, 10))
    const skip     = (page - 1) * limit
    const { category, featured } = req.query

    const filter = { isVisible: true }
    if (category && category !== 'all') filter.category = category
    if (featured === 'true') filter.isFeatured = true

    const [photos, total] = await Promise.all([
      GalleryPhoto.find(filter)
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'name')
        .lean(),
      GalleryPhoto.countDocuments(filter),
    ])

    return res.json({
      success: true,
      data: {
        photos,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    console.error('[Gallery] getPhotos:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch gallery.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/gallery
// Manager/Admin — upload a new photo (multipart/form-data)
// Body fields: caption, category, tags (comma-separated), isFeatured
// File field: image (handled by multer → Cloudinary)
// ─────────────────────────────────────────────────────────────────────────────
export const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' })
    }

    const { caption = '', category = 'other', tags = '', isFeatured = false, width, height } = req.body

    const photo = await GalleryPhoto.create({
      imageUrl:   req.file.path,         // Cloudinary secure_url
      publicId:   req.file.filename,     // Cloudinary public_id
      thumbnail:  req.file.path.replace('/upload/', '/upload/w_400,c_fill/'),
      caption:    caption.trim(),
      category,
      uploadedBy: req.user._id,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      width:      width  ? Number(width)  : null,
      height:     height ? Number(height) : null,
      tags:       tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    })

    return res.status(201).json({ success: true, data: photo })
  } catch (err) {
    console.error('[Gallery] uploadPhoto:', err)
    return res.status(500).json({ success: false, message: 'Failed to upload photo.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/gallery/:photoId
// Manager/Admin — update caption, category, isFeatured, isVisible
// ─────────────────────────────────────────────────────────────────────────────
export const updatePhoto = async (req, res) => {
  try {
    const { photoId } = req.params
    const allowed = ['caption', 'category', 'isFeatured', 'isVisible', 'tags']
    const update  = {}
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k] })

    const photo = await GalleryPhoto.findByIdAndUpdate(photoId, update, { new: true })
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found.' })

    return res.json({ success: true, data: photo })
  } catch (err) {
    console.error('[Gallery] updatePhoto:', err)
    return res.status(500).json({ success: false, message: 'Failed to update photo.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/gallery/:photoId
// Manager/Admin — delete photo from DB and Cloudinary
// ─────────────────────────────────────────────────────────────────────────────
export const deletePhoto = async (req, res) => {
  try {
    const { photoId } = req.params
    const photo = await GalleryPhoto.findById(photoId)
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found.' })

    // Remove from Cloudinary
    if (photo.publicId) {
      await cloudinary.uploader.destroy(photo.publicId).catch(e => {
        console.warn('[Gallery] Cloudinary delete warning:', e.message)
      })
    }

    await photo.deleteOne()
    return res.json({ success: true, message: 'Photo deleted.' })
  } catch (err) {
    console.error('[Gallery] deletePhoto:', err)
    return res.status(500).json({ success: false, message: 'Failed to delete photo.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/gallery/:photoId/like
// Auth required — toggle like
// ─────────────────────────────────────────────────────────────────────────────
export const toggleLike = async (req, res) => {
  try {
    const { photoId } = req.params
    const userId      = req.user._id

    const photo = await GalleryPhoto.findOne({ _id: photoId, isVisible: true })
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found.' })

    const alreadyLiked = photo.likedBy.some(id => id.equals(userId))
    if (alreadyLiked) {
      photo.likedBy = photo.likedBy.filter(id => !id.equals(userId))
      photo.likes   = Math.max(0, photo.likes - 1)
    } else {
      photo.likedBy.push(userId)
      photo.likes += 1
    }

    await photo.save()
    return res.json({ success: true, data: { liked: !alreadyLiked, likes: photo.likes } })
  } catch (err) {
    console.error('[Gallery] toggleLike:', err)
    return res.status(500).json({ success: false, message: 'Failed to toggle like.' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gallery/categories
// Public — returns photo counts per category
// ─────────────────────────────────────────────────────────────────────────────
export const getCategories = async (req, res) => {
  try {
    const agg = await GalleryPhoto.aggregate([
      { $match: { isVisible: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    const total = agg.reduce((s, x) => s + x.count, 0)
    return res.json({
      success: true,
      data: { categories: [{ _id: 'all', count: total }, ...agg] },
    })
  } catch (err) {
    console.error('[Gallery] getCategories:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' })
  }
}