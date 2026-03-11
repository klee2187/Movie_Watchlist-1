const router = require('express').Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const mongodb = require('../db/connect');
const { ObjectId } = require('mongodb');
const keys = require('../config/keys');
const { isAuthenticated } = require('../middleware/auth');

// @desc    Auth with Google
// @route   GET /auth/google
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  }),
);

// @desc    Google auth callback
// @route   GET /auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login-failed',
    session: true,
  }),
  (req, res) => {
    // Successful authentication
    console.log('Authentication successful, redirecting to home');

    // Create JWT token
    const token = jwt.sign(
      {
        id: req.user._id,
        email: req.user.email,
        displayName: req.user.displayName,
      },
      process.env.JWT_SECRET || keys.session.SECRET,
      { expiresIn: '24h' },
    );

    // Set cookies
    res.cookie('isLoggedIn', 'true', {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: false,
      secure: keys.isProduction,
      sameSite: keys.isProduction ? 'none' : 'lax',
    });

    res.cookie('userName', req.user.displayName, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      secure: keys.isProduction,
      sameSite: keys.isProduction ? 'none' : 'lax',
    });

    res.cookie('userId', req.user._id.toString(), {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      secure: keys.isProduction,
      sameSite: keys.isProduction ? 'none' : 'lax',
    });

    res.cookie('token', token, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: keys.isProduction,
      sameSite: keys.isProduction ? 'none' : 'lax',
    });

    // Redirect to home page
    res.redirect('/');
  },
);

// @desc    Get current logged in user
// @route   GET /auth/me
router.get('/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.status(200).json({
      success: true,
      isAuthenticated: true,
      user: {
        _id: req.user._id,
        displayName: req.user.displayName,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
      },
    });
  } else {
    // Check for JWT token
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || keys.session.SECRET,
        );
        res.status(200).json({
          success: true,
          isAuthenticated: true,
          user: decoded,
        });
      } catch (err) {
        res.status(200).json({
          success: true,
          isAuthenticated: false,
        });
      }
    } else {
      res.status(200).json({
        success: true,
        isAuthenticated: false,
      });
    }
  }
});

// @desc    Logout user
// @route   GET /auth/logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Error logging out' });
    }

    // Clear cookies
    res.clearCookie('isLoggedIn');
    res.clearCookie('userName');
    res.clearCookie('userId');
    res.clearCookie('token');

    // Redirect to home page
    res.redirect('/');
  });
});

// @desc    Login failed page
// @route   GET /login-failed
router.get('/login-failed', (req, res) => {
  res.status(401).send(`
    <html>
      <head>
        <title>Login Failed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #EBEBD3; }
          .container { max-width: 500px; margin: 0 auto; background-color: #083D77; padding: 30px; border-radius: 10px; border: 2px solid #F95738; }
          h1 { color: #F95738; }
          p { color: #EBEBD3; }
          .btn { display: inline-block; padding: 10px 20px; background: #F4D35E; color: #083D77; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
          .btn:hover { background: #EE964B; color: #EBEBD3; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Login Failed</h1>
          <p>Unable to authenticate with Google. Please try again.</p>
          <a href="/" class="btn">Return to Home</a>
        </div>
      </body>
    </html>
  `);
});

// @desc    Verify token
// @route   GET /auth/verify
router.get('/verify', (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || keys.session.SECRET,
    );
    res.status(200).json({
      success: true,
      user: decoded,
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
});

module.exports = router;