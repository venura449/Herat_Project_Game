// routes/game.js - Game Routes (Interoperability with Heart Game API)
// Demonstrates Interoperability: this server acts as a middleware layer between
// the React frontend and the external Heart Game API.
// Protocol used: HTTP REST, Data format: JSON
// Why proxy instead of calling from frontend directly?
//   1. The SOLUTION is kept server-side - clients never receive the answer,
//      preventing cheating by inspecting network traffic.
//   2. CORS restrictions on the external API are bypassed server-side.
// Reference: https://marcconrad.com/uob/heart/doc.php - Heart Game API docs

const express = require('express');
const router = express.Router();
const https = require('https'); // Built-in Node.js HTTPS module for external API calls
const authMiddleware = require('../middleware/auth');
const gameEvents = require('../events/gameEvents');

// In-memory store: maps questionId -> { solution, fetchedAt }
// The solution is NEVER sent to the client - validated server-side only.
const activeQuestions = new Map();

// Periodic cleanup: remove questions older than 5 minutes to prevent memory leaks
setInterval(() => {
    const expiry = Date.now() - 5 * 60 * 1000;
    for (const [id, data] of activeQuestions.entries()) {
        if (data.fetchedAt < expiry) activeQuestions.delete(id);
    }
}, 60 * 1000);

/**
 * Fetches a puzzle question from the Heart Game external API.
 * Interoperability: HTTPS GET request to a third-party REST service.
 * Response format: { "question": "<image_url>", "solution": <digit 0-9> }
 * Source: https://marcconrad.com/uob/heart/api.php
 */
function fetchHeartQuestion() {
    return new Promise((resolve, reject) => {
        const req = https.get('https://marcconrad.com/uob/heart/api.php?out=json', (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; }); // Event: data chunk received
            res.on('end', () => {                           // Event: response complete
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error('Invalid JSON from Heart API'));
                }
            });
        });
        req.on('error', reject); // Event: network error
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Heart API timed out')); });
    });
}

// GET /api/game/question - Fetch a new puzzle (requires authentication)
router.get('/question', authMiddleware, async (req, res) => {
    try {
        const data = await fetchHeartQuestion();

        // Generate a unique ID to track this question server-side
        const questionId = `${req.user.userId}_${Date.now()}`;

        // Store the solution on the server - NEVER in the response to the client
        activeQuestions.set(questionId, {
            solution: data.solution,
            fetchedAt: Date.now(),
        });

        gameEvents.emit('questionFetched', { username: req.user.username });

        // Only the image URL is sent to the client
        res.json({
            questionId,
            imageUrl: data.question,
        });
    } catch (err) {
        console.error('Heart API error:', err.message);
        res.status(502).json({ error: 'Failed to fetch question from Heart API. Please try again.' });
    }
});

// POST /api/game/answer - Submit an answer and receive judgment
router.post('/answer', authMiddleware, (req, res, next) => {
    try {
        const { questionId, answer } = req.body;

        if (answer === undefined || answer === null) {
            return res.status(400).json({ error: 'Answer is required' });
        }

        const questionData = activeQuestions.get(questionId);
        if (!questionData) {
            return res.status(400).json({ error: 'Question not found or expired. Please request a new question.' });
        }

        // Clean up immediately after answering (one attempt per question)
        activeQuestions.delete(questionId);

        const correct = parseInt(answer, 10) === questionData.solution;
        const timeTaken = Math.floor((Date.now() - questionData.fetchedAt) / 1000);

        // Scoring: 100 base points + speed bonus (up to +50 for answers under 25 seconds)
        const speedBonus = correct ? Math.max(0, 50 - timeTaken * 2) : 0;
        const points = correct ? 100 + speedBonus : 0;

        gameEvents.emit('answerSubmitted', { username: req.user.username, correct, timeTaken });

        res.json({ correct, solution: questionData.solution, timeTaken, points });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
