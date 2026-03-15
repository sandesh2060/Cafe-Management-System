// src/modules/customer/hooks/useNotifications.js
//
// PRODUCTION ARCHITECTURE:
//
// TWO SEPARATE CHANNELS:
//   A) TOAST CHANNEL  → enqueue() → toastSlice → ToastRenderer shows it
//      Used for: weather, idle, tip, festival, welcome, order status
//      These are EPHEMERAL — never written to the notification bell.
//
//   B) BELL CHANNEL   → dispatch(addNotification()) + enqueue()
//      Used for: socket notification:new, socket order:status_update
//      These ARE written to the bell — they have backend IDs and persist.
//
// KEY RULE: Only server-originated events write to the bell.
// Client-side computed toasts (weather/idle/tip) are ephemeral only.
//
// ORDER STATUS SOCKET FIX:
//   kitchen.socket.js emits 'order:preparing' (not 'order:status_update')
//   order.socket.js  emits 'order:confirmed', 'order:on_the_way', etc.
//   We listen to BOTH naming conventions so nothing is missed.

import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useDispatch, useSelector }                           from 'react-redux'
import { useLocation }                                        from 'react-router-dom'
import {
  fetchNotifications,
  addNotification,
  purgeExpired,
}                                                             from '@store/slices/notificationSlice'
import { showToast, PRIORITY }                               from '@store/slices/toastSlice'
import { selectRole, selectIsGuest, selectUser }             from '@store/slices/authSlice'
import { selectActiveOrder, selectOrderHistory }             from '@store/slices/orderSlice'
import { selectPoints, selectTier }                          from '@store/slices/loyaltySlice'
import socketService                                         from '@shared/services/socket.service'
import { playSound }                                         from '@shared/utils/soundPlayer'
import { getOrderRoute }                                     from '@shared/utils/orderNavigate'
import {
  fetchTodayFestivals,
  getTodayContext,
  getDateBasedToast,
} from '../components/notifications/nepalCalendar'

const genId    = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
const todayKey = () => new Date().toISOString().slice(0, 10)

// ── Storage helpers ────────────────────────────────────────────────────────────
const session = {
  has: (key)      => { try { return !!sessionStorage.getItem(`kc_${key}`) } catch { return false } },
  set: (key)      => { try { sessionStorage.setItem(`kc_${key}`, '1') }    catch {} },
}
const local = {
  has:  (key)      => { try { return !!localStorage.getItem(`kc_${key}`) }  catch { return false } },
  set:  (key)      => { try { localStorage.setItem(`kc_${key}`, '1') }      catch {} },
  get:  (key)      => { try { return localStorage.getItem(`kc_${key}`) }    catch { return null  } },
  setV: (key, val) => { try { localStorage.setItem(`kc_${key}`, val) }      catch {} },
}

// ── Dual-layer order dedup ─────────────────────────────────────────────────────
const orderFired = {
  has: (orderId, status) =>
    local.has(`order_${orderId}_${status}`) ||
    session.has(`order_session_${orderId}_${status}`),
  set: (orderId, status) => {
    local.set(`order_${orderId}_${status}`)
    session.set(`order_session_${orderId}_${status}`)
  },
}

// ── Page suppression ──────────────────────────────────────────────────────────
const SUPPRESS_ON_PATH = {
  payment:  ['/payment', '/payment-success'],
  order:    ['/order/status'],
  loyalty:  ['/loyalty'],
  menu:     ['/menu'],
}
const isSuppressed = (type, navigateTo, pathname) => {
  const paths = SUPPRESS_ON_PATH[type] ?? []
  if (paths.some(p => pathname.startsWith(p))) return true
  if (navigateTo && paths.some(p => navigateTo.startsWith(p) && pathname.startsWith(p))) return true
  return false
}

