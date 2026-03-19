const { ObjectId } = require('mongodb');
const mongodb = require('../db/connect');

// To GET all watchlist items
const getUserWatchlist = async (req, res) => {
  try {
    const watchlistItems = await mongodb
      .getDb()
      .collection('watchlist')
      .aggregate([
        {
          $lookup: {
            from: 'movies',
            let: { movieId: '$movieId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ['$_id', { $toObjectId: '$$movieId' }] },  // Try as ObjectId
                      { $eq: [{ $toString: '$_id' }, '$$movieId'] }     // Try as string
                    ]
                  }
                }
              }
            ],
            as: 'movieDetails'
          }
        },
        { 
          $unwind: { 
            path: '$movieDetails', 
            preserveNullAndEmptyArrays: true 
          } 
        }
      ])
      .toArray();

    res.status(200).json(watchlistItems);
  } catch (err) {
    console.error('Error in getUserWatchlist:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET a single watchlist item by ID
const getWatchlistItemById = async (req, res) => {
  try {
    const watchlistId = req.params.id;
    
    // Convert string ID to ObjectId (watchlist _id is ObjectId)
    const objectId = new ObjectId(watchlistId);
    
    // Find the watchlist item
    const watchlistItem = await mongodb
      .getDb()
      .collection('watchlist')
      .findOne({ _id: objectId });
    
    if (!watchlistItem) {
      return res.status(404).json({ message: 'Watchlist item not found' });
    }
    
    // Get movie details - try both string and ObjectId
    let movie = null;
    
    // Try as string first (watchlist stores movieId as string)
    movie = await mongodb
      .getDb()
      .collection('movies')
      .findOne({ _id: watchlistItem.movieId });
    
    // If not found, try as ObjectId (movies might store _id as ObjectId)
    if (!movie) {
      try {
        const movieObjectId = new ObjectId(watchlistItem.movieId);
        movie = await mongodb
          .getDb()
          .collection('movies')
          .findOne({ _id: movieObjectId });
      } catch (e) {
        // Ignore conversion error
      }
    }
    
    // Combine the data
    const result = {
      ...watchlistItem,
      movieDetails: movie || null
    };
    
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in getWatchlistItemById:', err);
    res.status(500).json({ message: err.message });
  }
};

// Use POST to create a watchlist item - FIXED
const addToWatchlist = async (req, res) => {
  try {
    const userId = req.body.userId;
    const movieId = req.body.movieId;

    console.log('Looking for movie with ID:', movieId);
    console.log('ID type:', typeof movieId);
    
    // Check if movie exists - try both string and ObjectId
    let movie = null;
    
    // First try as string
    movie = await mongodb
      .getDb()
      .collection('movies')
      .findOne({ _id: movieId });
    
    console.log('Movie found as string?', movie ? 'Yes' : 'No');
    
    // If not found, try as ObjectId
    if (!movie) {
      try {
        const movieObjectId = new ObjectId(movieId);
        console.log('Trying as ObjectId:', movieObjectId);
        movie = await mongodb
          .getDb()
          .collection('movies')
          .findOne({ _id: movieObjectId });
        console.log('Movie found as ObjectId?', movie ? 'Yes' : 'No');
      } catch (e) {
        console.log('Invalid ObjectId format:', e.message);
      }
    }

    if (!movie) {
      return res.status(404).json({ 
        message: 'Movie not found',
        debug: { 
          movieId: movieId,
          message: 'Movie does not exist in database'
        }
      });
    } 
    
    console.log('Movie found:', movie.title);
    
    // Check if already in watchlist
    const existing = await mongodb
      .getDb()
      .collection('watchlist')
      .findOne({ userId: userId, movieId: movieId });
    
    if (existing) {
      return res.status(409).json({ 
        message: 'Movie already in watchlist' 
      });
    }
    
    // Create watchlist item matching your data structure
    const watchlistItem = {
      userId: userId,                    // string
      movieId: movieId,                   // string (keep as string to match existing data)
      addedDate: req.body.addedDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      status: req.body.status || 'plan-to-watch',
      userRating: req.body.userRating !== undefined && req.body.userRating !== null && req.body.userRating !== "null"
        ? req.body.userRating.toString()  // store as string "5" not number 5
        : "null",                          // store "null" as string
      reviewText: req.body.reviewText || '',
      startedWatching: req.body.startedWatching || null,
      completedWatching: req.body.completedDate || req.body.completedWatching || null,
      rewatchCount: req.body.rewatchCount || 0,  // number
    };

    // Validation
    if (!watchlistItem.movieId || !watchlistItem.userId) {
      return res.status(400).json({ message: 'Movie ID and User ID are required' });
    }

    const validStatuses = ['plan-to-watch', 'watching', 'completed'];
    if (!validStatuses.includes(watchlistItem.status)) {
      return res.status(400).json({ 
        message: 'Status must be one of: plan-to-watch, watching, completed' 
      });
    }

    // Validate userRating (handle "null" string and convert for validation)
    if (watchlistItem.userRating !== "null") {
      const ratingNum = Number(watchlistItem.userRating);
      if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        return res.status(400).json({ 
          message: 'User rating must be between 0 and 5' 
        });
      }
    }

    if (watchlistItem.rewatchCount < 0) {
      return res.status(400).json({ 
        message: 'Rewatch count cannot be negative' 
      });
    }

    const response = await mongodb
      .getDb()
      .collection('watchlist')
      .insertOne(watchlistItem);

    res.status(201).json({
      message: 'Movie added to watchlist successfully',
      id: response.insertedId,
    });
  } catch (err) {
    console.error('Error in addToWatchlist:', err);
    res.status(500).json({ message: err.message });
  }
};

// Use PUT to update a watchlist item
const updateWatchlistItem = async (req, res) => {
  try {
    const watchlistId = req.params.id;
    const userId = req.body.userId || null;

    // Convert to ObjectId for query (watchlist _id is ObjectId)
    const objectId = new ObjectId(watchlistId);
    
    // Build query
    const query = { _id: objectId };
    if (userId) {
      query.userId = userId;
    }

    // Check if item exists and belongs to user
    const existingItem = await mongodb
      .getDb()
      .collection('watchlist')
      .findOne(query);
      
    if (!existingItem) {
      return res.status(404).json({ 
        message: 'Watchlist item not found or does not belong to you' 
      });
    }

    const updateData = {};

    if (req.body.status) {
      const validStatuses = ['plan-to-watch', 'watching', 'completed'];
      if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({ 
          message: 'Status must be one of: plan-to-watch, watching, completed' 
        });
      }
      updateData.status = req.body.status;
    } 
    
    if (req.body.userRating !== undefined) {
      // Store as string to match existing data
      const userRating = req.body.userRating !== null && req.body.userRating !== "null" 
        ? req.body.userRating.toString() 
        : "null";
      
      // Validate as number
      if (userRating !== "null") {
        const ratingNum = Number(userRating);
        if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
          return res.status(400).json({ 
            message: 'User rating must be between 0 and 5' 
          });
        }
      }
      updateData.userRating = userRating;
    }

    if (req.body.reviewText !== undefined) {
      updateData.reviewText = req.body.reviewText;
    }

    if (req.body.startedWatching !== undefined) {
      updateData.startedWatching = req.body.startedWatching;
    }

    if (req.body.completedDate !== undefined || req.body.completedWatching !== undefined) {
      updateData.completedWatching = req.body.completedDate || req.body.completedWatching;
    }

    if (req.body.rewatchCount !== undefined) {
      const rewatchCount = Number(req.body.rewatchCount);
      if (rewatchCount < 0) {
        return res.status(400).json({ 
          message: 'Rewatch count cannot be negative' 
        });
      }
      updateData.rewatchCount = rewatchCount;
    }

    // Only proceed if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const response = await mongodb
      .getDb()
      .collection('watchlist')
      .updateOne(query, { $set: updateData });

    if (response.modifiedCount === 0) {
      return res
        .status(200)
        .json({ message: 'Watchlist item is already up to date' });
    }

    res.status(200).json({ message: 'Watchlist item updated successfully' });
  } catch (err) {
    console.error('Error in updateWatchlistItem:', err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE watchlist item
const deleteWatchlistItem = async (req, res) => {
  try {
    const watchlistId = req.params.id;
    const userId = req.userId?.id || req.body?.userId || null;

    // Convert to ObjectId for query (watchlist _id is ObjectId)
    const objectId = new ObjectId(watchlistId);
    
    // Build query
    const query = { _id: objectId };
    if (userId) {
      query.userId = userId;
    }

    const response = await mongodb
      .getDb()
      .collection('watchlist')
      .deleteOne(query);

    if (response.deletedCount === 0) {
      res.status(404).json({ 
        message: 'Watchlist item not found or does not belong to you' 
      });
    } else {
      res.status(200).json({ message: 'Watchlist item removed successfully' });
    }
  } catch (err) {
    console.error('Error in deleteWatchlistItem:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getUserWatchlist,
  getWatchlistItemById,
  addToWatchlist,
  updateWatchlistItem,
  deleteWatchlistItem,
};