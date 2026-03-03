// models/Score.js - Score data model (High Cohesion: only handles score data operations)
// Scores are stored separately from users (Low Coupling / Separation of Concerns):
// The leaderboard can be queried without loading any user data.

const { getDB } = require('../db');

const ScoreModel = {
    /**
     * Persists a completed game session score to MongoDB.
     * @param {string} userId - MongoDB ObjectId string of the player
     * @param {string} username - Displayed on leaderboard
     * @param {number} score - Total points accumulated in the session
     * @param {number} questionsAnswered - Total questions attempted
     * @param {string} gameMode - 'classic' | 'blitz' | 'survival'
     */
    async create(userId, username, score, questionsAnswered, gameMode = 'classic') {
        const scoreDoc = {
            userId,
            username,
            score,
            questionsAnswered,
            gameMode,
            createdAt: new Date(),
        };
        await getDB().collection('scores').insertOne(scoreDoc);
        return scoreDoc;
    },

    /** Returns top N scores sorted by score descending, time ascending */
    async getLeaderboard(limit = 10) {
        return getDB()
            .collection('scores')
            .find()
            .sort({ score: -1, createdAt: 1 })
            .limit(limit)
            .toArray();
    },

    /** Returns the most recent scores for a specific user */
    async getUserScores(userId) {
        return getDB()
            .collection('scores')
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray();
    },
};

module.exports = ScoreModel;
