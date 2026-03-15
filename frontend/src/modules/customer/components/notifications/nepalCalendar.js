// frontend/src/modules/customer/components/notifications/nepalCalendar.js
//
// Festival dates come from the backend API — admin sets exact AD dates.
// No hardcoded BS ranges. No drift. Ever.
//
// International days (fixed AD dates) stay here since they never change.
// Season / day-of-week / time fallbacks also stay here.
//
// USAGE:
//   import { fetchTodayFestivals, getTodayContext, getDateBasedToast } from './nepalCalendar'
//
//   // In useNotifications.js:
//   const [apiFestivals, setApiFestivals] = useState([])
//   useEffect(() => { fetchTodayFestivals().then(setApiFestivals) }, [])
//   const ctx = getTodayContext(user, apiFestivals)
//   const toast = getDateBasedToast(ctx, user, visitCount)

import api from '@api/axios'

// ─── FETCH FROM BACKEND ────────────────────────────────────────────────────────
// Cached in memory for the current session (backend Redis caches 24h)
let _festivalCache = null
let _festivalCacheDate = null

export const fetchTodayFestivals = async () => {
  const today = new Date().toISOString().slice(0, 10)

  // In-memory cache for the session — only one network call per day per tab
  if (_festivalCache && _festivalCacheDate === today) {
    return _festivalCache
  }

  try {
    const res  = await api.get('/festivals/today')
    const data = res.data?.data ?? res.data ?? []
    _festivalCache     = Array.isArray(data) ? data : []
    _festivalCacheDate = today
    return _festivalCache
  } catch (err) {
    console.warn('[nepalCalendar] Could not fetch festivals from API:', err?.message)
    return []
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const nthWeekday = (year, month, nth, weekday) => {
  let count = 0
  for (let day = 1; day <= 31; day++) {
    const date = new Date(year, month - 1, day)
    if (date.getMonth() !== month - 1) break
    if (date.getDay() === weekday) {
      count++
      if (count === nth) return day
    }
  }
  return 1
}

// ─── INTERNATIONAL DAYS (fixed AD month/day — never change) ──────────────────
const getInternationalDays = (adDate) => {
  const yr = adDate.getFullYear()
  const mo = adDate.getMonth() + 1
  const da = adDate.getDate()
  const days = []

  const check = (m, d, name, emoji, title, message) => {
    if (mo === m && da === d) days.push({ name, emoji, title, message, type: 'international', imageUrl: null })
  }
  const checkNth = (nth, weekday, m, name, emoji, title, message) => {
    const day = nthWeekday(yr, m, nth, weekday)
    if (mo === m && da === day) days.push({ name, emoji, title, message, type: 'international', imageUrl: null })
  }

  check(1,  1,  'New Year',              '🎆', 'Happy New Year! 🎆',            'A fresh start. Black Coffee (Rs 120) or Banana Smoothie (Rs 160). New year, new drink.')
  check(1,  29, 'World Soup Day',        '🍲', 'World Soup Day! 🍲',            "Chicken Noodle Soup (Rs 200) just became mandatory. You're welcome.")
  check(2,  14, "Valentine's Day",       '❤️', "Happy Valentine's Day ❤️",     "Two Cold Coffees (Rs 160 each). Share the Chocolate Brownie (Rs 250). That's love.")
  check(3,  8,  "Women's Day",           '💜', "International Women's Day 💜",  "To every woman keeping the world running — Mango Lassi (Rs 140) in your honour.")
  check(3,  14, 'Pi Day',                '🥧', 'Happy Pi Day! 🥧 (3.14)',        'The only irrational thing today: how much Chocolate Brownie (Rs 250) you order.')
  check(3,  20, 'World Happiness Day',   '😊', 'World Happiness Day 😊',         'The UN says today is officially happy. Masala Chiya (Rs 80) agrees.')
  check(3,  22, 'World Water Day',       '💧', 'World Water Day 💧',             'Fresh Orange Juice (Rs 130). Hydration + taste. Both.')
  check(4,  7,  'World Health Day',      '🏥', 'World Health Day 🏥',            'Veg Momo (Rs 160) + Fresh OJ (Rs 130) = the healthiest excuse to order.')
  check(4,  22, 'Earth Day',             '🌍', 'Happy Earth Day 🌍',             'Watermelon Mint Cooler (Rs 150) — seasonal, local. Your conscience is clean.')
  check(4,  23, 'World Book Day',        '📚', 'World Book Day 📚',              'Corner + book + Black Coffee (Rs 120) = the correct way to spend today.')
  check(5,  1,  'Labour Day',            '⚒️', 'Labour Day / May Day ⚒️',        "Dal Bhat (Rs 220) — the working person's meal. Honour the workers.")
  check(5,  21, 'World Tea Day',         '🍵', 'World Tea Day 🍵',               'Masala Chiya (Rs 80) IS the celebration. Non-negotiable.')
  check(5,  31, 'No Tobacco Day',        '🚭', 'World No Tobacco Day 🚭',        'Skip the smoke. Masala Chiya (Rs 80). Your lungs and taste buds both win.')
  check(6,  1,  'World Milk Day',        '🥛', 'World Milk Day 🥛',              'Banana Smoothie (Rs 160) or Mango Lassi (Rs 140). Milk-based excellence.')
  check(6,  5,  'Environment Day',       '🌿', 'World Environment Day 🌿',       'Watermelon Cooler (Rs 150) — green choice, great taste.')
  check(6,  21, 'World Music Day',       '🎵', 'World Music Day 🎵',             'Good music + Cold Coffee (Rs 160) = the universal language of a good afternoon.')
  check(6,  21, 'World Yoga Day',        '🧘', 'International Yoga Day 🧘',      'Banana Smoothie (Rs 160) post-yoga. Balance restored.')
  check(7,  7,  'World Chocolate Day',   '🍫', 'World Chocolate Day! 🍫',        'Chocolate Brownie (Rs 250) is required by international law today.')
  check(7,  17, 'World Emoji Day',       '😄', 'World Emoji Day 😄',             '🍵☕🥟🍜🍛😋 — our entire menu in emojis. Order your favourite.')
  check(8,  12, 'International Youth Day','🌟','International Youth Day 🌟',    'Cold Coffee (Rs 160) + Chicken Momo (Rs 180). The youth combo.')
  check(8,  19, 'World Photography Day', '📸', 'World Photography Day 📸',       'Snap our food, post it, tag us.')
  check(9,  5,  "Teacher's Day Nepal",   '🍎', "Teacher's Day 🍎",               "Dal Bhat (Rs 220) for every teacher who said 'this will matter someday.'")
  check(9,  21, 'World Peace Day',       '☮️', 'International Day of Peace ☮️',  'Dal Bhat (Rs 220) — the most grounding food in Nepal. Eat. Breathe. Be well.')
  check(9,  27, 'World Tourism Day',     '✈️', 'World Tourism Day ✈️',           'Nepal welcomes the world. Masala Chiya (Rs 80) is your first Nepali lesson.')
  check(10, 1,  'Coffee Day',            '☕', 'International Coffee Day! ☕',    'The most important day of the year for us. Black Coffee (Rs 120). Just drink it.')
  check(10, 10, 'World Mental Health',   '🧠', 'World Mental Health Day 🧠',     'Slow down. A Masala Chiya (Rs 80) is a small kindness to yourself.')
  check(10, 16, 'World Food Day',        '🌾', 'World Food Day 🌾',              'Celebrate food. Specifically: Chicken Momo (Rs 180).')
  check(11, 13, 'World Kindness Day',    '💛', 'World Kindness Day 💛',          'Tip your waiter. Chocolate Brownie (Rs 250) — kindness to yourself counts.')
  check(11, 14, "Children's Day Nepal",  '🧒', "Children's Day Nepal 🧒",        'Bal Diwas! Sel Roti (Rs 120) + Mango Lassi (Rs 140) = guaranteed smiles.')
  check(11, 19, "Men's Day",             '💙', "International Men's Day 💙",     "It's okay to order the Chocolate Brownie (Rs 250). We promise.")
  check(12, 25, 'Christmas',             '🎄', 'Merry Christmas! 🎄',            'Chocolate Brownie (Rs 250) + Cold Coffee (Rs 160) = the only gift that matters.')
  check(12, 31, "New Year's Eve",        '🥂', "New Year's Eve! 🥂",             'Last day of the year. Black Coffee (Rs 120) to stay awake until midnight.')

  checkNth(2, 0, 5,  "Mother's Day",   '💐', "Happy Mother's Day 💐",    "She orders, you pay. Mango Lassi (Rs 140) is her vibe.")
  checkNth(3, 0, 6,  "Father's Day",   '👔', "Happy Father's Day 👔",    "Dal Bhat (Rs 220) — he'll say 'decent' which means he loves it.")
  checkNth(1, 0, 8,  'Friendship Day', '🤝', 'Happy Friendship Day 🤝',  'Share a Chocolate Brownie (Rs 250). Friendship test: passed.')
  checkNth(1, 5, 10, 'World Smile Day','😊', 'World Smile Day 😊',       'Sel Roti (Rs 120) makes people smile. Tested and confirmed.')

  return days
}

// ─── NEPAL SEASONS ────────────────────────────────────────────────────────────
const getSeason = (adDate) => {
  const md = (adDate.getMonth() + 1) * 100 + adDate.getDate()
  if (md >= 301 && md <= 531)   return 'spring'
  if (md >= 601 && md <= 930)   return 'monsoon'
  if (md >= 1001 && md <= 1130) return 'autumn'
  return 'winter'
}

const isExamSeason = (adDate) => {
  const md = (adDate.getMonth() + 1) * 100 + adDate.getDate()
  return (md >= 301 && md <= 415) || (md >= 1101 && md <= 1130)
}

const isTouristSeason = (adDate) => {
  const md = (adDate.getMonth() + 1) * 100 + adDate.getDate()
  return (md >= 1001 && md <= 1130) || (md >= 301 && md <= 531)
}

// ─── NEAR BIRTHDAY ────────────────────────────────────────────────────────────
const getNearBirthday = (adDate, user) => {
  if (!user?.birthday && !user?.dob) return null
  const bday = new Date(user.birthday ?? user.dob)
  if (isNaN(bday)) return null
  const thisYear = new Date(adDate.getFullYear(), bday.getMonth(), bday.getDate())
  const diff = Math.ceil((thisYear - adDate) / (1000 * 60 * 60 * 24))
  if (diff === 0)             return 'today'
  if (diff === 1)             return 'tomorrow'
  if (diff > 0 && diff <= 7) return `in ${diff} days`
  return null
}

// ─── TIME SLOT ────────────────────────────────────────────────────────────────
export const getTimeSlot = () => {
  const hr = new Date().getHours()
  if (hr >= 5  && hr < 8)  return 'earlybird'
  if (hr >= 8  && hr < 12) return 'morning'
  if (hr >= 12 && hr < 17) return 'afternoon'
  if (hr >= 17 && hr < 21) return 'evening'
  return 'latenight'
}

// ─── MAIN CONTEXT BUILDER ─────────────────────────────────────────────────────
// apiFestivals: array returned by fetchTodayFestivals() — pass from useNotifications
export const getTodayContext = (user = null, apiFestivals = []) => {
  const adDate    = new Date()
  const adMo      = adDate.getMonth() + 1
  const adDa      = adDate.getDate()
  const dayOfWeek = adDate.getDay()

  const internationalDays = getInternationalDays(adDate)
  const season            = getSeason(adDate)
  const timeSlot          = getTimeSlot()

  return {
    festivals:        apiFestivals,   // from backend API — exact AD dates
    internationalDays,
    season,
    timeSlot,
    isWeekend:        dayOfWeek === 0 || dayOfWeek === 6,
    isMonday:         dayOfWeek === 1,
    isFriday:         dayOfWeek === 5,
    isSaturday:       dayOfWeek === 6,
    isSunday:         dayOfWeek === 0,
    isExamSeason:     isExamSeason(adDate),
    isTouristSeason:  isTouristSeason(adDate),
    isMonsoon:        season === 'monsoon',
    nearBirthday:     getNearBirthday(adDate, user),
    month: adMo,
    date:  adDa,
    hour:  adDate.getHours(),
    dayOfWeek,
  }
}

// ─── TOAST GENERATOR ──────────────────────────────────────────────────────────
// Priority: birthday > API festival > international day > season > exam > day > time
export const getDateBasedToast = (ctx, user = null, visitCount = 0) => {
  const {
    festivals, internationalDays, season, timeSlot,
    isWeekend, isExamSeason: examSeason, nearBirthday,
    isTouristSeason, isMonday, isFriday, isSaturday, isMonsoon,
  } = ctx

  const name = user?.name ? `, ${user.name.split(' ')[0]}` : ''

  // ── 1. BIRTHDAY ─────────────────────────────────────────────────────────────
  if (nearBirthday === 'today') {
    return {
      type: 'birthday', emoji: '🎂', imageUrl: null,
      title: `Happy Birthday${name}! 🎂`,
      message: `Your day! Chocolate Brownie (Rs 250) + Cold Coffee (Rs 160) = the birthday combo.`,
      soundKey: 'tierUpgraded', duration: 12000, navigate: '/menu',
      color: '#EC4899',
      actions: [{ key: 'view_menu', label: '🎂 Birthday treat', primary: true }],
    }
  }
  if (nearBirthday === 'tomorrow') {
    return {
      type: 'birthday', emoji: '🎉', imageUrl: null, color: '#EC4899',
      title: `Birthday tomorrow${name}! 🎉`,
      message: `Big day tomorrow. Chocolate Brownie (Rs 250) tonight. Pre-celebration fuel.`,
      duration: 9000, navigate: '/notifications',
    }
  }
  if (nearBirthday) {
    return {
      type: 'birthday', emoji: '🎁', imageUrl: null, color: '#EC4899',
      title: `Birthday ${nearBirthday}${name}! 🎂`,
      message: `${nearBirthday.charAt(0).toUpperCase() + nearBirthday.slice(1)} is your day. Start planning the celebration meal.`,
      duration: 7000, navigate: '/notifications',
    }
  }

  // ── 2. API FESTIVAL (exact AD dates, set by admin) ──────────────────────────
  if (festivals.length > 0) {
    const f = festivals[0]
    return {
      type:     'festival',
      emoji:    f.emoji,
      imageUrl: f.imageUrl ?? null,   // ← passed to ToastCard for overflow visual
      color:    f.color   ?? '#F472B6',
      title:    f.title,
      message:  f.message,
      soundKey: f.soundKey ?? 'loyalty',
      vibrate:  f.vibrate  ?? [50, 30, 50, 30, 80],
      duration: 9000,
      navigate: '/notifications',
    }
  }

  // ── 3. INTERNATIONAL DAY ────────────────────────────────────────────────────
  if (internationalDays.length > 0) {
    const d = internationalDays[0]
    return {
      type: 'festival', emoji: d.emoji, imageUrl: null, color: '#F472B6',
      title: d.title, message: d.message,
      duration: 9000, navigate: '/notifications',
    }
  }

  // ── 4. SEASON ───────────────────────────────────────────────────────────────
  if (isMonsoon) {
    const opts = [
      { title: 'Monsoon season in Nepal 🌧️', message: 'The rains are here. Thukpa (Rs 200) is the most Nepali response to this weather.' },
      { title: 'Monsoon vibes ☔',            message: 'Masala Chiya (Rs 80) makes it better. Always.' },
      { title: "Weeks of rain 🌦️",           message: 'Chicken Noodle Soup (Rs 200). Monsoon patience deserves it.' },
      { title: 'Classic monsoon afternoon 🌧️', message: 'Rain + Veg Momo (Rs 160) = the combo Nepal was built for.' },
    ]
    const t = opts[Math.floor(Math.random() * opts.length)]
    return { type: 'weather', emoji: '🌧️', imageUrl: null, duration: 7000, navigate: '/menu', ...t }
  }

  if (season === 'autumn' && isTouristSeason) {
    return {
      type: 'system', emoji: '🏔️', imageUrl: null, duration: 7000, navigate: '/notifications',
      title: 'Peak trekking season! 🏔️',
      message: 'October in Nepal. Tourists everywhere. Locals sitting here with Masala Chiya (Rs 80). Choose wisely.',
    }
  }

  if (season === 'spring' && isTouristSeason) {
    return {
      type: 'system', emoji: '🌸', imageUrl: null, duration: 7000, navigate: '/notifications',
      title: 'Spring trekking season 🌸',
      message: "Rhododendrons blooming in the hills. Cold Coffee (Rs 160) while we describe the view.",
    }
  }

  if (season === 'winter') {
    const opts = [
      { title: 'Winter in Nepal ❄️',            message: "Tomato Soup (Rs 150) + Cheese Garlic Bread (Rs 180). Cold nights deserve this." },
      { title: "It's genuinely cold outside 🧊", message: "Masala Chiya (Rs 80) isn't optional in winter. It's survival equipment." },
      { title: 'Cold Kathmandu morning ❄️',      message: 'Dal Bhat (Rs 220) + warm seat. The most correct winter decision.' },
    ]
    const t = opts[Math.floor(Math.random() * opts.length)]
    return { type: 'weather', emoji: '❄️', imageUrl: null, duration: 7000, navigate: '/menu', ...t }
  }

  // ── 5. EXAM SEASON ──────────────────────────────────────────────────────────
  if (examSeason) {
    return {
      type: 'system', emoji: '📚', imageUrl: null, duration: 7000, navigate: '/menu',
      title: 'SEE/+2 exam season 📚',
      message: visitCount >= 3
        ? `You study here. Black Coffee (Rs 120) — same table, same companion.`
        : 'Exam season. Black Coffee (Rs 120) + quiet corner = maximum productivity.',
    }
  }

  // ── 6. DAY OF WEEK ──────────────────────────────────────────────────────────
  if (isMonday) {
    return { type: 'idle', emoji: '😮‍💨', imageUrl: null, duration: 6000, navigate: '/menu',
      title: 'Monday. We know. 😮‍💨',
      message: 'Black Coffee (Rs 120) is the only correct response to a Monday.' }
  }
  if (isFriday) {
    return { type: 'idle', emoji: '🎉', imageUrl: null, duration: 6000, navigate: '/menu',
      title: "It's Friday! 🎉",
      message: 'Weekend starts NOW. Cold Coffee (Rs 160) + Veg Momo (Rs 160) = the Friday reset.' }
  }
  if (isSaturday) {
    return { type: 'idle', emoji: '😎', imageUrl: null, duration: 6000, navigate: '/menu',
      title: 'Saturday mode 😎',
      message: visitCount >= 5
        ? `Always here on Saturdays. Chocolate Brownie (Rs 250) — your weekend tradition.`
        : 'No alarm, no rush. Dal Bhat (Rs 220) + no schedule = the best possible Saturday.' }
  }
  if (isWeekend) {
    return { type: 'idle', emoji: '😴', imageUrl: null, duration: 6000, navigate: '/menu',
      title: 'Weekend mode activated 😴',
      message: 'Mango Lassi (Rs 140) + window seat. The weekend is already winning.' }
  }

  // ── 7. TIME-BASED FALLBACK ──────────────────────────────────────────────────
  const timeMap = {
    earlybird: { emoji: '🌅', title: 'Early bird gets the Chiya 🌅',
      message: "Before 8am and already here? Banana Smoothie (Rs 160) + Black Coffee (Rs 120). Let's go." },
    morning:   { emoji: '☀️', title: 'Good morning ☀️',
      message: visitCount >= 3
        ? `Good morning${name}! Masala Chiya (Rs 80) — ready before you even ask.`
        : 'Masala Chiya (Rs 80) to start. The correct morning order of operations.' },
    afternoon: { emoji: '🌤️', title: 'Afternoon hunger is real 🌤️',
      message: 'The 2pm slump hits hard. Cold Coffee (Rs 160) + Veg Momo (Rs 160) = instant recovery.' },
    evening:   { emoji: '🌇', title: 'Golden hour in Kathmandu 🌇',
      message: visitCount >= 5
        ? `Mango Lassi (Rs 140) — your golden hour drink.`
        : "Mango Lassi (Rs 140) + window seat. You've earned this." },
    latenight: { emoji: '🌙', title: 'Still awake? 🌙',
      message: "Black Coffee (Rs 120) or Masala Chiya (Rs 80). We're here." },
  }

  const tt = timeMap[timeSlot] ?? timeMap.morning
  return { type: 'system', imageUrl: null, duration: 6000, navigate: '/menu', ...tt }
}