// src/app.js
import express     from 'express'
import cors        from 'cors'
import helmet      from 'helmet'
import morgan      from 'morgan'
import rateLimit   from 'express-rate-limit'
import passport    from 'passport'

import { errorHandler }      from './shared/middleware/errorHandler.js'
import { configurePassport } from './config/google-oauth.js'

// Route imports
import authRoutes               from './modules/auth/auth.routes.js'
import tableRoutes              from './modules/table/table.routes.js'
import tableSessionRoutes       from './modules/table-session/tableSession.routes.js'
import tableSessionActiveRoutes from './modules/table-session/tableSession.active.routes.js'
import menuRoutes               from './modules/menu/menu.routes.js'
import orderRoutes              from './modules/order/order.routes.js'
import waiterCallRoutes         from './modules/waiter-call/waiterCall.routes.js'
import recommendationRoutes     from './modules/recommendations/recommendation.routes.js'
import weatherRoutes            from './modules/weather/weather.routes.js'
import loyaltyRoutes            from './modules/loyalty/loyalty.routes.js'
import messagingRoutes          from './modules/messaging/message.routes.js'
import callingRoutes            from './modules/calling/calling.routes.js'
import billingRoutes            from './modules/billing/billing.routes.js'
import inventoryRoutes          from './modules/inventory/inventory.routes.js'
import staffRoutes              from './modules/staff/staff.routes.js'
import reportRoutes             from './modules/reports/reports.routes.js'
import adminRoutes              from './modules/admin/admin.routes.js'
import reviewRoutes             from './modules/review/review.routes.js'
import notificationRoutes       from './modules/notification/notification.routes.js'  // ← NEW

const app = express()

app.set('trust proxy', 1)

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.100.241:5173',  // ← your current LAN IP
  'http://192.168.1.112:5173',
  'http://192.168.101.8:5173',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.NGROK_FRONTEND_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.ngrok-free.dev') ||
      origin.endsWith('.ngrok.io')
    ) return callback(null, true)
    console.warn(`[CORS] Blocked origin: ${origin}`)
    callback(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
}))
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 200 }))

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

configurePassport()
app.use(passport.initialize())

app.get('/health', (_, res) => res.json({
  status: 'ok', service: 'कौसी चिया API', timestamp: new Date(),
}))

const api = '/api'
app.use(`${api}/auth`,            authRoutes)
app.use(`${api}/tables`,          tableRoutes)
app.use(`${api}/table-session`,   tableSessionRoutes)
app.use(`${api}/table-session`,   tableSessionActiveRoutes)
app.use(`${api}/menu`,            menuRoutes)
app.use(`${api}/orders`,          orderRoutes)
app.use(`${api}/waiter-call`,     waiterCallRoutes)
app.use(`${api}/recommendations`, recommendationRoutes)
app.use(`${api}/weather`,         weatherRoutes)
app.use(`${api}/loyalty`,         loyaltyRoutes)
app.use(`${api}/messages`,        messagingRoutes)
app.use(`${api}/calling`,         callingRoutes)
app.use(`${api}/billing`,         billingRoutes)
app.use(`${api}/inventory`,       inventoryRoutes)
app.use(`${api}/staff`,           staffRoutes)
app.use(`${api}/reports`,         reportRoutes)
app.use(`${api}/admin`,           adminRoutes)
app.use(`${api}/reviews`,         reviewRoutes)
app.use(`${api}/notifications`,   notificationRoutes)   // ← NEW

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
})
app.use(errorHandler)

export default app