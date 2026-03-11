const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
 
// loads environment variables from .env
dotenv.config();
 
let dbInstance;
 
// Initializes and connects to the MongoDB database
const initDb = async () => {
  /* ERROR HANDLING (Prevents creating multiple database
  connections if one already exists  */
  if (dbInstance) {
    console.log('Db is already initialized!');
    return dbInstance;
  }
 
  /* // ERROR HANDLING (configuration error):
  Ensures the MongoDB connection string exists in the environment variables  */
  const uri = process.env.MONGO_URL;
 
  if (!uri) {
    throw new Error('MONGO_URI not defined in .env');
  }
 
  /* ERROR HANDLING (runtime error):
  Attempts to connect to MongoDB and may fail if the server is unreachable  */
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB successfully!');
 
    // Get the database from the connection string
    dbInstance = client.db();
 
    // Error Handling: Test the database connection
    await dbInstance.command({ ping: 1 });
    console.log('MongoDB connection test successful');
    return dbInstance;
 
    /* ERROR HANDLING:
  Catches and logs database connection or initialization errors  */
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    throw err;
  }
};
 
// Returns the active database instance
const getDb = () => {
  /* ERROR HANDLING (application state error):
  Prevents database access before a successful connection is established  */
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb first.');
  }
  return dbInstance;
};
 
module.exports = {
  initDb,
  getDb,
};
 
 