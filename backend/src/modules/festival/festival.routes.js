// backend/src/modules/festival/festival.routes.js

import express from 'express'
import {
  getTodayFestivals,
  getAllFestivals,
  createFestival,
  updateFestival,
  deleteFestival,
  seedFestivals,
} from './festival.controller.js'
import { protect }      from '../auth/auth.middleware.js'
import requireRole  from '../../shared/middleware/requireRole.js'

const router = express.Router()

// ── Public (customer app calls this) ──────────────────────────────────────────
router.get('/today', getTodayFestivals)

// ── Admin/Manager only ────────────────────────────────────────────────────────
router.use(protect, requireRole('admin', 'manager'))

router.get('/',      getAllFestivals)
router.post('/',     createFestival)
router.post('/seed', seedFestivals)
router.patch('/:id', updateFestival)
router.delete('/:id',deleteFestival)

export default router