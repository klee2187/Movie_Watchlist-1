const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const keys = require('./keys');
const mongodb = require('../db/connect');
 
// Serialize user - store user ID in session
passport.serializeUser((user, done) => {
 done(null, user._id.toString());
});
 
// Deserialize user - retrieve full user object from database using ID
passport.deserializeUser(async (id, done) => {
 try {
   const { ObjectId } = require('mongodb');
   const db = mongodb.getDb();
   const user = await db
     .collection('users')
     .findOne({ _id: new ObjectId(id) });
   done(null, user);
 } catch (err) {
   done(err, null);
 }
});
 
// Configure Google OAuth Strategy
passport.use(
 new GoogleStrategy(
   {
     clientID: keys.google.GOOGLE_CLIENT_ID,
     clientSecret: keys.google.GOOGLE_CLIENT_SECRET,
     callbackURL: keys.google.CALLBACK_URL,
     proxy: true, // Required for Render deployment
   },
   async (accessToken, refreshToken, profile, done) => {
     try {
       console.log('Google profile received:', profile.id);
 
       const db = mongodb.getDb();
 
       // Check if user already exists in database
       let user = await db
         .collection('users')
         .findOne({ googleId: profile.id });
 
       if (user) {
         // User exists - update last login or return user
         console.log('Existing user found:', user.email);
         return done(null, user);
       } else {
         // Create new user in database
         console.log('Creating new user from Google profile');
 
         // Format date as MM/DD/YYYY
         const today = new Date();
         const formattedDate = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
 
         // Parse name from Google profile
         const firstName = profile.name.givenName || '';
         const lastName = profile.name.familyName || '';
         const displayName =
           profile.displayName || `${firstName} ${lastName}`.trim();
 
         const newUser = {
           googleId: profile.id,
           displayName: displayName,
           firstName: firstName,
           lastName: lastName,
           email:
             profile.emails && profile.emails[0]
               ? profile.emails[0].value
               : '',
           date: formattedDate,
           profilePhoto:
             profile.photos && profile.photos[0]
               ? profile.photos[0].value
               : null,
           createdAt: new Date(),
           lastLogin: formattedDate,
         };
 
         const result = await db.collection('users').insertOne(newUser);
 
         // Get the created user with _id
         const createdUser = await db
           .collection('users')
           .findOne({ _id: result.insertedId });
 
         console.log('New user created:', createdUser.email);
         return done(null, createdUser);
       }
     } catch (err) {
       console.error('Error in Google Strategy:', err);
       return done(err, null);
     }
   },
 ),
);
 
module.exports = passport;