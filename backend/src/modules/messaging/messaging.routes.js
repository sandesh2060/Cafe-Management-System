import { Router } from 'express'
const router = Router()
router.get('/', (req, res) => res.json({ success: true, message: 'messaging OK' }))
export default router
