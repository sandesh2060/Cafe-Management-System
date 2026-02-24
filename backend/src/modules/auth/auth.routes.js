// backend/src/modules/auth/auth.routes.js
import { Router }  from 'express'
import passport    from 'passport'
import jwt         from 'jsonwebtoken'
import { register, login, logout, me } from './auth.controller.js'
import { protect } from './auth.middleware.js'
import User        from '../user/user.model.js'

const router = Router()

// ── Standard auth ─────────────────────────────────────────────────────────────
router.post('/register', register)
router.post('/login',    login)
router.post('/logout',   protect, logout)
router.get('/me',        protect, me)

// ── Guest login ───────────────────────────────────────────────────────────────
// Creates a real (but anonymous) user in the DB so the socket middleware
// can find them via User.findById(decoded.userId).
// Guest users are cleaned up automatically via the TTL index (or manually).
router.post('/guest', async (req, res, next) => {
  try {
    const { cafeId } = req.body   // passed by frontend tableSession flow

    // Create a throwaway guest user — no email, no password
    const guest = await User.create({
      name:     'Guest',
      role:     'customer',
      isGuest:  true,           // add this field to schema if you want to query guests
      isActive: true,
      cafeId:   cafeId || undefined,
    })

    // JWT payload uses userId to match verifyToken + socket middleware
    const token = jwt.sign(
      { userId: guest._id, role: guest.role, isGuest: true },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    res.status(200).json({
      success: true,
      token,
      user: {
        _id:     guest._id,
        name:    'Guest',
        role:    'customer',
        isGuest: true,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ── GitHub OAuth ──────────────────────────────────────────────────────────────
router.get('/github',
  passport.authenticate('github', {
    scope:   ['user:email'],
    session: false,
  })
)

router.get('/github/callback',
  passport.authenticate('github', {
    session:         false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=github_failed`,
  }),
  (req, res) => {
    const user  = req.user
    const token = jwt.sign(
      { userId: user._id, role: user.role, cafeId: user.cafeId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${frontendURL}/login?token=${token}`)
  }
)

export default router