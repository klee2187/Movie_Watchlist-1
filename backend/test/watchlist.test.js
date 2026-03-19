const request = require('supertest');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
const mongodb = require('../db/connect');
const { app, initApp } = require('../server');

let authToken;
let createdWatchlistId;

// Helper function to create a watchlist item payload
const makeWatchlistPayload = () => {
    const unique = Date.now() + '-' + Math.floor(Math.random() * 1000000);
    return {
        userId: "test-user-" + unique,
        movieId: "69a60fe0975615bcb31f46f3",
        addedDate: "03/15/2024",
        status: "plan-to-watch",
        userRating: null,
        reviewText: "Looking forward to watching this sci-fi epic",
        startedWatching: null,
        completedDate: null,
        rewatchCount: 0
    };
};  

// Initialize the app and get an auth token before running tests
beforeAll(async () => {
    await initApp();

    authToken = jwt.sign(
        { id: 'test-watchlist-id' },
        process.env.JWT_SECRET || keys.session.SECRET,
        { expiresIn: '1h' }
    );
});

// Close the database connection after all tests are done
afterAll(async () => {
    await mongodb.closeDb();
});

// Test suite for Watchlist API - Unauthorized access
describe('Watchlist API - Unauthorized', () => {
    test('GET /watchlist - returned 401 Unauthorized without token', async () => {
        const res = await request(app).get('/watchlist');
        expect(res.status).toBe(401);
    });
});

// Test suite for Watchlist API - CRUD operations
describe('Watchlist API - CRUD', () => {
    let testPayload; // Shared across tests

    test('POST /watchlist - created a new watchlist item', async () => {
        testPayload = makeWatchlistPayload();

        const res = await request(app)
            .post('/watchlist')
            .set('Authorization', `Bearer ${authToken}`)
            .send(testPayload);

        expect(res.status).toBe(201);
        expect(res.body).toBeDefined();

        createdWatchlistId = res.body.id;
    });

    test('GET /watchlist returned all watchlist items', async () => {
        const res = await request(app)
            .get('/watchlist')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /watchlist/:id - returned the created watchlist item', async () => {
        expect(createdWatchlistId).toBeDefined();

        const res = await request(app)
            .get('/watchlist/' + createdWatchlistId)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
    });

    test('PUT /watchlist/:id - updated the created watchlist item', async () => {
        expect(createdWatchlistId).toBeDefined();

        const res = await request(app)
            .put('/watchlist/' + createdWatchlistId)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ ...testPayload, status: 'watching' });

        expect(res.status).toBe(200);
    });

    test('DELETE /watchlist/:id - deleted the created watchlist item', async () => {
        expect(createdWatchlistId).toBeDefined();
            
        const res = await request(app)
            .delete('/watchlist/' + createdWatchlistId)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ userId: testPayload.userId }); // Include userId in body for delete
        expect(res.status).toBe(200);
    });
});