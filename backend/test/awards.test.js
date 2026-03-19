const request = require('supertest');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
const mongodb = require('../db/connect');
const { app, initApp } = require('../server');

let authToken;
let createdAwardId;

// Helper function to create an award payload
const makeAwardPayload = () => {
    return {
        movieId: "69a61005975615bcb31f46f5",
        awardName: "BAFTO",
        category: "Best Actress",
        year: 2016,
        winner: false,
        recipient: "Keira Knightley"
    }
};  

// Initialize the app and get an auth token before running tests
beforeAll(async () => {
    await initApp();

    authToken = jwt.sign(
        { id: 'test-award-id' },
        process.env.JWT_SECRET || keys.session.SECRET,
        { expiresIn: '1h' }
    );
});

// Close the database connection after all tests are done
afterAll(async () => {
    await mongodb.closeDb();
});

// Test suite for Awards API - Unauthorized access
describe('Awards API - Unauthorized', () => {
    test('GET /awards - returned 401 Unauthorized without token', async () => {
        const res = await request(app).get('/awards');
        expect(res.status).toBe(401);
    });
});

// Test suite for Awards API - CRUD operations
describe('Awards API - CRUD', () => {
    let testPayload; // Shared across tests

    test('POST /awards - created a new award', async () => {
        testPayload = makeAwardPayload();

        const res = await request(app)
            .post('/awards')
            .set('Authorization', `Bearer ${authToken}`)
            .send(testPayload);

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();

        createdAwardId = res.body.id;
    });

    test('GET /awards - retrieved all awards', async () => {
        const res = await request(app)
            .get('/awards')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /awards/:id - retrieved the created award', async () => {
        expect(createdAwardId).toBeDefined();

        const res = await request(app)
            .get('/awards/' + createdAwardId)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
        expect(String(res.body._id)).toBe(createdAwardId);
    });

    test('PUT /awards/:id - updated the created award', async () => {
        expect(createdAwardId).toBeDefined();

        const res = await request(app)
            .put('/awards/' + createdAwardId)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ ...testPayload, winner: true });

        expect(res.status).toBe(200);
    });

    test('DELETE /awards/:id - deleted the created award', async () => {
        expect(createdAwardId).toBeDefined();

        const res = await request(app)
            .delete('/awards/' + createdAwardId)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
    });
});