// ── Order history analysis ─────────────────────────────────────────────────────
export const analyseHistory = (history = []) => {
  if (!history.length) return { favouriteItem: null, favouriteCategory: null, visitCount: 0, lastOrderItems: [] }
  const itemFreq = {}
  const catFreq  = {}
  history.forEach(order => {
    ;(order.items ?? []).forEach(item => {
      const name = item.name ?? item.menuItemId
      const cat  = item.category ?? 'unknown'
      itemFreq[name] = (itemFreq[name] ?? 0) + item.quantity
      catFreq[cat]   = (catFreq[cat]   ?? 0) + item.quantity
    })
  })
  return {
    favouriteItem:     Object.entries(itemFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    favouriteCategory: Object.entries(catFreq).sort((a, b)  => b[1] - a[1])[0]?.[0] ?? null,
    visitCount:        history.length,
    lastOrderItems:    history[0]?.items?.map(i => i.name) ?? [],
  }
}

// ── Points calc ───────────────────────────────────────────────────────────────
const TIER_MULTIPLIER = { bronze: 1, silver: 1.5, gold: 2, none: 1 }
const calcPoints = (total, tier) =>
  Math.floor(((total ?? 0) / 10) * (TIER_MULTIPLIER[tier] ?? 1))

const tierSuffix = (tier) => ({ gold: ' 👑', silver: ' 🥈', bronze: '', none: '' }[tier] ?? '')

// ── Weather key ───────────────────────────────────────────────────────────────
const getWeatherKey = (w) => {
  if (!w) return null
  const desc = (w.description ?? w.condition ?? '').toLowerCase()
  const temp = w.temperature ?? w.temp ?? w.temp_c ?? 20
  if (desc.includes('thunder') || desc.includes('storm')) return 'storm'
  if (desc.includes('snow'))                               return 'snow'
  if (desc.includes('rain') && !desc.includes('light'))   return 'rain'
  if (desc.includes('drizzle') || desc.includes('light rain')) return 'drizzle'
  if (desc.includes('fog') || desc.includes('mist'))      return 'foggy'
  if (desc.includes('wind'))                               return 'windy'
  if (desc.includes('cloud') || desc.includes('overcast')) return 'cloudy'
  if (temp < 8)  return 'veryCold'
  if (temp < 14) return 'cold'
  if (temp > 35) return 'veryHot'
  if (temp > 30) return 'hot'
  return 'clear'
}

// ── Time slot ─────────────────────────────────────────────────────────────────
const getTimeSlot = () => {
  const h = new Date().getHours()
  if (h >= 5  && h < 8)  return 'earlybird'
  if (h >= 8  && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 21) return 'evening'
  return 'latenight'
}

// ── Variant picker ────────────────────────────────────────────────────────────
const pickVariant = (pool, storeKey) => {
  if (!pool?.length) return null
  const last   = local.get(`last_${storeKey}`)
  let eligible = pool.filter((_, i) => String(i) !== last)
  if (!eligible.length) eligible = pool
  const idx  = Math.floor(Math.random() * eligible.length)
  const item = eligible[idx]
  local.setV(`last_${storeKey}`, String(pool.indexOf(item)))
  return item
}

// ── Build itemised delivery string ────────────────────────────────────────────
const buildItemList = (items = []) => {
  if (!items.length) return null
  const names = items.map(i => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${i.name ?? i.menuItemId ?? 'Item'}`)
  const shown = names.slice(0, 3)
  const rest  = names.length - shown.length
  return rest > 0 ? `${shown.join(', ')} +${rest} more` : shown.join(', ')
}

// ══════════════════════════════════════════════════════════════════════════════
// WEATHER TOAST BANK
// ══════════════════════════════════════════════════════════════════════════════
const WEATHER_BANK = {
  rain: {
    earlybird: [
      { emoji: '☔', title: "Brave soul. It's raining before 8am.", message: "Masala Chiya (Rs 80) is what heroes drink at this hour. Verified." },
      { emoji: '🌧️', title: "Pre-dawn rain walker 🌧️", message: "The city is yours. And so is Masala Chiya (Rs 80). Sit. Breathe." },
    ],
    morning: [
      { emoji: '☔', title: "You came out in THIS rain? 🫡", message: "Masala Chiya (Rs 80) is the least we can do for your courage." },
      { emoji: '🌧️', title: "Rain on a weekday morning ☔", message: "You showed up anyway. Black Coffee (Rs 120) respects the commitment." },
    ],
    afternoon: [
      { emoji: '🌧️', title: "Monsoon mode: fully activated 🌧️", message: "Thukpa (Rs 200) + rain outside = the most Nepali afternoon documented." },
      { emoji: '☔', title: "Afternoon downpour. Good call staying in ☔", message: "Chicken Noodle Soup (Rs 200) and zero regrets." },
    ],
    evening: [
      { emoji: '☔', title: "The sky said no to your plans 🌧️", message: "Chicken Noodle Soup (Rs 200) exists specifically for evenings like this." },
      { emoji: '🌧️', title: "Evening rain in Kathmandu 🌆", message: "Dal Bhat (Rs 220) + rain on the window = the most grounded dinner." },
    ],
    latenight: [
      { emoji: '🌧️', title: "Raining at midnight. Mood. ☔", message: "Masala Chiya (Rs 80) + rain on the roof = most cinematic thing you'll do tonight." },
    ],
  },
  drizzle: {
    morning: [
      { emoji: '🌦️', title: "That in-between rain situation 🌦️", message: "Not enough to cancel. Enough to justify Masala Chiya (Rs 80)." },
    ],
    afternoon: [
      { emoji: '🌦️', title: "Afternoon drizzle vibes 🌦️", message: "Veg Sandwich (Rs 160) + Masala Chiya (Rs 80) = the underrated lunch combo." },
    ],
    evening: [
      { emoji: '🌦️', title: "Drizzly evening 🌦️", message: "Chicken Fried Rice (Rs 240) and nowhere to be. This is it." },
    ],
  },
  cold: {
    morning: [
      { emoji: '🥶', title: "Brr. Just… brr 🥶", message: "Fingers cold? Masala Chiya (Rs 80) is not. Fix this immediately." },
    ],
    afternoon: [{ emoji: '🥶', title: "Aggressively cold afternoon 🧊", message: "Tomato Soup (Rs 150) + Cheese Garlic Bread (Rs 180) = body's request." }],
    evening: [
      { emoji: '🥶', title: "Cold enough to question life choices 🥶", message: "Like why you haven't ordered Thukpa (Rs 200) yet. We can fix that." },
    ],
  },
  hot: {
    afternoon: [
      { emoji: '🥵', title: "Sun is fully attacking 🥵", message: "Cold Coffee (Rs 160) or Mango Lassi (Rs 140). Choose before you evaporate." },
    ],
    evening: [{ emoji: '🥵', title: "Still hot at this hour. Audacious 🥵", message: "Watermelon Mint Cooler (Rs 150) was made for evenings like this." }],
  },
  cloudy: {
    morning: [
      { emoji: '☁️', title: "100% chance of cozy ☁️", message: "Cloudy days and Black Coffee (Rs 120) were designed together. By someone wise." },
    ],
    evening: [
      { emoji: '☁️', title: "Cloudy evening in Kathmandu ☁️", message: "Veg Chowmein (Rs 180) + overcast sky = most underrated dinner vibe." },
    ],
  },
  clear: {
    morning: [
      { emoji: '☀️', title: "Rise and shine ☀️", message: "Body ran on sleep. Now let it run on Black Coffee (Rs 120). The upgrade continues." },
      { emoji: '☀️', title: "Clear morning in the valley ☀️", message: "Masala Chiya (Rs 80) + this weather + good food = the morning doing its job." },
    ],
    afternoon: [
      { emoji: '☀️', title: "Sun's out, brain's out 🌞", message: "Cold Coffee (Rs 160) does the thinking for you. Outsource it." },
    ],
    evening: [
      { emoji: '🌇', title: "Golden hour in Kathmandu 🌇", message: "Evenings this pretty are illegal without Mango Lassi (Rs 140). That's a rule." },
    ],
    latenight: [
      { emoji: '🌙', title: "Clear night in Kathmandu 🌙", message: "Black Coffee (Rs 120) at midnight is a personality trait. A good one. Own it." },
    ],
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// WELCOME TOAST BANK
// ══════════════════════════════════════════════════════════════════════════════
const getWelcomeToast = ({ visitCount, favouriteItem, tier, userName, timeSlot }) => {
  const name   = userName ? `, ${userName.split(' ')[0]}` : ''
  const suffix = tierSuffix(tier)
  const greet  = { earlybird: 'Early bird', morning: 'Good morning', afternoon: 'Welcome back', evening: 'Good evening', latenight: 'Night owl' }[timeSlot] ?? 'Welcome back'

  if (visitCount === 0) {
    const opts = [
      { emoji: '👋', title: `Welcome${name}! First time here 👋`, message: 'Masala Chiya (Rs 80) + Veg Momo (Rs 160) — start here. Everyone does.' },
      { emoji: '✨', title: `Hey${name}, welcome to Kausichiya ✨`, message: 'The Chicken Momo (Rs 180) and Masala Chiya (Rs 80) combo is what regulars order first.' },
    ]
    return opts[Math.floor(Math.random() * opts.length)]
  }
  if (visitCount === 1) {
    return { emoji: '🎉', title: `You came back${name}! 🎉`, message: "Second visit. You're basically a regular. Chicken Momo (Rs 180) is even better the second time." }
  }
  if (visitCount >= 5 && favouriteItem) {
    const opts = [
      { emoji: '☕', title: `${greet}${name} ☕`, message: `Your usual spot. ${favouriteItem} is already on its way... just kidding. But you should order it.${suffix}` },
      { emoji: '😏', title: `Look who's back${name} 😏`, message: `${visitCount} visits. We know your order before you sit down. Well, almost. ${favouriteItem}?${suffix}` },
    ]
    return opts[Math.floor(Math.random() * opts.length)]
  }
  if (tier === 'gold') {
    return { emoji: '👑', title: `${greet}${name}, Gold legend 👑`, message: `${visitCount} visits. Gold tier. The staff know your order before you sit down.${suffix}` }
  }
  if (visitCount >= 3) {
    return { emoji: '🙌', title: `${greet}${name} 🙌`, message: `${visitCount} visits and counting. You know your way around the menu by now.${suffix}` }
  }
  return null
}

