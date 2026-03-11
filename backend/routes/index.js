const routes = require('express').Router();
const moviesRoutes = require('./movies');
const userRoutes = require('./users'); 
const watchlistRoutes = require('./watchlist');
const awardsRoutes = require('./awards');
const authRoutes = require('./auth'); 
const { optionalAuth } = require('../middleware/auth'); 

// API routes
routes.use('/movies/', moviesRoutes);
routes.use('/users/', userRoutes);
routes.use('/watchlist/', watchlistRoutes);
routes.use('/awards/', awardsRoutes);
routes.use('/auth', authRoutes); 

// Swagger documentation
routes.use('/api-docs', require('./swagger'));

// Root route
routes.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Movie Watchlist API',
    version: '1.0.0',
    authentication: {
      google: '/auth/google',
      status: req.isAuthenticated ? req.isAuthenticated() : false,
      user: req.user
        ? {
            name: req.user.displayName,
            email: req.user.email,
          }
        : null,
    },
    endpoints: {
      movies: {
        getAll: 'GET /movies',
        getById: 'GET /movies/{id}',
        create: 'POST /movies',
        update: 'PUT /movies/{id}',
        delete: 'DELETE /movies/{id}',
      },
      users: {
        getAll: 'GET /users',
        getById: 'GET /users/{id}',
        create: 'POST /users',
        update: 'PUT /users/{id}',
        delete: 'DELETE /users/{id}',
      },
      watchlist: {
        getAll: 'GET /watchlist',
        getById: 'GET /watchlist/{id}',
        create: 'POST /watchlist',
        update: 'PUT /watchlist/{id}',
        delete: 'DELETE /watchlist/{id}',
      },
      awards: {
        getAll: 'GET /awards',
        getByMovieId: 'GET /awards/movie/{movieId}',
        getById: 'GET /awards/{id}',
        create: 'POST /awards',
        update: 'PUT /awards/{id}',
        delete: 'DELETE /awards/{id}',
      },
      auth: {
        google: 'GET /auth/google',
        logout: 'GET /auth/logout',
        me: 'GET /auth/me',
        users: 'GET /auth/users',
      },
    },
    documentation: '/api-docs',
  });
});

module.exports = routes;