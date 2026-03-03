// db.js - Database connection module (Single Responsibility Principle)
// Demonstrates High Cohesion: this module ONLY manages the MongoDB connection lifecycle.
// Demonstrates Low Coupling: other modules import getDB() without knowing connection details.
// Reference: https://www.mongodb.com/docs/drivers/node/current/ - MongoDB Node.js Driver

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://venura:${process.env.DB_PASSWORD}@cluster0.5eakypg.mongodb.net/?appName=Cluster0`;

// MongoClient uses the Stable API (v1) to prevent breaking changes from MongoDB upgrades
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

let db;

/**
 * Connects to MongoDB Atlas and sets the active database reference.
 * Called once at server startup from server.js.
 */
async function connectDB() {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    db = client.db('heartgame'); // Use the 'heartgame' database
    console.log('Connected to MongoDB Atlas - heartgame database');
}

/** Returns the active database instance for use in models */
function getDB() {
    if (!db) throw new Error('Database not initialised. Call connectDB() first.');
    return db;
}

/** Returns the raw MongoClient for graceful shutdown */
function getClient() {
    return client;
}

module.exports = { connectDB, getDB, getClient };