// ══════════════════════════════════════════════════════════════════════════════
// ORDER STATUS TOAST BANK
// ══════════════════════════════════════════════════════════════════════════════
const ORDER_BANKS = {
  confirmed: [
    (d) => ({ title: '✅ Order confirmed!',  message: `${d.items || 'Your order'} is locked in. Kitchen incoming.${d.suffix}` }),
    (d) => ({ title: '✅ Got your order!',   message: `${d.items ? d.items + ' — ' : ''}chef is about to get to work.${d.suffix}` }),
    (d) => ({ title: '✅ Confirmed!',        message: d.repeat ? `${d.fav} again — you know what you want.${d.suffix}` : `Order received. The kitchen has your back.${d.suffix}` }),
  ],
  preparing: [
    (d) => ({ title: '👨‍🍳 Chef is on it!',      message: d.repeat ? `The chef saw "${d.fav}" and nodded. They know.` : 'Your order is being prepared. Smell that?' }),
    (d) => ({ title: '🔥 Kitchen is cooking!',  message: `${d.items ? d.items + ' — ' : ''}the sizzle is real. Shouldn't be long.` }),
    (_) => ({ title: '🍳 Cooking in progress',  message: 'The kitchen is doing its thing. You did the right thing ordering.' }),
  ],
  on_the_way: [
    (d) => ({ title: '🏃 Food is on its way!',   message: d.itemList ? `${d.itemList} — your waiter is walking over.` : 'Your food is on the way to your table.' }),
    (d) => ({ title: '🛎️ Waiter is coming!',     message: d.itemList ? `${d.itemList} — incoming. Stay seated.` : 'Your waiter has your order and is heading to you.' }),
    (_) => ({ title: '🚶 On the way to you!',    message: 'Waiter picked up your order. ETA: very soon.' }),
  ],
  delivered: [
    (d) => ({ title: '🍽️ Your food has arrived!', message: d.itemList ? `${d.itemList} — all at your table. Dig in!` : 'Everything is at your table. Enjoy every bite.' }),
    (d) => ({ title: '✅ Served — enjoy!',         message: d.itemList ? `${d.itemList} — hot and here. Bill whenever you're ready.` : "Hot food on the table. Bill whenever you're ready." }),
    (d) => ({ title: '🎉 All items delivered!',   message: d.itemList ? `${d.itemList} — all arrived. Pay when it suits you.` : 'Your full order is on the table. No rush on the bill.' }),
  ],
  paid: [
    (d) => ({ title: '✅ Payment confirmed!',       message: d.points > 0 ? `You earned ${d.points} loyalty points.${d.suffix} See you next time!` : 'All settled. Thanks for visiting Kausichiya!' }),
    (d) => ({ title: '💳 Bill settled. Thank you!', message: d.points > 0 ? `+${d.points} points added to your account.${d.suffix} Come back soon.` : 'Your bill is fully paid. Hope you loved the food!' }),
  ],
  cancelled: [
    (_) => ({ title: '❌ Order cancelled',  message: "Your order was cancelled. The menu is still open — whenever you're ready." }),
    (_) => ({ title: '❌ Cancelled',        message: "Something went wrong. We can start fresh whenever you want." }),
  ],
}

