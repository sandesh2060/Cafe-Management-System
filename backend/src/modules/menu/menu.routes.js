// src/modules/menu/menu.routes.js
import { Router } from 'express'
import {
  getMenuByCafe,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
} from './menu.controller.js'
import { authenticate } from '../auth/auth.middleware.js'
import { requireRole }  from '../../shared/middleware/roleCheck.js'

const router = Router()

// ── Public ────────────────────────────────────────────────────────────────────
// GET /api/menu/:cafeId          → full menu for a cafe (customers + guests)
// GET /api/menu/:cafeId/item/:id → single item detail
router.get('/:cafeId',           getMenuByCafe)
router.get('/:cafeId/item/:id',  getMenuItemById)

// ── Manager / Admin only ──────────────────────────────────────────────────────
router.use(authenticate, requireRole('manager', 'admin'))

router.post('/:cafeId',                    createMenuItem)
router.put('/:cafeId/item/:id',            updateMenuItem)
router.delete('/:cafeId/item/:id',         deleteMenuItem)
router.patch('/:cafeId/item/:id/toggle',   toggleAvailability)

export default router