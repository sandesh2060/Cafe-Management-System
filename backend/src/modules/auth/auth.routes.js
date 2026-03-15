// backend/src/modules/auth/auth.routes.js
//
// FIXES:
// • /check-username has its own higher rate limit (60 req/15min) — it's called
//   on every debounced keystroke. The shared /api/auth limit of 20/15min was
//   exhausted after ~2-3 username lookups + a login attempt.
// • Guest endpoint now uses signToken() helper from config/jwt.js instead of
//   raw jwt.sign(). If JWT_SECRET is undefined, signToken uses the dev fallback
//   'dev_secret' — raw jwt.sign(undefined) would sign with literal undefined,
//   meaning any token passes verification on a misconfigured server.
// • /me GET now uses sendSuccess() for consistency with all other endpoints.
//   Previously returned res.json({ success, data: user }) directly.
// • logout POST clears kc_token hint from client by returning a clear instruction.

import { Router }    from 'express'
import rateLimit     from 'express-rate-limit'
import {
  checkUsername,
  register,
  login,
  logout,
  me,
  updateProfile,
}                    from './auth.controller.js'
import { protect }   from './auth.middleware.js'
import { signToken } from '../../config/jwt.js'
import { sendSuccess } from '../../shared/utils/response.js'
import User          from '../user/user.model.js'

const router = Router()

// ── Per-endpoint rate limits ──────────────────────────────────────────────────
// check-username fires on every debounced keystroke — needs a much higher limit
// than the shared /api/auth limiter (20/15min) that wraps all auth routes.
const checkUsernameLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      120,   // ~15 username lookups per minute — plenty of headroom
  message:  { success: false, message: 'Too many username checks. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// ── Username-based auth ───────────────────────────────────────────────────────
router.post('/check-username', checkUsernameLimiter, checkUsername)
router.post('/register',       register)
router.post('/login',          login)
router.post('/logout', protect, logout)
router.get ('/me',    protect, me)
router.patch('/me',   protect, updateProfile)

// ── Guest login ───────────────────────────────────────────────────────────────
// FIX: uses signToken() helper — safe even if JWT_SECRET env var is not set in dev.
// Previously used raw jwt.sign(payload, process.env.JWT_SECRET) which silently
// signs with `undefined` if JWT_SECRET is missing, making all tokens trivially valid.
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

    const token = signToken({ userId: guest._id, role: guest.role, isGuest: true })

    sendSuccess(res, {
      token,
      user: { _id: guest._id, name: 'Guest', role: 'customer', isGuest: true },
    }, 'Guest session created')
  } catch (err) {
    next(err)
  }
})

export default router