const getOrderToast = (status, order, ctx) => {
  const bank = ORDER_BANKS[status]
  if (!bank) return null

  const items    = (order?.items ?? []).map(i => i.name).slice(0, 2).join(', ')
  const itemList = buildItemList(order?.items ?? [])
  const repeat   = ctx.favouriteItem && order?.items?.some(i => i.name === ctx.favouriteItem)
  const points   = calcPoints(order?.total ?? 0, ctx.tier)
  const d = {
    items, itemList, repeat,
    fav:    ctx.favouriteItem,
    visits: ctx.visitCount,
    suffix: tierSuffix(ctx.tier),
    points,
    name:   ctx.userName ? `, ${ctx.userName.split(' ')[0]}` : '',
  }

  const idx  = parseInt(order?._id?.slice(-2) ?? '0', 16) % bank.length
  const base = (bank[idx] ?? bank[0])(d)

  const cfg = {
    confirmed:  { type: 'order',   sound: 'orderConfirmed',  duration: 7000,  emoji: '✅', priority: PRIORITY.high,     nav: getOrderRoute(status) },
    preparing:  { type: 'kitchen', sound: 'orderPreparing',  duration: 8000,  emoji: '👨‍🍳', priority: PRIORITY.high,     nav: getOrderRoute(status) },
    on_the_way: { type: 'order',   sound: 'orderReady',      duration: 10000, emoji: '🏃', priority: PRIORITY.critical, nav: getOrderRoute(status) },
    delivered:  { type: 'payment', sound: 'orderDelivered',  duration: 14000, emoji: '🍽️', priority: PRIORITY.critical, nav: '/payment',
      actions: [
        { key: 'pay_online', label: '💳 Pay Online', primary: true  },
        { key: 'pay_cash',   label: '💵 Pay Cash',   primary: false },
      ],
    },
    paid:       { type: 'payment', sound: 'pointsEarned',    duration: 10000, emoji: '✅', priority: PRIORITY.high,     nav: '/payment-success',
      actions: [{ key: 'view_history', label: '📋 View History', primary: true }],
    },
    cancelled:  { type: 'system',  sound: null,              duration: 6000,  emoji: '❌', priority: PRIORITY.medium,   nav: getOrderRoute(status) },
  }[status]

  if (!cfg) return null

  return {
    type:     cfg.type,
    soundKey: cfg.sound,
    duration: cfg.duration,
    emoji:    cfg.emoji,
    priority: cfg.priority,
    navigate: cfg.nav,
    actions:  cfg.actions ?? null,
    ...base,
  }
}

