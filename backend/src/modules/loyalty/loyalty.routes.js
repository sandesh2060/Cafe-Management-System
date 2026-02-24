import { Router } from 'express'
const router = Router()
router.get('/', (req, res) => res.json({ success: true, message: 'loyalty OK' }))
export default router
