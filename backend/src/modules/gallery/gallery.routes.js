// src/modules/gallery/gallery.routes.js
import { Router }       from 'express'
import { authenticate } from '../auth/auth.middleware.js'
import requireRole      from '../../shared/middleware/requireRole.js'   // ← fixed: default import
import { uploadGallery } from '../../config/cloudinary.js'
import {
  getPhotos,
  uploadPhoto,
  updatePhoto,
  deletePhoto,
  toggleLike,
  getCategories,
} from './gallery.controller.js'

const router = Router()

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/',            getPhotos)
router.get('/categories',  getCategories)

// ── Auth required ──────────────────────────────────────────────────────────────
router.use(authenticate)

// Customer can like
router.post('/:photoId/like', toggleLike)

// Manager / Admin only
router.use(requireRole('manager', 'admin'))
router.post(  '/',           uploadGallery.single('image'), uploadPhoto)
router.patch( '/:photoId',   updatePhoto)
router.delete('/:photoId',   deletePhoto)

export default router