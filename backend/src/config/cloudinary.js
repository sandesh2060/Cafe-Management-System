// src/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ── Gallery storage (manager uploads) ────────────────────────────────────────
export const galleryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'kausichiya/gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto:good' }],
  },
})

// ── Review photo storage (customer uploads) ───────────────────────────────────
export const reviewStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'kausichiya/reviews',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, crop: 'limit', quality: 'auto:good' }],
  },
})

export const uploadGallery = multer({
  storage: galleryStorage,
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

export const uploadReview = multer({
  storage: reviewStorage,
  limits:  { fileSize: 5 * 1024 * 1024 },  // 5 MB
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

export { cloudinary }
export default cloudinary