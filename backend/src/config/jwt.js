// src/config/jwt.js
import jwt from 'jsonwebtoken'

const SECRET  = process.env.JWT_SECRET  || 'dev-secret-change-in-prod'
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d'

export const signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES })

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

export const decodeToken = (token) => jwt.decode(token)