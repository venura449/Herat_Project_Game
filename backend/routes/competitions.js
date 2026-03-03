// routes/competitions.js - Competition routes
// Demonstrates Event-Driven Programming: competition status changes (created, joined,
// started, completed) emit events to the game event bus.
// Demonstrates Virtual Identity: all mutating routes require JWT authentication.
// Demonstrates Interoperability: competition data is stored in MongoDB and served
// as JSON to the React frontend via REST.
// Demonstrates Low Coupling: competition logic is fully isolated from game
// and auth logic in separate route modules.

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Competition = require('../models/Competition');
const gameEvents = require('../events/gameEvents');

const VALID_MODES = ['classic', 'blitz', 'survival'];
const VALID_QUESTION_COUNTS = [5, 10, 15, 20];

// POST /api/competitions - Create a new competition
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, mode, maxQuestions } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: 'Competition name is required' });
        }
        if (!VALID_MODES.includes(mode)) {
            return res.status(400).json({ error: 'Invalid game mode' });
        }
        if (!VALID_QUESTION_COUNTS.includes(Number(maxQuestions))) {
            return res.status(400).json({ error: 'maxQuestions must be 5, 10, 15 or 20' });
        }

        const comp = await Competition.create(
            name.trim(),
            mode,
            Number(maxQuestions),
            req.user.userId,
            req.user.username
        );

        gameEvents.emit('competitionCreated', { username: req.user.username, code: comp.code, mode });
        res.status(201).json(comp);
    } catch (err) {
        console.error('Create competition error:', err);
        res.status(500).json({ error: 'Failed to create competition' });
    }
});

// GET /api/competitions/:code - Get competition info (joining page + live standings)
router.get('/:code', authMiddleware, async (req, res) => {
    try {
        const comp = await Competition.findByCode(req.params.code);
        if (!comp) return res.status(404).json({ error: 'Competition not found. Check the code.' });
        res.json(comp);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch competition' });
    }
});

// POST /api/competitions/:code/join - Join a competition
router.post('/:code/join', authMiddleware, async (req, res) => {
    try {
        const comp = await Competition.findByCode(req.params.code);
        if (!comp) return res.status(404).json({ error: 'Competition not found' });
        if (comp.status === 'active') {
            // Late join is allowed - they can still play
        }

        const updated = await Competition.join(req.params.code, req.user.userId, req.user.username);
        gameEvents.emit('competitionJoined', { username: req.user.username, code: req.params.code });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to join competition' });
    }
});

// POST /api/competitions/:code/start - Start the competition (creator only)
router.post('/:code/start', authMiddleware, async (req, res) => {
    try {
        const started = await Competition.start(req.params.code, req.user.userId);
        if (!started) {
            return res.status(403).json({ error: 'Only the creator can start, or it is already active.' });
        }
        gameEvents.emit('competitionStarted', { username: req.user.username, code: req.params.code });
        const comp = await Competition.findByCode(req.params.code);
        res.json(comp);
    } catch (err) {
        res.status(500).json({ error: 'Failed to start competition' });
    }
});

// POST /api/competitions/:code/submit - Submit final score for this competition
router.post('/:code/submit', authMiddleware, async (req, res) => {
    try {
        const { score, questionsAnswered } = req.body;

        if (typeof score !== 'number' || score < 0) {
            return res.status(400).json({ error: 'Invalid score' });
        }

        const comp = await Competition.findByCode(req.params.code);
        if (!comp) return res.status(404).json({ error: 'Competition not found' });

        // Check participant is part of this competition
        const isParticipant = comp.participants.some(p => p.userId === req.user.userId);
        if (!isParticipant) {
            return res.status(403).json({ error: 'You are not a participant of this competition' });
        }

        const updated = await Competition.submitScore(
            req.params.code,
            req.user.userId,
            score,
            questionsAnswered || 0
        );

        gameEvents.emit('competitionScoreSubmitted', {
            username: req.user.username,
            code: req.params.code,
            score,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit competition score' });
    }
});

module.exports = router;
