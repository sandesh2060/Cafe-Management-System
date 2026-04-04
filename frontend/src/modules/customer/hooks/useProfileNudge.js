// src/modules/customer/hooks/useProfileNudge.js
//
// Fires profile-completion toasts at the right moments:
//   1. First login ever  → immediate toast: "Set up your profile photo"
//   2. Once per session  → if profile < 100% on MenuPage mount
//   3. On ProfilePage open → if profile < 100% and not nudged today
//
// Usage:
//   In MenuPage:    useProfileNudge('menu')
//   In ProfilePage: useProfileNudge('profile')

import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectUser, selectIsGuest } from '@store/slices/authSlice'
import { showToast } from '@store/slices/toastSlice'

const NUDGE_SESSION_KEY = 'kc_nudge_session'  // sessionStorage — clears on tab close
const NUDGE_DAY_KEY     = 'kc_nudge_day'      // localStorage  — persists across sessions
const FIRST_LOGIN_KEY   = 'kc_first_login'    // localStorage  — one-time flag

const today = () => new Date().toISOString().slice(0, 10)  // 'YYYY-MM-DD'

const MISSING_LABELS = {
  dob:               'date of birth',
  gender:            'gender',
  hobbies:           'hobbies',
  occupation:        'occupation',
  foodPreference:    'food preference',
  favouriteDrink:    'favourite drink',
  spiceTolerance:    'spice tolerance',
  diningStyle:       'dining style',
  preferredVisitTime:'preferred visit time',
}

// Funny messages per missing field
const FUNNY_MISSING = {
  dob:               '🎂 When were you born? We promise not to sing too loudly.',
  gender:            '👤 Help us know you better — what\'s your gender?',
  hobbies:           '🎮 What do you do when you\'re not eating? Tell us your hobbies!',
  occupation:        '💼 What do you do for a living? (Besides being awesome)',
  foodPreference:    '🥗 Veg, non-veg, or "yes please to everything"?',
  favouriteDrink:    '☕ What\'s your go-to drink? We need to know for science.',
  spiceTolerance:    '🌶️ How spicy can you handle? Be honest, we\'ve seen things.',
  diningStyle:       '🍽️ Solo warrior or social butterfly? How do you dine?',
  preferredVisitTime:'⏰ When do you usually come in? Morning chai or midnight momo?',
}

const calcCompletion = (user) => {
  if (!user) return 0
  const fields = ['name','email','dob','gender','hobbies','occupation','foodPreference','favouriteDrink','spiceTolerance','diningStyle','preferredVisitTime']
  let n = 0
  for (const f of fields) {
    const v = user[f]
    if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)) n++
  }
  return Math.round((n / fields.length) * 100)
}

export function useProfileNudge(context = 'menu') {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const user      = useSelector(selectUser)
  const isGuest   = useSelector(selectIsGuest)
  const firedRef  = useRef(false)

  useEffect(() => {
    if (isGuest || !user || firedRef.current) return

    const pct = calcCompletion(user)
    if (pct >= 100) return  // profile complete — no nudge needed

    // ── 1. First-ever login nudge ──────────────────────────────────────────
    const hasSeenFirstLogin = localStorage.getItem(FIRST_LOGIN_KEY)
    if (!hasSeenFirstLogin && (user.loginCount || 0) <= 1) {
      localStorage.setItem(FIRST_LOGIN_KEY, '1')
      firedRef.current = true

      const hasPhoto = !!user.avatarUrl
      dispatch(showToast({
        id:       'first-login-nudge',
        type:     'profile',
        title:    hasPhoto ? '👋 Welcome to the family!' : '📸 Set your profile photo!',
        message:  hasPhoto
          ? `Hey ${user.name?.split(' ')[0] || 'there'}! Complete your profile to unlock 50 bonus points.`
          : `Hey ${user.name?.split(' ')[0] || 'there'}! Add a photo so we know who to wave at ☺️`,
        priority: 3,
        duration: 8000,
        navigate: '/profile',
        actions:  [{ key: 'setup', label: 'Set Up Profile', primary: true }],
        soundKey: 'notification',
      }))
      return
    }

    // ── 2. Once-per-session nudge (MenuPage) ──────────────────────────────
    if (context === 'menu') {
      const sessionFired = sessionStorage.getItem(NUDGE_SESSION_KEY)
      if (sessionFired) return

      sessionStorage.setItem(NUDGE_SESSION_KEY, '1')
      firedRef.current = true

      // Pick the first missing field to nudge about
      const missing = Object.keys(MISSING_LABELS).find(f => {
        const v = user[f]
        return v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)
      })
      if (!missing) return

      const funny = FUNNY_MISSING[missing]
      dispatch(showToast({
        id:       `nudge-menu-${missing}`,
        type:     'profile',
        title:    `Your profile is ${pct}% complete`,
        message:  funny || `Add your ${MISSING_LABELS[missing]} to complete your profile!`,
        priority: 4,
        duration: 7000,
        navigate: '/profile',
        actions:  [{ key: 'complete', label: 'Complete Now', primary: true }],
      }))
      return
    }

    // ── 3. Once-per-day nudge (ProfilePage) ───────────────────────────────
    if (context === 'profile') {
      const lastDay = localStorage.getItem(NUDGE_DAY_KEY)
      if (lastDay === today()) return

      localStorage.setItem(NUDGE_DAY_KEY, today())
      firedRef.current = true

      const missing = Object.keys(MISSING_LABELS).find(f => {
        const v = user[f]
        return v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)
      })
      if (!missing) return

      // Slightly different tone for profile page — more encouraging
      const msgs = [
        `You're SO close! Just add your ${MISSING_LABELS[missing]} 👀`,
        `${pct}% done — your profile needs some TLC! Add ${MISSING_LABELS[missing]}`,
        `Psst… ${MISSING_LABELS[missing]} is still missing. Future you will thank present you.`,
      ]
      dispatch(showToast({
        id:       `nudge-profile-${missing}`,
        type:     'profile',
        title:    '✨ Profile incomplete',
        message:  msgs[Math.floor(Math.random() * msgs.length)],
        priority: 4,
        duration: 6000,
        navigate: null,  // already on profile page
      }))
    }
  }, [user, isGuest, context]) // eslint-disable-line
}

export default useProfileNudge