// models/User.js - User data model (High Cohesion: only handles user data operations)
// Demonstrates Low Coupling: routes don't access the DB collection directly,
// they call this model - meaning DB schema can change without touching route files.
// Reference: https://www.npmjs.com/package/bcryptjs - Password hashing library

const { getDB } = require('../db');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

const UserModel = {
    /**
     * Creates a new user. Password is hashed with bcrypt (cost factor 12)
     * before storage - plaintext passwords are NEVER persisted.
     * Virtual Identity: bcrypt salt+hash protects against rainbow table attacks.
     */
    async create(username, password) {
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = {
            username,
            password: hashedPassword,
            createdAt: new Date(),
        };
        const result = await getDB().collection('users').insertOne(user);
        return { ...user, _id: result.insertedId };
    },

    /** Finds a user by username for login authentication */
    async findByUsername(username) {
        return getDB().collection('users').findOne({ username });
    },

    /** Finds a user by their MongoDB ObjectId */
    async findById(id) {
        return getDB().collection('users').findOne({ _id: new ObjectId(id) });
    },
};

module.exports = UserModel;
