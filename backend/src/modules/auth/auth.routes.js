// src/modules/auth/auth.routes.js
import express      from 'express'
import passport     from 'passport'
import { authenticate } from './auth.middleware.js'
import { catchAsync }   from '../../shared/middleware/errorHandler.js'
import * as authService from './auth.service.js'
import { signToken }    from '../../config/jwt.js'

const router = express.Router()

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_failed' }),
  (req, res) => {
    const { token } = req.user
    res.redirect(`${process.env.FRONTEND_URL}/login?token=${token}`)
  }
)

// ── Guest Login ───────────────────────────────────────────────────────────────
router.post('/guest', catchAsync(async (req, res) => {
  const data = await authService.guestLogin()
  res.json({ success: true, ...data })
}))

// ── Staff Login (email + password) ───────────────────────────────────────────
router.post('/staff/login', catchAsync(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' })
  }
  const data = await authService.staffLogin(email, password)
  res.json({ success: true, ...data })
}))

// ── Get current user ─────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user })
})

// ── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', authenticate, catchAsync(async (req, res) => {
  await authService.logout(req.user._id)
  res.json({ success: true, message: 'Logged out successfully' })
}))

export default router