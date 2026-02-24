import { Router } from 'express'
const router = Router()
router.get('/', (req, res) => res.json({ success: true, message: 'staff OK' }))
export default router
