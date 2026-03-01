// backend/src/modules/auth/auth.routes.js
import { Router } from 'express'
import jwt        from 'jsonwebtoken'
import { checkUsername, register, login, logout, me } from './auth.controller.js'
import { protect } from './auth.middleware.js'
import User        from '../user/user.model.js'

const router = Router()

// ── Username-based auth ───────────────────────────────────────────────────────
router.post('/check-username', checkUsername)   // { username } → { exists: bool }
router.post('/register',       register)        // { username, name, cafeId? }
router.post('/login',          login)           // { username }
router.post('/logout',  protect, logout)
router.get ('/me',      protect, me)

// ── Guest login ───────────────────────────────────────────────────────────────
router.post('/guest', async (req, res, next) => {
  try {
    const { cafeId } = req.body

    const guest = await User.create({
      name:     'Guest',
      role:     'customer',
      isGuest:  true,
      isActive: true,
      cafeId:   cafeId || undefined,
    })

    const token = jwt.sign(
      { userId: guest._id, role: guest.role, isGuest: true },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    res.status(200).json({
      success: true,
      token,
      user: { _id: guest._id, name: 'Guest', role: 'customer', isGuest: true },
    })
  } catch (err) {
    next(err)
  }
})

export default router