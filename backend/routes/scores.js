// routes/scores.js - Score persistence and leaderboard routes
// Demonstrates separation of concerns: score logic is isolated from auth and game logic.
// Low Coupling: this module depends only on the Score model interface, not the DB directly.

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Score = require('../models/Score');
const gameEvents = require('../events/gameEvents');

// POST /api/scores - Save a completed game session score
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { score, questionsAnswered, gameMode } = req.body;

        if (typeof score !== 'number' || score < 0) {
            return res.status(400).json({ error: 'Invalid score value' });
        }

        const saved = await Score.create(
            req.user.userId,
            req.user.username,
            score,
            questionsAnswered || 0,
            gameMode || 'classic'
        );

        gameEvents.emit('scoreRecorded', { username: req.user.username, score });
        res.status(201).json(saved);
    } catch (err) {
        console.error('Score save error:', err);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

// GET /api/scores/leaderboard - Public leaderboard (no auth required)
// Optional query param: ?mode=classic|blitz|survival|memory (omit for all-modes)
router.get('/leaderboard', async (req, res) => {
    try {
        const VALID_MODES = ['classic', 'blitz', 'survival', 'memory'];
        const mode = VALID_MODES.includes(req.query.mode) ? req.query.mode : null;
        const leaderboard = await Score.getLeaderboard(10, mode);
        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// GET /api/scores/me - Current user's personal score history
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const scores = await Score.getUserScores(req.user.userId);
        res.json(scores);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch your scores' });
    }
});

module.exports = router;
