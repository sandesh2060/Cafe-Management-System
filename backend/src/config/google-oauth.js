// backend/src/config/google-oauth.js
// NOTE: Renamed to github-oauth internally but kept filename for app.js compatibility
import passport     from 'passport'
import { Strategy } from 'passport-github2'
import User         from '../modules/user/user.model.js'

export const configurePassport = () => {
  passport.use(new Strategy(
    {
      clientID:     process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL:  process.env.GITHUB_CALLBACK_URL
                    || 'http://localhost:5000/api/auth/github/callback',
      scope: ['user:email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email  = profile.emails?.[0]?.value
        const avatar = profile.photos?.[0]?.value

        let user = await User.findOne({
          $or: [
            { githubId: profile.id },
            ...(email ? [{ email }] : []),
          ],
        })

        if (user) {
          if (!user.githubId) { user.githubId = profile.id; await user.save() }
        } else {
          user = await User.create({
            name:     profile.displayName || profile.username,
            email:    email || `github_${profile.id}@noemail.com`,
            githubId: profile.id,
            avatar,
            role:     'customer',
            cafeId:   process.env.DEFAULT_CAFE_ID,
          })
        }

        return done(null, user)
      } catch (err) {
        return done(err, null)
      }
    }
  ))
}