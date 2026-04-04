// src/modules/customer/hooks/useNotifications.js
//
// FIX: removed dispatch(setUnreadCount(unread ?? 0)) from initial fetch effect.
// setNotifications() already computes unreadCount from the filtered list correctly.
// setUnreadCount was overwriting it with the raw server count (which includes
// message-type notifications we filter out) — causing badge=2 but list empty.

import { useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector }       from 'react-redux'
import socketService                       from '@shared/services/socket.service'
import notificationService                 from '@shared/services/notification.service'
import { showToast }                       from '@store/slices/toastSlice'
import { setNotifications, addNotification } from '@store/slices/notificationSlice'
import { selectIsLoggedIn, selectUser, selectIsGuest } from '@store/slices/authSlice'
import { selectCartItems }                 from '@store/slices/cartSlice'
import { selectTableNumber, selectSession } from '@store/slices/tableSessionSlice'
import { fetchTodayFestivals, getTodayContext } from '../components/notifications/nepalCalendar'

// ── Helpers ───────────────────────────────────────────────────────────────────
function getUserAge(user) {
  if (!user?.dob) return null
  const birth = new Date(user.dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
function getTone(user) {
  const age = getUserAge(user)
  if (!age) return 'young'
  if (age < 18) return 'teen'
  if (age < 30) return 'young'
  if (age < 50) return 'adult'
  return 'senior'
}
const NAME = (user) => user?.name?.split(' ')[0] ?? 'friend'

function fmtHour(dt) {
  const d = new Date(dt * 1000)
  return d.toLocaleTimeString([], { hour: 'numeric', hour12: true })
}

const COND_LABEL = {
  sunny:  'sunny ☀️', hot: 'very hot 🥵', rainy: 'rainy 🌧️',
  cloudy: 'cloudy ☁️', cold: 'cold 🧊', snowy: 'snowy ❄️', windy: 'windy 💨',
}

const uviLabel = (uvi) => {
  if (uvi <= 2)  return 'Low'
  if (uvi <= 5)  return 'Moderate'
  if (uvi <= 7)  return 'High'
  if (uvi <= 10) return 'Very High'
  return 'Extreme'
}

// ── Forecast builders ─────────────────────────────────────────────────────────
function getImminentRainToast(weather, tone) {
  const minutely = weather?.minutely
  if (!minutely?.length) return null
  if (weather.condition === 'rainy') return null
  const firstRainIdx = minutely.findIndex(m => (m.precipitation ?? 0) > 0)
  if (firstRainIdx === -1 || firstRainIdx > 30) return null
  const minsAway = firstRainIdx === 0 ? 1 : firstRainIdx
  const msgs = {
    teen:   { title: `🌧️ Rain in ~${minsAway} min`, message: "Heads up — it's about to rain. Grab a hot drink and stay in." },
    young:  { title: `🌧️ Rain arriving in ~${minsAway} min`, message: "You'll want something warm. Masala Chiya (Rs 80) has you covered." },
    adult:  { title: `🌧️ Rain expected in ~${minsAway} min`, message: 'A warm drink would be perfect right now. Check our hot menu.' },
    senior: { title: `🌧️ Rain on the way (~${minsAway} min)`, message: 'Stay comfortable — a hot drink is a good idea right now.' },
  }
  return { ...(msgs[tone] ?? msgs.young), type: 'weather_forecast', navigate: '/menu?category=hot', duration: 9000, actions: [{ key: 'view', label: '☕ Hot Menu', primary: true }] }
}

function getGovAlertToasts(weather) {
  const alerts = weather?.alerts
  if (!alerts?.length) return []
  const toFire = []
  for (const alert of alerts) {
    const key = `kc_gowalert_${alert.event}_${alert.start}`
    if (sessionStorage.getItem(key)) continue
    sessionStorage.setItem(key, '1')
    const endTime = alert.end ? new Date(alert.end * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
    toFire.push({ title: `⚠️ ${alert.event}`, message: alert.description ? alert.description.slice(0, 120) + (alert.description.length > 120 ? '…' : '') : `Weather alert from ${alert.senderName ?? 'authorities'}${endTime ? ` until ${endTime}` : ''}.`, type: 'weather_alert', navigate: '/notifications', duration: 0, actions: [{ key: 'view', label: 'See Details', primary: true }], priority: 1 })
  }
  return toFire
}

function getHourlyChangeToast(weather, tone) {
  const hourly = weather?.hourly
  if (!hourly?.length) return null
  const current = weather.condition
  const MEANINGFUL = ['rainy', 'snowy', 'cold', 'hot']
  const changeHour = hourly.slice(1, 7).find(h => h.condition !== current && MEANINGFUL.includes(h.condition))
  if (!changeHour) return null
  const label = COND_LABEL[changeHour.condition] ?? changeHour.condition
  const time  = fmtHour(changeHour.dt)
  const temp  = changeHour.temp != null ? ` (${Math.round(changeHour.temp)}°C)` : ''
  const msgs = {
    teen:   { title: `📍 Weather shifting at ${time}`, message: `Gets ${label}${temp} later. Just so you know.` },
    young:  { title: `🕐 Heads up — ${label} at ${time}`, message: `Weather changes around ${time}${temp}. Plan accordingly.` },
    adult:  { title: `🌤 Forecast update`, message: `Conditions turn ${label} around ${time}${temp}. Worth planning for.` },
    senior: { title: `🌤 Weather changing at ${time}`, message: `It will become ${label}${temp} around ${time}.` },
  }
  const nav = ['rainy','cold','snowy'].includes(changeHour.condition) ? '/menu?category=hot' : changeHour.condition === 'hot' ? '/menu?category=cold' : '/menu'
  return { ...(msgs[tone] ?? msgs.young), type: 'weather_forecast', navigate: nav, duration: 8000, actions: [{ key: 'menu', label: 'See Menu', primary: false }] }
}

function getTomorrowPreviewToast(weather, tone) {
  const h = new Date().getHours()
  if (h < 6 || h >= 10) return null
  const daily = weather?.daily
  if (!daily || daily.length < 2) return null
  const tomorrow = daily[1]
  if (!tomorrow) return null
  const label   = COND_LABEL[tomorrow.condition] ?? tomorrow.condition
  const high    = tomorrow.tempMax != null ? Math.round(tomorrow.tempMax) : null
  const low     = tomorrow.tempMin != null ? Math.round(tomorrow.tempMin) : null
  const tempStr = (high != null && low != null) ? ` ${high}°/${low}°C` : ''
  const summary = tomorrow.summary ? tomorrow.summary.slice(0, 80) : `${label}${tempStr}`
  const msgs = {
    teen:   { title: `📅 Tomorrow: ${label}${tempStr}`, message: summary },
    young:  { title: `📅 Tomorrow's forecast`, message: `${label}${tempStr}. ${summary !== label + tempStr ? summary : 'Plan your day around it.'}` },
    adult:  { title: `📅 Tomorrow's weather`, message: `Expect ${label}${tempStr}. ${tomorrow.pop > 0.4 ? `${Math.round(tomorrow.pop * 100)}% chance of rain.` : ''}` },
    senior: { title: `📅 Tomorrow: ${label}`, message: `${tempStr ? `High ${high}°C, Low ${low}°C. ` : ''}${tomorrow.pop > 0.4 ? `Rain likely (${Math.round(tomorrow.pop * 100)}%).` : 'Looks manageable.'}` },
  }
  return { ...(msgs[tone] ?? msgs.young), type: 'weather_forecast', navigate: null, duration: 8000 }
}

function getUVIToast(weather, tone) {
  const uvi = weather?.uvi
  if (uvi == null || uvi <= 6) return null
  const level = uviLabel(uvi)
  const msgs = {
    teen:   { title: `☀️ UV is ${level} right now (${uvi})`, message: "Sun's hitting different today. Stay indoors or use SPF." },
    young:  { title: `☀️ ${level} UV index (${uvi})`, message: 'Good excuse to stay in and order. Your skin will thank you.' },
    adult:  { title: `☀️ UV index: ${level} (${uvi})`, message: 'UV levels are high. Limit sun exposure between 11am–3pm.' },
    senior: { title: `☀️ High UV today (${uvi} — ${level})`, message: 'Please stay out of direct sunlight. Stay cool indoors.' },
  }
  return { ...(msgs[tone] ?? msgs.young), type: 'weather_forecast', navigate: null, duration: 8000 }
}

// ── Toast builders (unchanged) ────────────────────────────────────────────────
const PROFILE_NUDGE_MSGS = {
  dob:            { teen: { title: '🎂 Age is just a number…', message: "…but we don't even know yours. Drop your DOB?" }, young: { title: '🎂 We promise no mid-life crisis jokes', message: 'But we do need your birthday. Pretty please?' }, adult: { title: '🎂 Birthday incoming?', message: 'Tell us your DOB so we can celebrate you properly.' }, senior: { title: '🎂 A special date to remember', message: 'Share your birthday with us. We keep great secrets.' } },
  gender:         { teen: { title: '👤 Who are you, really?', message: 'Gender helps us personalise your vibe. No pressure.' }, young: { title: '👤 Quick question…', message: 'Add your gender to your profile. Takes 3 seconds. Promise.' }, adult: { title: '👤 Help us know you better', message: 'Adding gender helps us tailor your experience.' }, senior: { title: '👤 One small detail', message: 'Your gender helps us personalise things just for you.' } },
  hobbies:        { teen: { title: '🎮 Human or NPC?', message: "Tell us your hobbies. We won't judge. (We will definitely judge.)" }, young: { title: '✨ Are you a mystery?', message: 'What do you love doing? Hobbies help us suggest the perfect vibe.' }, adult: { title: '☕ Coffee + your hobby = perfect combo', message: "Tell us what you're into. We'll match the menu." }, senior: { title: '📚 Tell us your interests', message: 'Your hobbies help us make every visit more personal.' } },
  occupation:     { teen: { title: '📚 Student? CEO in training?', message: "What are you up to these days? We won't tell your teacher." }, young: { title: '💼 Surviving or thriving?', message: 'Student on chai budget or CEO on coffee budget? Tell us.' }, adult: { title: '🏢 What do you do?', message: 'Your occupation helps us suggest the right fuel for your day.' }, senior: { title: '📋 Your work story', message: 'Tell us a bit about your occupation — helps us serve you better.' } },
  foodPreference: { teen: { title: '🥩 Veg or nonveg? The eternal question', message: 'Are you the person who asks "is there meat in this?" Tell us.' }, young: { title: "🥗 What's your food vibe?", message: "Veg, non-veg, vegan? We'll stop guessing." }, adult: { title: '🍽️ Food preference?', message: 'So we can suggest the right dishes every time.' }, senior: { title: '🍽️ Dietary preference', message: 'Let us know what works for you so we can suggest the best options.' } },
  favouriteDrink: { teen: { title: "☕ What's your poison?", message: "Black coffee? Chai? Tell us your go-to drink. We'll have it ready." }, young: { title: '🧋 Your drink. Your identity.', message: 'Cold coffee people are different from chai people. Which are you?' }, adult: { title: '☕ Favourite drink?', message: "We'll know to suggest it before you even sit down." }, senior: { title: '☕ Your usual?', message: "Tell us your favourite and we'll always have a suggestion ready." } },
}

const LOW_COMPLETION_MSGS = [
  { title: '📝 Your profile called.', message: 'It said it feels empty. Even your Momo has more filling than this.' },
  { title: '🤔 40% done is cute…', message: '…but 100% done unlocks bonus loyalty points. Just saying.' },
  { title: '✨ Profile update unlocks XP', message: 'Fill in a few details. Get bonus points. Simple math.' },
  { title: '🧩 Something is missing', message: 'Your profile. A little more info = a lot more personalisation.' },
]

function getProfileNudgeToast(user) {
  const tone = getTone(user)
  const missing = []
  if (!user?.dob) missing.push('dob')
  if (!user?.gender) missing.push('gender')
  if (!user?.hobbies?.length) missing.push('hobbies')
  if (!user?.occupation) missing.push('occupation')
  if (!user?.foodPreference) missing.push('foodPreference')
  if (!user?.favouriteDrink) missing.push('favouriteDrink')
  if (!missing.length) return null
  const field = missing[0]
  const msgs  = PROFILE_NUDGE_MSGS[field]
  const msg   = msgs?.[tone] ?? msgs?.young
  if (!msg) {
    const fallback = LOW_COMPLETION_MSGS[Math.floor(Math.random() * LOW_COMPLETION_MSGS.length)]
    return { ...fallback, type: 'profile_nudge', profileField: field, navigate: '/profile', duration: 8000, actions: [{ key: 'complete', label: '✏️ Complete', primary: true }] }
  }
  return { ...msg, type: 'profile_nudge', profileField: field, navigate: '/profile', duration: 8000, actions: [{ key: 'complete', label: '✏️ Fix that', primary: true }] }
}

function getOrderToast(status, user, order) {
  const tone = getTone(user), name = NAME(user), currency = 'Rs'
  const total = order?.total ? ` (${currency} ${order.total})` : ''
  const msgs = {
    placed:     { teen: { title: '🛍️ Order in!', message: "Kitchen's got your back. Sit tight." }, young: { title: '🛍️ Locked in!', message: `Order received${total}. The kitchen nods in your direction.` }, adult: { title: '✅ Order placed', message: `Your order is confirmed${total}. We're on it.` }, senior: { title: '✅ Order confirmed', message: `Thank you${total}. Your order is with the kitchen.` } },
    preparing:  { teen: { title: "👨‍🍳 It's happening!", message: 'Chef is vibing. Your food is incoming.' }, young: { title: '🔥 Cooking in progress', message: 'Your food is being made with suspiciously good energy.' }, adult: { title: '👨‍🍳 Kitchen is on it', message: 'Your order is being prepared right now.' }, senior: { title: '👨‍🍳 Preparing your order', message: 'Our kitchen team is working on your order now.' } },
    on_the_way: { teen: { title: "🛵 IT'S COMING!!", message: 'Your order is physically moving towards your table. RIGHT NOW.' }, young: { title: '🛵 En route!', message: 'Your food is on its way. Brace yourself.' }, adult: { title: '🛵 On the way', message: 'Your order is heading to your table.' }, senior: { title: '🛵 On its way', message: 'Your order is being brought to you shortly.' } },
    delivered:  { teen: { title: '🍽️ HERE IT IS!!', message: 'Food has arrived. You may now eat.' }, young: { title: '🍽️ Order served!', message: 'Your food is here. It looks better than your profile picture.' }, adult: { title: '🍽️ Enjoy your meal', message: `Your order has arrived${name !== 'friend' ? `, ${name}` : ''}. Bon appétit!` }, senior: { title: '🍽️ Your order is here', message: 'Please enjoy your meal. Let us know if you need anything.' } },
    paid:       { teen: { title: '💳 Bill closed!', message: 'Money sent. Memories made. Thanks for being here.' }, young: { title: '💳 All squared!', message: 'Payment done. Come back soon — we miss you already.' }, adult: { title: '✅ Payment complete', message: 'Thank you for dining with us. See you again soon!' }, senior: { title: '✅ Payment received', message: 'Thank you for your visit. We look forward to seeing you again.' } },
    cancelled:  { teen: { title: '😬 Order cancelled', message: "Yikes. Come back when you're ready — we'll be here." }, young: { title: '❌ Cancelled', message: "Your order was cancelled. Still hungry? We've got you." }, adult: { title: '❌ Order cancelled', message: 'Your order has been cancelled. Feel free to reorder anytime.' }, senior: { title: '❌ Order cancelled', message: 'Your order has been cancelled. Please let us know if you need help.' } },
  }
  const statusMap = { pending: msgs.placed, placed: msgs.placed, preparing: msgs.preparing, on_the_way: msgs.on_the_way, delivered: msgs.delivered, served: msgs.delivered, paid: msgs.paid, cancelled: msgs.cancelled }
  const m = statusMap[status]?.[tone] ?? statusMap[status]?.young
  if (!m) return null
  const isCritical = status === 'on_the_way' || status === 'delivered' || status === 'served'
  return { ...m, type: isCritical ? 'order_ready' : 'order', navigate: '/order/status', actions: [{ key: 'view', label: 'Track Order', primary: true }] }
}

function getWaiterToast(event, user) {
  const tone = getTone(user)
  const msgs = {
    acknowledged: { teen: { title: '🛎️ Waiter sees you!', message: "They're finishing up something. 30 seconds." }, young: { title: '🛎️ Waiter notified', message: 'They saw your call. On their way.' }, adult: { title: '🛎️ Waiter acknowledged', message: 'Your waiter has seen your request and is coming.' }, senior: { title: '🛎️ Request received', message: 'Your waiter has been notified and will be with you shortly.' } },
    coming:       { teen: { title: "🏃 THEY'RE COMING!!", message: 'Waiter is literally sprinting. (Not literally.)' }, young: { title: '🏃 Waiter incoming!', message: 'Your waiter is on their way to your table.' }, adult: { title: '🏃 Waiter coming', message: 'Your waiter is heading to your table now.' }, senior: { title: '🏃 On the way', message: 'Your waiter is coming to assist you now.' } },
    arrived:      { teen: { title: '✅ WAITER HAS ARRIVED', message: 'They have appeared. Speak your wishes.' }, young: { title: '✅ Waiter at your table', message: 'Your waiter is here. What can they do for you?' }, adult: { title: '✅ Waiter arrived', message: 'Your waiter is at your table.' }, senior: { title: '✅ Waiter with you', message: "Your waiter has arrived. They're ready to assist." } },
  }
  const m = msgs[event]?.[tone] ?? msgs[event]?.young
  if (!m) return null
  return { ...m, type: 'waiter', duration: 0, navigate: null }
}

function getLoyaltyToast(event, user, data) {
  const tone = getTone(user), points = data?.points ?? data?.pointsEarned ?? 0, tier = data?.tier ?? ''
  if (event === 'points_earned') {
    const msgs = { teen: { title: `⭐ +${points} points!`, message: 'Ka-ching! Points added to your account.' }, young: { title: `⭐ +${points} loyalty points`, message: 'Points on the way. Keep ordering, keep earning.' }, adult: { title: `⭐ +${points} points earned`, message: `You've earned ${points} loyalty points from this order.` }, senior: { title: `⭐ Points added`, message: `${points} loyalty points have been added to your account.` } }
    return { ...(msgs[tone] ?? msgs.young), type: 'loyalty', navigate: '/loyalty', actions: [{ key: 'view', label: 'See Points', primary: false }] }
  }
  if (event === 'tier_upgrade') {
    const TIER_NAMES = { bronze: 'Bronze 🥉', silver: 'Silver 🥈', gold: 'Gold 🥇' }
    const tierName = TIER_NAMES[tier] ?? tier
    const msgs = { teen: { title: `🏆 LEVELLED UP!!`, message: `You're now ${tierName}. Absolute legend.` }, young: { title: `🏆 Tier upgrade!`, message: `You're now a ${tierName} member. More discounts await.` }, adult: { title: `🏆 New loyalty tier!`, message: `Congratulations — you've reached ${tierName} tier!` }, senior: { title: `🏆 Loyalty tier upgrade`, message: `You've been upgraded to ${tierName}. Thank you for your loyalty.` } }
    return { ...(msgs[tone] ?? msgs.young), type: 'tier_upgrade', navigate: '/loyalty', actions: [{ key: 'view', label: 'View Benefits', primary: true }] }
  }
  if (event === 'milestone') {
    const milestonePoints = data?.milestone ?? points
    const msgs = { teen: { title: `🎯 ${milestonePoints} points!!`, message: 'You just hit a big milestone. Respect.' }, young: { title: `🎯 ${milestonePoints} point milestone!`, message: 'Huge number. Huge discounts. Check your rewards.' }, adult: { title: `🎯 Milestone reached!`, message: `You've reached ${milestonePoints} loyalty points.` }, senior: { title: `🎯 Points milestone`, message: `Congratulations on reaching ${milestonePoints} points!` } }
    return { ...(msgs[tone] ?? msgs.young), type: 'points_milestone', navigate: '/loyalty', actions: [{ key: 'view', label: 'View Rewards', primary: true }] }
  }
  return null
}

const BADGE_MSGS = {
  first_timer:      { title: '🎉 First order badge!', message: 'You did it! First order earned you the First Timer badge.' },
  chai_addict:      { title: '☕ Chai Addict unlocked!', message: '10 chai orders. You are officially one of us.' },
  night_owl:        { title: '🦉 Night Owl badge!', message: 'Ordering after 9pm is your thing. We respect it.' },
  explorer:         { title: '🧭 Explorer badge!', message: '10 different items tried. You have excellent taste.' },
  loyal_regular:    { title: '💛 Loyal Regular badge!', message: "20 visits. You're basically family now." },
  big_spender:      { title: '💸 Big Spender badge!', message: 'One order over Rs 1000. Living large. We see you.' },
  social_butterfly: { title: '🦋 Social Butterfly badge!', message: '3 friends referred. The cafe grows because of you.' },
  review_royalty:   { title: '👑 Review Royalty badge!', message: "5 reviews left. You're shaping this place. Thank you." },
  streak_master:    { title: '🔥 Streak Master badge!', message: "7 days straight. You've unlocked something special." },
}

const WEATHER_MSGS = {
  sunny:  { title: '☀️ 32°C vibes detected', message: 'Your body is scientifically screaming Cold Coffee (Rs 160).', navigate: '/menu?category=cold' },
  hot:    { title: "🥵 It's roasting out there", message: "Cold Coffee (Rs 160). Non-negotiable. Doctor's orders.", navigate: '/menu?category=cold' },
  rainy:  { title: '🌧️ Rain + thukpa = science', message: "It's raining. Thukpa (Rs 200) is the only correct response.", navigate: '/menu?category=soup' },
  cold:   { title: '🧊 Actual winter today', message: "Masala Chiya (Rs 80). Survival isn't optional.", navigate: '/menu?category=hot' },
  snowy:  { title: '❄️ Snow day energy', message: 'Hot soup freshly made. You know what to do.', navigate: '/menu?category=hot' },
  windy:  { title: '💨 Stay warm inside', message: 'Windy out there. Hot drinks and snacks in here.', navigate: '/menu' },
  cloudy: { title: '☁️ Cozy weather unlocked', message: 'Latte + cloudy day = the combo that just works.', navigate: '/menu?category=coffee' },
}

function getMoodToast(user) {
  const tone = getTone(user), day = new Date().getDay(), hour = new Date().getHours(), name = NAME(user)
  if (hour >= 22 || hour < 5) return { title: '🦉 Still awake?', message: hour >= 22 ? 'Late night decisions: Black Coffee (Rs 120) or Masala Chiya (Rs 80). Both respectable.' : "3AM brain deserves fuel. Black Coffee (Rs 120). We're still here.", type: 'idle', navigate: '/menu' }
  if (day === 1 && hour < 14) {
    const msgs = { teen: { title: '😶 Monday. Ugh.', message: "It's Monday and you're already here. Respect. Masala Chiya (Rs 80) incoming?" }, young: { title: '😮‍💨 Monday face detected', message: 'Masala Chiya: Rs 80. Curing Mondays since we opened.' }, adult: { title: '☕ Monday fuel needed?', message: 'Start the week right. Black Coffee (Rs 120) is waiting.' }, senior: { title: '☕ Good Monday morning', message: 'Masala Chiya (Rs 80) — the best way to start any week.' } }
    return { ...(msgs[tone] ?? msgs.young), type: 'idle', navigate: '/menu' }
  }
  if (day === 5 && hour >= 14) return { title: "🎉 It's Friday!", message: 'Weekend starts now. Cold Coffee (Rs 160) + Veg Momo (Rs 160) = the Friday reset.', type: 'idle', navigate: '/menu' }
  return null
}

function getComebackToast(user, lastOrderAt) {
  if (!lastOrderAt) return null
  const daysSince = Math.floor((Date.now() - new Date(lastOrderAt)) / 86400000)
  if (daysSince < 7) return null
  const tone = getTone(user), name = NAME(user)
  const msgs = { teen: { title: `👀 ${daysSince} days?? Really??`, message: `We noticed. The Chai noticed. Come back, ${name}.` }, young: { title: `👋 Welcome back!`, message: `${daysSince} days away. We were starting to worry. Masala Chiya (Rs 80) is ready.` }, adult: { title: `👋 Good to see you again`, message: `It's been ${daysSince} days. Welcome back — what can we get you?` }, senior: { title: `👋 Welcome back`, message: `We haven't seen you for ${daysSince} days. It's lovely to have you back.` } }
  return { ...(msgs[tone] ?? msgs.young), type: 'idle', navigate: '/menu', actions: [{ key: 'order', label: 'Order Now', primary: true }] }
}

function getStudyToast(user) {
  if (user?.occupation !== 'student') return null
  const hour = new Date().getHours()
  if (hour < 9 || hour > 20) return null
  const msgs = [
    { title: '📚 3 hours in?', message: 'Brain needs fuel. Banana Smoothie (Rs 160) + 15min break = peak performance.' },
    { title: '🧠 Study mode unlocked', message: 'Black Coffee (Rs 120) + quiet corner. The formula has never failed.' },
    { title: '📝 Exam season energy', message: "You're here studying. Masala Chiya (Rs 80) makes the notes make sense." },
    { title: '☕ Study fuel spotted', message: 'Books + Black Coffee (Rs 120). The oldest combo in academia.' },
  ]
  return { ...msgs[Math.floor(Math.random() * msgs.length)], type: 'suggest', navigate: '/menu', actions: [{ key: 'order', label: 'Order Fuel', primary: true }] }
}

function getPeakHourToast() {
  const hour = new Date().getHours()
  const isPeak = (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 20)
  if (!isPeak) return null
  const msgs = [
    { title: '⏳ Kitchen is buzzing right now', message: 'Peak hours = 15–20min wait. Worth it though. Promise.' },
    { title: '🔥 High demand right now', message: 'Kitchen is working flat out. Expect 15–20 min. Still the best momo in town.' },
  ]
  return { ...msgs[Math.floor(Math.random() * msgs.length)], type: 'system', navigate: null }
}

const CROSS_SELL_MAP = {
  momo:     { title: '✨ Momo pairs perfectly with…', message: "Masala Chiya (Rs 80). Don't knock it till you try it.", navigate: '/menu?item=masala_chiya' },
  coffee:   { title: '✨ Coffee + Brownie is law', message: "Chocolate Brownie (Rs 250). You're already here. Might as well.", navigate: '/menu?item=brownie' },
  thukpa:   { title: '✨ Thukpa + something sweet?', message: 'Mango Lassi (Rs 140) — the unexpected combo that works.', navigate: '/menu?item=lassi' },
  dal_bhat: { title: '✨ Dal Bhat calls for Lassi', message: 'Mango Lassi (Rs 140). Traditional. Delicious. Non-negotiable.', navigate: '/menu?item=lassi' },
}

function getIdleToast(user) {
  const tone = getTone(user)
  const msgs = {
    teen:   [{ title: '🤔 Still scrolling?', message: 'The Momo (Rs 160) is right there. Just saying.' }, { title: '👀 The menu is literally right there', message: "You've been staring for a while. It's okay to commit." }],
    young:  [{ title: '😏 Decision paralysis?', message: "We get it. Start with Masala Chiya (Rs 80). Can't go wrong." }, { title: '⏳ Still deciding?', message: 'Pro tip: the Veg Momo + Chiya combo has never disappointed anyone.' }],
    adult:  [{ title: '☕ Can we help you decide?', message: 'Our staff can suggest based on your mood. Or just try the Momo.' }, { title: '🍽️ Something catch your eye?', message: 'Our top pick today: Chicken Momo (Rs 180) + Cold Coffee (Rs 160).' }],
    senior: [{ title: '😊 Take your time', message: "No rush. If you'd like a recommendation, our team is happy to help." }, { title: '☕ Our favourite today', message: 'Masala Chiya (Rs 80) and Sel Roti (Rs 120) — a classic pairing.' }],
  }
  const pool = msgs[tone] ?? msgs.young
  return { ...pool[Math.floor(Math.random() * pool.length)], type: 'idle', navigate: '/menu' }
}

function getCartAbandonToast(cartItems, user) {
  if (!cartItems?.length) return null
  const tone = getTone(user), item = cartItems[0]?.name ?? 'something delicious'
  const msgs = { teen: { title: '🛒 Your cart is lonely', message: `${item} is sitting there waiting. Don't leave it hanging.` }, young: { title: '🛒 Forgot about your cart?', message: `${item} is still in there. One tap to confirm.` }, adult: { title: '🛒 Your cart is waiting', message: `You left ${item} in your cart. Ready to complete your order?` }, senior: { title: '🛒 Pending order', message: `You have items in your cart including ${item}. Would you like to complete your order?` } }
  return { ...(msgs[tone] ?? msgs.young), type: 'cart_abandon', navigate: '/cart', actions: [{ key: 'checkout', label: 'Complete Order', primary: true }] }
}

function getSessionExpiryToast(minutesLeft) {
  if (minutesLeft > 5) return null
  return { title: `⏰ Table session ending in ${minutesLeft}min`, message: 'Place any final orders now. Your session will expire soon.', type: 'session_expiry', navigate: '/menu', duration: 0, actions: [{ key: 'order', label: 'Order Now', primary: true }] }
}

function getReorderToast(user, orderHistory) {
  if (!orderHistory?.length) return null
  const freq = {}
  orderHistory.forEach(o => { o.items?.forEach(item => { const key = item.name; freq[key] = (freq[key] ?? 0) + (item.quantity ?? 1) }) })
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] < 3) return null
  const [itemName, count] = top, tone = getTone(user)
  const msgs = { teen: { title: '🔄 Your usual?', message: `${itemName} — ${count} times and counting. You know what you like.` }, young: { title: `🍽️ Feeling like ${itemName}?`, message: `You've had it ${count} times. It's basically your signature order.` }, adult: { title: '🔄 Quick reorder?', message: `${itemName} has been your top order ${count} times. One tap to reorder.` }, senior: { title: '🔄 Your favourite', message: `${itemName} has been your most ordered item. Would you like to order it again?` } }
  return { ...(msgs[tone] ?? msgs.young), type: 'reorder', navigate: '/menu', actions: [{ key: 'reorder', label: `Order ${itemName}`, primary: true }], meta: { itemName } }
}

function getBirthdayToast(user) {
  if (!user?.birthday) return null
  const today = new Date(), mm = String(today.getMonth() + 1).padStart(2, '0'), dd = String(today.getDate()).padStart(2, '0')
  if (user.birthday !== `${mm}-${dd}`) return null
  const name = NAME(user), tone = getTone(user)
  const msgs = { teen: { title: `🎂 HAPPY BIRTHDAY ${name.toUpperCase()}!!`, message: "It's your actual day!! Chocolate Brownie (Rs 250) — mandatory." }, young: { title: `🎂 Happy Birthday ${name}!`, message: 'Your special day. Chocolate Brownie (Rs 250) + Cold Coffee (Rs 160) = the birthday combo.' }, adult: { title: `🎂 Happy Birthday ${name}!`, message: "Wishing you a wonderful day. Treat yourself — you've earned it." }, senior: { title: `🎂 Wishing you a wonderful birthday`, message: `Happy Birthday, ${name}. May this year bring you joy — and good food.` } }
  return { ...(msgs[tone] ?? msgs.young), type: 'birthday', navigate: '/menu', duration: 10000, actions: [{ key: 'treat', label: '🎂 Claim Treat', primary: true }] }
}

const getNavPath = (type) => {
  switch (type) {
    case 'order': case 'kitchen': case 'order_ready': return '/order/status'
    case 'payment':                                    return '/payment'
    case 'loyalty': case 'tier_upgrade': case 'points_milestone':
    case 'badge': case 'achievement':                 return '/loyalty'
    case 'message':                                    return '/messages'
    case 'festival': case 'birthday': case 'system':  return '/notifications'
    case 'weather_alert':                              return '/notifications'
    default:                                           return null
  }
}

const getPriority = (type, important) => {
  if (important) return 1
  const map = { order_ready: 1, waiter: 1, payment: 1, session_expiry: 1, weather_alert: 1, order: 2, kitchen: 2, badge: 2, achievement: 2, tier_upgrade: 2, loyalty: 3, festival: 3, birthday: 3, points_milestone: 3, cart_abandon: 3, weather_forecast: 3, weather: 4, idle: 4, reorder: 4, profile_nudge: 4, quiz: 4, suggest: 4, system: 4 }
  return map[type] ?? 4
}

// ── MAIN HOOK ─────────────────────────────────────────────────────────────────
export function useNotifications(opts = {}) {
  const { orderHistory = [], weather = null } = opts ?? {}

  const dispatch    = useDispatch()
  const isLoggedIn  = useSelector(selectIsLoggedIn)
  const user        = useSelector(selectUser)
  const isGuest     = useSelector(selectIsGuest)
  const cartItems   = useSelector(selectCartItems)
  const tableNumber = useSelector(selectTableNumber)
  const session     = useSelector(selectSession)

  const idleTimerRef    = useRef(null)
  const cartTimerRef    = useRef(null)
  const sessionTimerRef = useRef(null)
  const moodFiredRef    = useRef(false)
  const reorderFiredRef = useRef(false)
  const prevWeatherRef  = useRef(null)
  const prevCartRef     = useRef(null)
  const welcomeFiredRef = useRef(false)
  const uviFiredRef     = useRef(false)
  const tomorrowFiredRef = useRef(false)

  const fire = useCallback((t) => {
    if (!t) return
    dispatch(showToast({ priority: getPriority(t.type, t.priority === 1), ...t }))
  }, [dispatch])

  // ── Effect 1: Initial fetch — load notifications from API ─────────────────
  // FIX: removed dispatch(setUnreadCount(unread ?? 0))
  // setNotifications() already computes unreadCount from filtered items.
  // setUnreadCount was overwriting the correct filtered count with the raw
  // server count (which includes message-type notifications).
  useEffect(() => {
    if (!isLoggedIn) return
    notificationService.getAll({ limit: 30 })
      .then(({ items }) => {
        dispatch(setNotifications(items ?? []))
        // ✅ DO NOT dispatch setUnreadCount here — setNotifications handles it
      })
      .catch(() => {})
  }, [isLoggedIn, dispatch])

  // ── Effect 2: Socket — new notification ───────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return
    const unsub = socketService.on('notification:new', (notif) => {
      dispatch(addNotification(notif))
      const orderToast   = notif.type === 'order'   ? getOrderToast(notif.data?.status, user, notif.data) : null
      const waiterToast  = notif.type === 'waiter'  ? getWaiterToast(notif.data?.event ?? 'acknowledged', user) : null
      const loyaltyToast = notif.type === 'loyalty' ? getLoyaltyToast(notif.data?.event ?? 'points_earned', user, notif.data) : null
      const toast = orderToast ?? waiterToast ?? loyaltyToast ?? { type: notif.type, title: notif.title, message: notif.message, navigate: getNavPath(notif.type), actions: notif.type === 'order' ? [{ key: 'view', label: 'Track Order', primary: true }] : null }
      fire(toast)
    })
    return () => unsub()
  }, [isLoggedIn, user, dispatch, fire])

  // ── Effect 3: Order socket events ─────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return
    const events = [
      ['order:placed',     (d) => fire(getOrderToast('placed',     user, d))],
      ['order:preparing',  (d) => fire(getOrderToast('preparing',  user, d))],
      ['order:on_the_way', (d) => fire(getOrderToast('on_the_way', user, d))],
      ['order:delivered',  (d) => fire(getOrderToast('delivered',  user, d))],
      ['order:served',     (d) => fire(getOrderToast('delivered',  user, d))],
      ['order:paid',       (d) => fire(getOrderToast('paid',       user, d))],
      ['order:cancelled',  (d) => fire(getOrderToast('cancelled',  user, d))],
    ]
    const unsubs = events.map(([evt, handler]) => socketService.on(evt, handler))
    return () => unsubs.forEach(u => u())
  }, [isLoggedIn, user, fire])

  // ── Effect 4: Waiter socket events ────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return
    const events = [
      ['waiter:acknowledged', () => fire(getWaiterToast('acknowledged', user))],
      ['waiter:coming',       () => fire(getWaiterToast('coming',       user))],
      ['waiter:arrived',      () => fire(getWaiterToast('arrived',      user))],
    ]
    const unsubs = events.map(([evt, handler]) => socketService.on(evt, handler))
    return () => unsubs.forEach(u => u())
  }, [isLoggedIn, user, fire])

  // ── Effect 5: Loyalty socket events ──────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return
    const events = [
      ['loyalty:points_earned', (d) => fire(getLoyaltyToast('points_earned', user, d))],
      ['loyalty:tier_upgrade',  (d) => fire(getLoyaltyToast('tier_upgrade',  user, d))],
      ['loyalty:milestone',     (d) => fire(getLoyaltyToast('milestone',     user, d))],
    ]
    const unsubs = events.map(([evt, handler]) => socketService.on(evt, handler))
    return () => unsubs.forEach(u => u())
  }, [isLoggedIn, user, fire])

  // ── Effect 6: Badge earned ────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return
    const unsub = socketService.on('badge:earned', (data) => {
      const badgeId = data?.badgeId ?? data?.id
      const msg = BADGE_MSGS[badgeId]
      if (!msg) return
      fire({ ...msg, type: 'badge', navigate: '/loyalty', duration: 8000, actions: [{ key: 'view', label: 'View Badge', primary: true }] })
    })
    return () => unsub()
  }, [isLoggedIn, fire])

  // ── Effect 7: Welcome ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !user || welcomeFiredRef.current) return
    welcomeFiredRef.current = true
    const key = isGuest ? 'kc_welcomed_guest' : `kc_welcomed_${user._id}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    const name = NAME(user)
    const toast = isGuest
      ? { type: 'welcome', title: '👋 Welcome!', message: 'Browse our menu and order from your table.', navigate: '/menu', duration: 7000 }
      : { type: 'welcome', title: `🎉 Welcome back, ${name}!`, message: 'Your loyalty points are ready. What are you having today?', navigate: '/menu', duration: 7000, actions: [{ key: 'menu', label: 'See Menu', primary: true }] }
    setTimeout(() => fire(toast), 1500)
  }, [isLoggedIn, user, isGuest, fire])

  // ── Effect 8: Birthday ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !user || isGuest) return
    const toast = getBirthdayToast(user)
    if (!toast) return
    const key = `kc_bday_${user._id}_${new Date().getFullYear()}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    setTimeout(() => fire(toast), 3000)
  }, [isLoggedIn, user, isGuest, fire])

  // ── Effect 9: Festival ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || isGuest) return
    const key = `kc_festival_${new Date().toDateString()}`
    if (localStorage.getItem(key)) return
    fetchTodayFestivals().then(fs => {
      const ctx = getTodayContext(user, fs)
      if (ctx.festivals?.length > 0) {
        const f = ctx.festivals[0]
        localStorage.setItem(key, '1')
        setTimeout(() => fire({ type: 'festival', title: f.title, message: f.message, emoji: f.emoji, color: f.color, navigate: '/notifications', duration: 10000, soundKey: f.soundKey }), 4000)
      }
    }).catch(() => {})
  }, [isLoggedIn, isGuest, user, fire])

  // ── Effect 10: Weather ────────────────────────────────────────────────────
  useEffect(() => {
    const condition = weather?.condition
    if (!condition || condition === prevWeatherRef.current || !isLoggedIn) return
    prevWeatherRef.current = condition
    const msg = WEATHER_MSGS[condition]
    if (!msg) return
    const key = `kc_weather_${condition}_${new Date().toDateString()}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    setTimeout(() => fire({ type: 'weather', ...msg, actions: [{ key: 'view', label: 'View Menu', primary: false }] }), 2500)
  }, [weather, isLoggedIn, fire])

  // ── Effect 11: Mood ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || moodFiredRef.current) return
    const key = `kc_mood_${new Date().toDateString()}`
    if (sessionStorage.getItem(key)) return
    const toast = getMoodToast(user)
    if (!toast) return
    moodFiredRef.current = true
    sessionStorage.setItem(key, '1')
    setTimeout(() => fire(toast), 8000)
  }, [isLoggedIn, user, fire])

  // ── Effect 12: Comeback ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || isGuest || !user?.lastOrderAt) return
    const firedKey = `kc_comeback_${user._id}`
    if (sessionStorage.getItem(firedKey)) return
    const toast = getComebackToast(user, user.lastOrderAt)
    if (!toast) return
    sessionStorage.setItem(firedKey, '1')
    setTimeout(() => fire(toast), 5000)
  }, [isLoggedIn, isGuest, user, fire])

  // ── Effect 13: Student ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || user?.occupation !== 'student') return
    const key = `kc_study_${new Date().toDateString()}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    const toast = getStudyToast(user)
    if (!toast) return
    setTimeout(() => fire(toast), 12000)
  }, [isLoggedIn, user, fire])

  // ── Effect 14: Idle ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return
    const resetIdle = () => {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => { const toast = getIdleToast(user); if (toast) fire(toast) }, 5 * 60 * 1000)
    }
    const events = ['click', 'touchstart', 'keydown', 'scroll']
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }))
    resetIdle()
    return () => { clearTimeout(idleTimerRef.current); events.forEach(e => window.removeEventListener(e, resetIdle)) }
  }, [isLoggedIn, user, fire])

  // ── Effect 15: Cart abandon ───────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(cartTimerRef.current)
    const cartKey = JSON.stringify(cartItems?.map(i => i._id) ?? [])
    if (cartKey === prevCartRef.current || !cartItems?.length || !isLoggedIn) { prevCartRef.current = cartKey; return }
    prevCartRef.current = cartKey
    cartTimerRef.current = setTimeout(() => { const toast = getCartAbandonToast(cartItems, user); if (toast) fire(toast) }, 3 * 60 * 1000)
    return () => clearTimeout(cartTimerRef.current)
  }, [cartItems, isLoggedIn, user, fire])

  // ── Effect 16: Session expiry ─────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(sessionTimerRef.current)
    if (!session?.expiresAt || !tableNumber) return
    const msLeft = new Date(session.expiresAt) - Date.now()
    const warnAt = msLeft - 5 * 60 * 1000
    if (warnAt <= 0) return
    sessionTimerRef.current = setTimeout(() => { const minLeft = Math.round((new Date(session.expiresAt) - Date.now()) / 60000); const toast = getSessionExpiryToast(minLeft); if (toast) fire(toast) }, warnAt)
    return () => clearTimeout(sessionTimerRef.current)
  }, [session?.expiresAt, tableNumber, fire])

  // ── Effect 17: Reorder ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || isGuest || !orderHistory?.length || reorderFiredRef.current) return
    const key = `kc_reorder_${new Date().toDateString()}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    reorderFiredRef.current = true
    const toast = getReorderToast(user, orderHistory)
    if (toast) setTimeout(() => fire(toast), 10000)
  }, [isLoggedIn, isGuest, orderHistory, user, fire])

  // ── Effect 18: Profile nudge ──────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || isGuest || !user) return
    const key = `kc_profile_nudge_${new Date().toDateString()}`
    if (localStorage.getItem(key)) return
    const missingCount = [user.dob, user.gender, user.hobbies?.length, user.occupation, user.foodPreference, user.favouriteDrink].filter(v => !v || (Array.isArray(v) && v.length === 0)).length
    if (!missingCount) return
    localStorage.setItem(key, '1')
    setTimeout(() => { const toast = getProfileNudgeToast(user); if (toast) fire(toast) }, 7 * 60 * 1000)
  }, [isLoggedIn, isGuest, user, fire])

  // ── Effect 19: Peak hour ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return
    const key = `kc_peak_${new Date().toISOString().slice(0, 13)}`
    if (sessionStorage.getItem(key)) return
    const toast = getPeakHourToast()
    if (!toast) return
    sessionStorage.setItem(key, '1')
    setTimeout(() => fire(toast), 15000)
  }, [isLoggedIn, fire])

  // ── Effect 20: Cross-sell ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return
    const unsub = socketService.on('order:delivered', (data) => {
      const items = data?.items ?? []
      for (const item of items) {
        const name  = (item.name ?? '').toLowerCase()
        const match = Object.keys(CROSS_SELL_MAP).find(k => name.includes(k))
        if (match) { setTimeout(() => fire({ ...CROSS_SELL_MAP[match], type: 'cross_sell' }), 4000); break }
      }
    })
    return () => unsub()
  }, [isLoggedIn, fire])

  // ── Effect 21: Imminent rain ──────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !weather?.minutely?.length) return
    const tone  = getTone(user)
    const toast = getImminentRainToast(weather, tone)
    if (!toast) return
    const firstRainMin = weather.minutely.findIndex(m => (m.precipitation ?? 0) > 0)
    const bucket = Math.floor(firstRainMin / 5)
    const key = `kc_rain_imminent_${new Date().toDateString()}_${bucket}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    setTimeout(() => fire(toast), 1500)
  }, [weather?.minutely, isLoggedIn, user, fire])

  // ── Effect 22: Gov alerts ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !weather?.alerts?.length) return
    const alertToasts = getGovAlertToasts(weather)
    if (!alertToasts.length) return
    alertToasts.forEach((toast, i) => setTimeout(() => fire(toast), 500 + i * 2000))
  }, [weather?.alerts, isLoggedIn, fire])

  // ── Effect 23: Hourly change ──────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !weather?.hourly?.length) return
    const tone  = getTone(user)
    const toast = getHourlyChangeToast(weather, tone)
    if (!toast) return
    const changeHour = weather.hourly.slice(1, 7).find(h => h.condition !== weather.condition && ['rainy','snowy','cold','hot'].includes(h.condition))
    if (!changeHour) return
    const key = `kc_hourly_change_${changeHour.dt}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    setTimeout(() => fire(toast), 6000)
  }, [weather?.hourly, isLoggedIn, user, fire])

  // ── Effect 24: Tomorrow preview ───────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !weather?.daily?.length || tomorrowFiredRef.current) return
    const h = new Date().getHours()
    if (h < 6 || h >= 10) return
    const key = `kc_tomorrow_preview_${new Date().toDateString()}`
    if (localStorage.getItem(key)) return
    const tone  = getTone(user)
    const toast = getTomorrowPreviewToast(weather, tone)
    if (!toast) return
    tomorrowFiredRef.current = true
    localStorage.setItem(key, '1')
    setTimeout(() => fire(toast), 9000)
  }, [weather?.daily, isLoggedIn, user, fire])

  // ── Effect 25: UV index ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || weather?.uvi == null || uviFiredRef.current) return
    if (weather.uvi <= 6) return
    const key = `kc_uvi_${new Date().toDateString()}`
    if (localStorage.getItem(key)) return
    const tone  = getTone(user)
    const toast = getUVIToast(weather, tone)
    if (!toast) return
    uviFiredRef.current = true
    localStorage.setItem(key, '1')
    setTimeout(() => fire(toast), 11000)
  }, [weather?.uvi, isLoggedIn, user, fire])
}

export default useNotifications

export { getOrderToast, getWaiterToast, getLoyaltyToast, getBirthdayToast, getProfileNudgeToast, BADGE_MSGS }