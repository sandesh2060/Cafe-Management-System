import { Router } from 'express'
const router = Router()
router.get('/', (req, res) => res.json({ success: true, message: 'recommendations OK' }))
export default router
