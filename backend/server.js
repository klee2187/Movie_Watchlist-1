const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']); 

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
const mongodb = require('./db/connect');
const morgan = require('morgan');
const keys = require('./config/keys');

dotenv.config({ path: './.env' });

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = keys.isProduction;

app.set('trust proxy', 1);

// Session configuration with MongoDB store for production
const sessionConfig = {
  secret: keys.session.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: isProduction, // HTTPS in production
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
  },
};
 
// Use MongoDB to store sessions in production
if (isProduction) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours
  });
}
 
app.use(cookieParser());
app.use(session(sessionConfig));
 
// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
 
// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
 
// CORS configuration
const corsOptions = {
  origin: isProduction
    ? [
        'https://cse341-code-student-1.onrender.com',
        'https://cse341-code-student-1.onrender.com',
      ]
    : ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};
 
app.use(cors(corsOptions));

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', require('./routes/auth'));

// frontend files 
const frontendViewsPath = path.join(__dirname, '../frontend/views');
const frontendCssPath = path.join(__dirname, '../frontend/css');
const frontendJsPath = path.join(__dirname, '../frontend/js');

console.log('Looking for frontend files in:', frontendViewsPath);

// Serve static files from the correct directories
app.use(express.static(frontendViewsPath));
app.use('/css', express.static(frontendCssPath));
app.use('/js', express.static(frontendJsPath));

// Root route - serve frontend HTML
app.get("/", (req, res) => {
    const indexPath = path.join(frontendViewsPath, 'index.html');
    console.log('Attempting to serve:', indexPath);
    res.sendFile(indexPath);
});

// Debug route 
app.get('/debug-watchlist-raw', async (req, res) => {
  try {
    // Check if DB is initialized
    try {
      const db = mongodb.getDb();
    } catch (err) {
      return res.status(500).json({ error: 'Database not initialized yet' });
    }
    
    const db = mongodb.getDb();
    const watchlistItems = await db
      .collection('watchlist')
      .find({})
      .toArray();
    
    const sampleMovie = await db
      .collection('movies')
      .findOne({});
    
    res.json({
      watchlistCount: watchlistItems.length,
      watchlistItems: watchlistItems.map(item => ({
        id: item._id,
        userId: item.userId,
        movieId: item.movieId,
        status: item.status,
        movieIdType: typeof item.movieId
      })),
      sampleMovie: sampleMovie ? {
        id: sampleMovie._id,
        title: sampleMovie.title,
        idType: typeof sampleMovie._id
      } : null
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server - connect to DB FIRST, THEN load routes
mongodb
  .initDb()
  .then(() => {
    console.log('Database connected, now loading routes...');
    
    // Load routes ONLY after DB is connected
    app.use('/', require('./routes/index'));
    
    // 404 handler
    app.use((req, res) => {
        res.status(404).json({ message: 'Route not found' });
    });

    // Error handler
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ message: err.message });
    });
    
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Frontend: http://localhost:${PORT}`);
        console.log(`API endpoints:`);
        console.log(`  - http://localhost:${PORT}/movies`);
        console.log(`  - http://localhost:${PORT}/users`);
        console.log(`  - http://localhost:${PORT}/watchlist`);
        console.log(`  - http://localhost:${PORT}/awards`);
        console.log(`  - http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });