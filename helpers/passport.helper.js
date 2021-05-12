const passport = require("passport");
const FacebookTokenStrategy = require("passport-facebook-token");
const User = require("../models/User");

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (id, done) {
  //User.findById(id, function (err, user) {
  done(err, user); // will pass user information through req
  //});
});

passport.use(
  new FacebookTokenStrategy(
    {
      clientID: FACEBOOK_APP_ID,
      clientSecret: FACEBOOK_APP_SECRET,
      fbGraphVersion: "v3.0",
    },
    function (accessToken, refreshToken, profile, done) {
      User.findOrCreate(
        {
          facebookId: profile.id,
          name: profile.displayName,
          email: profile.email[0].value,
          avatarUrl: profile.photos[0].value,
        },
        function (error, user) {
          return done(error, user);
        }
      );
    }
  )
);
