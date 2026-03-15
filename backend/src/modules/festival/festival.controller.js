// backend/src/modules/festival/festival.controller.js

import Festival   from './festival.model.js'
import catchAsync from '../../shared/utils/catchAsync.js'
import AppError   from '../../shared/utils/AppError.js'
import { sendSuccess } from '../../shared/utils/response.js'

// ── Redis cache key ────────────────────────────────────────────────────────────
const todayCacheKey = () => {
  const d = new Date()
  return `festivals:today:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

// ── GET /api/festivals/today ───────────────────────────────────────────────────
export const getTodayFestivals = catchAsync(async (req, res) => {
  const redis = req.app.get('redis')

  if (redis) {
    try {
      const cached = await redis.get(todayCacheKey())
      if (cached) {
        return sendSuccess(res, JSON.parse(cached), "Today's festivals (cached)", 200)
      }
    } catch {}
  }

  const now        = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  const lookback = new Date(startOfDay)
  lookback.setDate(lookback.getDate() - 30)

  const candidates = await Festival.find({
    active: true,
    date: { $gte: lookback, $lte: endOfDay },
  }).lean()

  const todayFestivals = candidates.filter(f => {
    const start = new Date(f.date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + (f.durationDays ?? 1))
    return now >= start && now < end
  })

  if (redis) {
    try {
      await redis.setEx(todayCacheKey(), 86400, JSON.stringify(todayFestivals))
    } catch {}
  }

  return sendSuccess(res, todayFestivals, "Today's festivals", 200)
})

// ── GET /api/festivals ─────────────────────────────────────────────────────────
export const getAllFestivals = catchAsync(async (req, res) => {
  const year  = req.query.year ? parseInt(req.query.year) : new Date().getFullYear()
  const items = await Festival.find({ year }).sort({ date: 1 }).lean()
  return sendSuccess(res, items, 'Festivals', 200)
})

// ── POST /api/festivals ────────────────────────────────────────────────────────
export const createFestival = catchAsync(async (req, res) => {
  const { name, date, durationDays, emoji, title, message, imageUrl, color, soundKey, vibrate } = req.body

  if (!name || !date || !title || !message) {
    throw new AppError('name, date, title, message are required', 400)
  }

  const d    = new Date(date)
  const year = d.getFullYear()

  const festival = await Festival.create({
    name, date: d, durationDays, emoji, title, message,
    imageUrl, color, soundKey, vibrate, year,
  })

  const redis = req.app.get('redis')
  if (redis) {
    try {
      const key = `festivals:today:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      await redis.del(key)
    } catch {}
  }

  return sendSuccess(res, festival, 'Festival created', 201)
})

// ── PATCH /api/festivals/:id ──────────────────────────────────────────────────
export const updateFestival = catchAsync(async (req, res) => {
  const festival = await Festival.findByIdAndUpdate(
    req.params.id,
    { ...req.body },
    { new: true, runValidators: true }
  )
  if (!festival) throw new AppError('Festival not found', 404)

  const redis = req.app.get('redis')
  if (redis) {
    try {
      const d = new Date(festival.date)
      await redis.del(`festivals:today:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`)
    } catch {}
  }

  return sendSuccess(res, festival, 'Festival updated', 200)
})

// ── DELETE /api/festivals/:id ─────────────────────────────────────────────────
export const deleteFestival = catchAsync(async (req, res) => {
  const festival = await Festival.findByIdAndDelete(req.params.id)
  if (!festival) throw new AppError('Festival not found', 404)
  return sendSuccess(res, null, 'Festival deleted', 200)
})