// ── Tip nudge ─────────────────────────────────────────────────────────────────
const TIP_BANK = [
  (d) => ({ title: "Your waiter has feelings 🥺",    message: `Tips make waiters 73% happier. ${d.tier === 'gold' ? 'Gold members tip first. Tradition.' : 'Allegedly.'}` }),
  (_) => ({ title: "The chef did a little dance 💃",  message: "When they saw your order come in. A tip would complete the choreography." }),
  (_) => ({ title: "Hot take 🔥",                    message: "Adding a tip is free karma. Peer reviewed. Published. We said what we said." }),
  (d) => ({ title: "PSA: Waiters have memory 🧠",    message: `They remember who tips. You've been here ${d.visits} times. They definitely remember you.` }),
]
const getTipNudge = (ctx, orderId) => {
  const idx = parseInt(orderId?.slice(-2) ?? '0', 16) % TIP_BANK.length
  return TIP_BANK[idx](ctx)
}

// ── Idle nudge ────────────────────────────────────────────────────────────────
const getIdleNudge = ({ visitCount, favouriteItem, favouriteCategory, isGuest }) => {
  if (isGuest) return { title: "Still deciding? 🤔", message: "Masala Chiya (Rs 80) has been staring at you. It's getting nervous." }
  if (visitCount === 0) return { title: "First time here? 👋", message: "Masala Chiya (Rs 80) + Veg Momo (Rs 160) is the move. Every regular started here." }
  if (visitCount >= 10) return { title: `${visitCount} visits and still indecisive? 😂`, message: `You literally have a favourite. ${favouriteItem ?? 'Something here'}. Just order it.` }
  if (favouriteItem) return { title: "Your usual is calling 📞", message: `${favouriteItem} is right there. It misses you. Don't make it awkward.` }
  return { title: "Still deciding? 🤔", message: "Our chai is getting worried. 6 minutes of staring. Masala Chiya (Rs 80). Two taps." }
}

