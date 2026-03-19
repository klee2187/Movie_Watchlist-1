const request = require('supertest');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
const mongodb = require('../db/connect');
const { app, initApp } = require('../server');

let authToken;
let createdMovieId;

// Helper function to create a movie payload
const makeMoviePayload = () => {
    const unique = Date.now() + '-' + Math.floor(Math.random() * 1000000);
    return {
        title: "Nacha Libro" + unique,
        director: "Jared Hess",
        genre: "Comedy",
        releaseDate: "April 25, 2017",
        runtime: "1 hours 32 minutes",
        rating: "PG",
        cast: "Hector Jimenez, Jack Black"
    };
};  

// Initialize the app and get an auth token before running tests
beforeAll(async () => {
    await initApp();

    authToken = jwt.sign(
        { id: 'test-movie-id' },
        process.env.JWT_SECRET || keys.session.SECRET,
        { expiresIn: '1h' }
    );
});

// Close the database connection after all tests are done
afterAll(async () => {
    await mongodb.closeDb();
});

// Test suite for Movies API - Unauthorized access
describe('Movies API - Unauthorized', () => {
    test('GET /movies - returned 401 Unauthorized without token', async () => {
        const res = await request(app).get('/movies');
        expect(res.status).toBe(401);
    });
});

// Test suite for Movies API - CRUD operations
describe('Movies API - CRUD', () => {
    let testPayload; // Shared across tests

    test('POST /movies - created a new movie', async () => {
        testPayload = makeMoviePayload();

        const res = await request(app)
            .post('/movies')
            .set('Authorization', `Bearer ${authToken}`)
            .send(testPayload);

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();

        createdMovieId = res.body.id; 
    });

    test('GET /movies - retrieved all movies', async () => {
        const res = await request(app)
            .get('/movies')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /movies/:id - retrieved the created movie', async () => {
        expect(createdMovieId).toBeDefined();

        const res = await request(app)
            .get('/movies/' + createdMovieId)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
    });

    test('PUT /movies/:id - updated the created movie', async () => {
        const unique = Date.now() + '-' + Math.floor(Math.random() * 1000000);
        expect(createdMovieId).toBeDefined();

        const res = await request(app)
            .put('/movies/' + createdMovieId)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ title: "Nacho Libre" + unique });

        expect(res.status).toBe(200);
    });

    test('DELETE /movies/:id - deleted the created movie', async () => {
        expect(createdMovieId).toBeDefined();

        const res = await request(app)
            .delete('/movies/' + createdMovieId)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
    });
});