// ── POST /api/festivals/seed ──────────────────────────────────────────────────
export const seedFestivals = catchAsync(async (req, res) => {
  const year = req.body.year ?? new Date().getFullYear()

  const FESTIVAL_DATES_2026 = [
    { name: 'Maha Shivaratri',  date: '2026-02-26', durationDays: 1, emoji: '🔱', color: '#8B5CF6', soundKey: 'loyalty',
      title: 'Maha Shivaratri 🔱',
      message: "Pashupatinath is packed. You found the smarter option — warm seat, Masala Chiya (Rs 80).",
      imageUrl: null },

    { name: 'Holi (Terai)',     date: '2026-03-03', durationDays: 1, emoji: '🎨', color: '#EC4899', soundKey: 'loyalty',
      title: 'Happy Holi! 🎨',
      message: 'Terai Holi! Colours, water, chaos. Cold Coffee (Rs 160) is the official recovery drink.',
      imageUrl: null },

    { name: 'Holi',             date: '2026-03-04', durationDays: 1, emoji: '🎨', color: '#F472B6', soundKey: 'loyalty',
      title: 'Happy Holi! 🎨',
      message: 'Colours everywhere. Come wash it off with Cold Coffee (Rs 160). You deserve it.',
      imageUrl: null },

    { name: 'Nawa Barsha',      date: '2026-04-14', durationDays: 2, emoji: '🎉', color: '#F59E0B', soundKey: 'tierUpgraded',
      title: 'Naya Barsha 2083! 🎉',
      message: 'New Bikram Sambat! New goals. Same excellent Masala Chiya (Rs 80).',
      imageUrl: null },

    { name: 'Buddha Jayanti',   date: '2026-05-23', durationDays: 1, emoji: '🪷', color: '#A78BFA', soundKey: 'loyalty',
      title: 'Buddha Jayanti 🪷',
      message: 'Peace, mindfulness, and Masala Chiya (Rs 80). The Buddha would approve.',
      imageUrl: null },

    { name: 'Teej',             date: '2026-08-21', durationDays: 3, emoji: '🔴', color: '#EF4444', soundKey: 'loyalty',
      title: 'Happy Teej! 🔴',
      message: "Haritalika Teej. Mango Lassi (Rs 140) is practically mandatory today.",
      imageUrl: null },

    { name: 'Indra Jatra',      date: '2026-09-11', durationDays: 8, emoji: '🎭', color: '#6366F1', soundKey: 'loyalty',
      title: 'Indra Jatra in Kathmandu! 🎭',
      message: 'The Living Goddess is riding through the streets. Black Coffee (Rs 120) included.',
      imageUrl: null },

    { name: 'Dashain',          date: '2026-10-02', durationDays: 15, emoji: '🎊', color: '#F59E0B', soundKey: 'tierUpgraded',
      title: 'Dashain Celebrations! 🎊',
      message: 'Tika, jamara, and the smell of good food. Dal Bhat (Rs 220) hits different during Dashain.',
      imageUrl: null },

    { name: 'Tihar',            date: '2026-10-20', durationDays: 5, emoji: '🪔', color: '#F59E0B', soundKey: 'tierUpgraded',
      title: 'Tihar — Festival of Lights 🪔',
      message: "Deusi reh! Sel Roti (Rs 120) + Masala Chiya (Rs 80) = the most Nepali evening possible.",
      imageUrl: null },

    { name: 'Chhath',           date: '2026-10-28', durationDays: 4, emoji: '🌅', color: '#F97316', soundKey: 'loyalty',
      title: 'Chhath Puja 🌅',
      message: 'Sunrise worship at the ghats. Dal Bhat (Rs 220) will be waiting when the fast breaks.',
      imageUrl: null },
  ]

  const dateMap = { 2026: FESTIVAL_DATES_2026 }
  const toSeed  = dateMap[year]

  if (!toSeed) {
    throw new AppError(`No seed data for year ${year}. Add dates to the seed map.`, 400)
  }

  const results = []
  for (const f of toSeed) {
    const d = new Date(f.date)
    try {
      const doc = await Festival.findOneAndUpdate(
        { name: f.name, year },
        { ...f, date: d, year },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      results.push(doc)
    } catch (e) {
      console.error(`Seed failed for ${f.name}:`, e.message)
    }
  }

  return sendSuccess(res, results, `Seeded ${results.length} festivals for ${year}`, 201)
})