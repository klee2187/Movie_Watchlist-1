const request = require('supertest');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
const mongodb = require('../db/connect');
const { app, initApp } = require('../server');

let authToken;
let createdUserId;

// Helper function to create a user payload
const makeUserPayload = () => {
    return {
        googleId: '123456789012345678903',
        displayName: 'Jan Eyre',
        firstName: 'Jane',
        lastName: 'Eyre',
        email: 'jeyre@example.com',
        createdDate: '03/09/2026'
    };
}; 

// Initialize the app and get an auth token before running tests
beforeAll(async () => {
    await initApp();

    authToken = jwt.sign(
        { id: 'test-user-id', email: 'testuser@example.com' },
        process.env.JWT_SECRET || keys.session.SECRET,
        { expiresIn: '1h' }
    );
});

// Close the database connection after all tests are done
afterAll(async () => {
    await mongodb.closeDb();
});

// Test suite for Users API - Unauthorized access
describe('Users API - Unauthorized', () => {
    test('GET /users - returned 401 Unauthorized without token', async () => {
        const res = await request(app).get('/users');
        expect(res.status).toBe(401);
    });
});

// Test suite for Users API - CRUD operations
describe('Users API - CRUD', () => {
    test('POST /users - created a new user', async () => {
        const payload = makeUserPayload();

        const res = await request(app)
            .post('/users')
            .set('Authorization', `Bearer ${authToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body).toBeDefined();

        createdUserId = res.body.id;
    });

    test('GET /users returned all users', async () => {
        const res = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /users/:id - returned the created user', async () => {
        expect(createdUserId).toBeDefined();

        const res = await request(app)
            .get('/users/' + createdUserId)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
    });

    test('PUT /users/:id - updated the created user', async () => {
        expect(createdUserId).toBeDefined();
        const updatePayload = {
            ...makeUserPayload(),
            displayName: 'Jane Eyre',
        };
        const res = await request(app)
            .put('/users/' + createdUserId)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatePayload);
        expect(res.status).toBe(200);
    });

    test('DELETE /users/:id - deleted the created user', async () => {
        expect(createdUserId).toBeDefined();
        const res = await request(app)
            .delete('/users/' + createdUserId)
            .set('Authorization', `Bearer ${authToken}`);
        expect(res.status).toBe(200);
    });
});
