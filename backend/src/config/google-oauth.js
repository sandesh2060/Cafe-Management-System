// src/config/google-oauth.js
import passport       from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { googleLogin }  from '../modules/auth/auth.service.js'
import { signToken }    from './jwt.js'

export const configurePassport = () => {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { user, token } = await googleLogin(profile)
        done(null, { user, token })
      } catch (err) {
        done(err, null)
      }
    }
  ))
}