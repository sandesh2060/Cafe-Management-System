// src/modules/table-session/algorithms/qrHmacVerify.js
import crypto   from 'node:crypto'
import Table    from '../../table/table.model.js'
import { cache } from '../../../config/redis.js'

const HMAC_SECRET = process.env.QR_HMAC_SECRET || 'dev-qr-secret'
const QR_TTL_SEC  = parseInt(process.env.QR_TOKEN_TTL || '900')

/**
 * Generate a time-limited HMAC-signed QR token for a table.
 */
export const generateQrToken = (tableId, cafeId) => {
  const payload   = `${tableId}:${cafeId}:${Date.now()}`
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}:${signature}`).toString('base64url')
}

/**
 * Verify a QR token and return the table data if valid.
 * Uses Redis to prevent replay attacks.
 */
export const verifyQrToken = async (token) => {
  // Check Redis first — if already used/expired, reject
  const cacheKey = cache.KEYS.qrToken(token)
  const cached   = await cache.get(cacheKey)
  if (cached === 'used') throw new Error('QR code already used')

  // Decode
  let decoded
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf-8')
  } catch {
    throw new Error('Invalid QR format')
  }

  const parts = decoded.split(':')
  if (parts.length !== 4) throw new Error('Invalid QR token structure')

  const [tableId, cafeId, timestamp, signature] = parts

  // Verify not expired
  const age = Date.now() - parseInt(timestamp)
  if (age > QR_TTL_SEC * 1000) throw new Error('QR code expired')

  // Verify signature
  const payload  = `${tableId}:${cafeId}:${timestamp}`
  const expected = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex')
  const sigBuffer = Buffer.from(signature, 'hex')
  const expBuffer = Buffer.from(expected,  'hex')

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    throw new Error('Invalid QR signature')
  }

  // Find table
  const table = await Table.findById(tableId).lean()
  if (!table || !table.isActive) throw new Error('Table not found or inactive')
  if (table.cafeId.toString() !== cafeId) throw new Error('QR token mismatch')

  // Mark as used in Redis (single-use)
  await cache.set(cacheKey, 'used', QR_TTL_SEC)

  return { table, cafeId }
}