// ── Loyalty milestones ────────────────────────────────────────────────────────
const MILESTONES = [50, 100, 200, 500, 1000]
const MILESTONE_BANKS = {
  50:   [{ title: 'First 50 points! 🎉',     message: "You're officially a regular. We already knew, but now it's official." }],
  100:  [{ title: '100 points! ⭐',          message: "Silver tier is 400 points away. You eat here enough. We believe in you." }],
  200:  [{ title: '200 points! 🔥',          message: "Gold tier incoming. You eat here more than some of the staff." }],
  500:  [{ title: '500 points! 👑',          message: "Silver achieved. The cafe whispers your name when you walk in. True story." }],
  1000: [{ title: '1000 points!! 🏆',        message: "Gold legend. The Chocolate Brownie (Rs 250) is basically named after you." }],
}
const getMilestoneToast = (ms) => {
  const bank = MILESTONE_BANKS[ms] ?? [{ title: `${ms} points!`, message: 'Keep ordering, keep earning.' }]
  return bank[Math.floor(Math.random() * bank.length)]
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════════════════════
export const useNotifications = (weather = null) => {
  const dispatch     = useDispatch()
  const { pathname } = useLocation()

  const role         = useSelector(selectRole)
  const isGuest      = useSelector(selectIsGuest)
  const user         = useSelector(selectUser)
  const activeOrder  = useSelector(selectActiveOrder)
  const orderHistory = useSelector(selectOrderHistory)
  const points       = useSelector(selectPoints)
  const tier         = useSelector(selectTier)

  const { favouriteItem, favouriteCategory, visitCount } = useMemo(
    () => analyseHistory(orderHistory), [orderHistory]
  )

  const userName   = user?.name ?? user?.username ?? null
  const weatherKey = useMemo(() => getWeatherKey(weather), [weather])
  const timeSlot   = useMemo(() => getTimeSlot(), [])

  const [apiFestivals, setApiFestivals] = useState([])

  // ── Priority queue ─────────────────────────────────────────────────────────
  const queueRef      = useRef([])
  const processingRef = useRef(false)
  const idleTimerRef  = useRef(null)

  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) return
    processingRef.current = true
    const next = queueRef.current.shift()
    dispatch(showToast(next))
    setTimeout(() => {
      processingRef.current = false
      processQueue()
    }, 1200)
  }, [dispatch])

  const enqueue = useCallback((payload) => {
    if (isSuppressed(payload.type, payload.navigate, pathname)) return
    const priority = payload.priority ?? PRIORITY.low
    const item = { id: genId(), ...payload }

    // Critical/high: dispatch immediately, bypass queue
    if (priority <= PRIORITY.high) {
      dispatch(showToast(item))
      return
    }

    // Medium/low: queue with priority ordering
    const idx = queueRef.current.findIndex(t => t.priority > priority)
    if (idx === -1) queueRef.current.push(item)
    else queueRef.current.splice(idx, 0, item)
    processQueue()
  }, [pathname, processQueue, dispatch])

  // ── 1. Bell fetch + purge stale on load ───────────────────────────────────
  useEffect(() => {
    dispatch(purgeExpired())
    dispatch(fetchNotifications())
  }, [dispatch])

  // ── 2. Festival fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (role !== 'customer') return
    fetchTodayFestivals()
      .then(data => setApiFestivals(data ?? []))
      .catch(err => {
        console.error('[useNotifications] Festival API failed:', err?.message ?? err)
        setApiFestivals([])
      })
  }, [role])

  // ── 3. Socket: notification:new → WRITE TO BELL + show toast ─────────────
  // This is the ONLY place addNotification() is called — for server-originated events
  useEffect(() => {
    const unsub = socketService.on('notification:new', (payload) => {
      // Write to bell (has backend ID, persists)
      dispatch(addNotification(payload))
      // Show toast immediately — critical level bypasses queue
      dispatch(showToast({
        id:       genId(),
        type:     payload.type    ?? 'system',
        title:    payload.title,
        message:  payload.message,
        meta:     { emoji: payload.emoji ?? '🔔' },
        priority: PRIORITY.high,
        navigate: '/notifications',
        duration: 7000,
      }))
    })
    return () => unsub()
  }, [dispatch])

  // ── 4. Socket: order status updates from kitchen/waiter ───────────────────
  // kitchen.socket.js emits 'order:preparing' (not standard status_update)
  // order.socket.js emits 'order:confirmed', 'order:on_the_way', etc.
  // We handle BOTH so status never gets missed regardless of which handler fires
  useEffect(() => {
    const STATUS_FROM_EVENT = {
      'order:confirmed':    'confirmed',
      'order:preparing':    'preparing',
      'order:on_the_way':   'on_the_way',
      'order:delivered':    'delivered',
      'order:paid':         'paid',
      'order:cancelled':    'cancelled',
      'order:status_update': null,  // status is in payload.status
    }

    const handlers = Object.entries(STATUS_FROM_EVENT).map(([event, fixedStatus]) => {
      const handler = (payload) => {
        if (role !== 'customer') return
        const orderId = payload.orderId ?? payload.order?._id
        const status  = fixedStatus ?? payload.status
        if (!orderId || !status || status === 'pending') return

        // Check BOTH dedup layers — if seed already marked this, skip
        // (handles socket reconnect firing stale events after refresh)
        if (orderFired.has(orderId, status)) return
        orderFired.set(orderId, status)

        // Build toast with available data
        const orderData = payload.order ?? { _id: orderId, items: [], total: 0 }
        const t = getOrderToast(status, orderData, { favouriteItem, visitCount, tier, userName })
        if (!t) return

        // Dispatch immediately — socket events are always high/critical
        dispatch(showToast({ id: genId(), ...t, meta: { emoji: t.emoji, orderId } }))
        if (t.soundKey) playSound(t.soundKey, role)

        // Tip nudge for delivered
        if (status === 'delivered') {
          const tipKey = `tip_${orderId}`
          if (!local.has(tipKey)) {
            local.set(tipKey)
            setTimeout(() => {
              const nudge = getTipNudge({ tier, visits: visitCount }, orderId)
              enqueue({
                type: 'tip', duration: 9000, priority: PRIORITY.low,
                title: nudge.title, message: nudge.message,
                meta: { emoji: '😏', orderId },
                actions: [
                  { key: 'tip',     label: '💝 Add a tip', primary: true  },
                  { key: 'dismiss', label: 'No thanks',    primary: false },
                ],
                navigate: '/payment?tip=true',
              })
            }, 4200)
          }
        }
      }

      socketService.on(event, handler)
      return () => socketService.off?.(event, handler)
    })

    return () => handlers.forEach(unsub => unsub?.())
  }, [dispatch, role, favouriteItem, visitCount, tier, userName, enqueue])

  // ── 5. Welcome back (ephemeral — never in bell) ───────────────────────────
  useEffect(() => {
    if (isGuest || role !== 'customer') return
    if (session.has('welcome')) return
    session.set('welcome')
    const t = getWelcomeToast({ visitCount, favouriteItem, tier, userName, timeSlot })
    if (!t) return
    setTimeout(() => {
      enqueue({ type: 'system', duration: 6000, priority: PRIORITY.low, meta: { emoji: t.emoji }, ...t })
    }, 1800)
  }, [orderHistory, isGuest, role])

  // ── 6. Date/festival toast (ephemeral) ────────────────────────────────────
  useEffect(() => {
    if (role !== 'customer') return
    const dayKey = `date_toast_${todayKey()}`
    if (local.has(dayKey)) return
    local.set(dayKey)
    const ctx       = getTodayContext(user, apiFestivals)
    const dateToast = getDateBasedToast(ctx, user, visitCount)
    if (!dateToast) return
    setTimeout(() => {
      enqueue({
        ...dateToast,
        priority: PRIORITY.medium,
        meta:     { emoji: dateToast.emoji ?? '🎊', imageUrl: dateToast.imageUrl ?? null },
        navigate: '/notifications',
      })
    }, 4000)
  }, [role, user, apiFestivals])

  // ── 7. Weather (ephemeral, fix-1: weatherKey dep only) ────────────────────
  useEffect(() => {
    if (!weatherKey || role !== 'customer') return
    const sessKey = `weather_${weatherKey}_${timeSlot}`
    if (session.has(sessKey)) return
    session.set(sessKey)
    const pool = WEATHER_BANK[weatherKey]?.[timeSlot] ?? WEATHER_BANK[weatherKey]?.morning ?? []
    const cfg  = pickVariant(pool, `weather_${weatherKey}_${timeSlot}`)
    if (!cfg) return
    setTimeout(() => {
      enqueue({
        type: 'weather', duration: 8000, priority: PRIORITY.medium,
        title: cfg.title, message: cfg.message,
        meta: { emoji: cfg.emoji },
        navigate: '/notifications',
      })
    }, 3200)
  }, [weatherKey, role, timeSlot])

  // ── 8. Redux activeOrder → ONLY used to pre-seed the dedup keys on mount ──
  //
  // PHILOSOPHY: Order toasts must ONLY fire from real-time events (socket).
  // On page refresh, the order already exists — nothing new happened,
  // so no toast should appear. Ever.
  //
  // This effect runs once on mount (when activeOrder first loads from the
  // backend) and immediately marks every current orderId+status as "already
  // shown" in ALL dedup layers — so even if the socket fires the same status
  // again after a reconnect, it won't show a stale toast.
  //
  // NEW status changes still show because the socket fires BEFORE
  // fetchActiveOrder updates Redux, so the new status isn't seeded yet.
  const shownThisMountRef = useRef(new Set())
  const seedDoneRef       = useRef(false)

  useEffect(() => {
    if (!activeOrder || role !== 'customer') return
    if (seedDoneRef.current) return  // only seed once per mount

    const orderId = activeOrder._id
    const status  = activeOrder.status

    if (!orderId || typeof orderId !== 'string' || orderId.length < 10) return
    if (!status) return

    // Mark ALL statuses up to and including current as already-shown
    // so refresh never replays any of them
    const ALL_STATUSES = ['confirmed', 'preparing', 'on_the_way', 'delivered', 'paid', 'cancelled']
    const currentIdx   = ALL_STATUSES.indexOf(status)
    const toSeed       = currentIdx >= 0 ? ALL_STATUSES.slice(0, currentIdx + 1) : [status]

    toSeed.forEach(s => {
      const key = `${orderId}::${s}`
      shownThisMountRef.current.add(key)
      orderFired.set(orderId, s)  // writes both localStorage + sessionStorage
    })

    seedDoneRef.current = true
  }, [activeOrder?._id, activeOrder?.status, role])

  // Socket-only order status handler — fires AFTER seed, so new statuses pass through
  // (Effect #4 in the socket block already handles this — this effect is intentionally
  // left empty as a marker. The socket effect at the top handles all real-time updates.)

  // ── 9. Loyalty milestones (ephemeral) ─────────────────────────────────────
  useEffect(() => {
    if (!points || role !== 'customer' || isGuest) return
    MILESTONES.forEach(ms => {
      if (points >= ms && points < ms + 60) {
        const key = `milestone_${ms}`
        if (local.has(key)) return
        local.set(key)
        const msg = getMilestoneToast(ms)
        enqueue({
          type: 'loyalty', duration: 8000, priority: PRIORITY.medium,
          title: msg.title, message: msg.message,
          meta: { emoji: ms >= 500 ? '👑' : '⭐' },
          navigate: '/loyalty',
        })
        playSound(ms >= 500 ? 'tierUpgraded' : 'pointsEarned', role)
      }
    })
  }, [points, role, isGuest])

  // ── 10. Idle nudge (fix-3: clearTimeout before re-setting) ────────────────
  useEffect(() => {
    if (role !== 'customer' || activeOrder) return
    if (session.has('idle')) return
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      if (activeOrder) return
      session.set('idle')
      const nudge = getIdleNudge({ visitCount, favouriteItem, favouriteCategory, isGuest })
      enqueue({ type: 'idle', duration: 7000, priority: PRIORITY.low, meta: { emoji: '🤔' }, ...nudge, navigate: '/menu' })
    }, 6 * 60 * 1000)
    return () => clearTimeout(idleTimerRef.current)
  }, [role, activeOrder])

  // ── 11. Waiter on_the_way socket ──────────────────────────────────────────
  useEffect(() => {
    const unsub = socketService.on('waiter:on_the_way', () => {
      const orderId = activeOrder?._id
      if (orderId) {
        const key = `waiter_coming_${orderId}`
        if (session.has(key)) return
        session.set(key)
      }
      playSound('waiterComing', role)
      const itemList = buildItemList(activeOrder?.items ?? [])
      const opts = [
        { title: '🏃 Food is on the way!',   message: itemList ? `${itemList} — your waiter is walking over.` : 'Your waiter has your order. Almost there.' },
        { title: '🛎️ Waiter en route!',      message: itemList ? `${itemList} — incoming. Stay seated.` : 'Someone is heading to your table right now.' },
      ]
      const pick = opts[Math.floor(Math.random() * opts.length)]
      // Immediate dispatch — critical
      dispatch(showToast({
        id: genId(), type: 'order', duration: 8000,
        priority: PRIORITY.critical,
        meta: { emoji: '🏃' }, ...pick,
        navigate: getOrderRoute(activeOrder?.status),
      }))
    })
    return () => unsub()
  }, [dispatch, role, visitCount, activeOrder])
}