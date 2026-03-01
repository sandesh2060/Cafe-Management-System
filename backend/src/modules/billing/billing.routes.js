// file : frontend/src/modules/billing/billing.routes.js
import { Router } from 'express'
const router = Router()
router.get('/', (req, res) => res.json({ success: true, message: 'billing OK' }))
export default router
