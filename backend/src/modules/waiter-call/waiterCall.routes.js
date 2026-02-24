import { Router } from 'express'
const router = Router()
router.get('/', (req, res) => res.json({ success: true, message: 'waiter-call OK' }))
export default router
