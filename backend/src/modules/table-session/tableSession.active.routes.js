import { Router } from 'express'
const router = Router()
router.get('/active', (req, res) => res.json({ success: true, message: 'active session OK' }))
export default router
