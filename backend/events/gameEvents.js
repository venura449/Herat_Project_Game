// events/gameEvents.js - Game Event System (Event-Driven Programming)
// Node.js built-in EventEmitter implements the Observer/Publish-Subscribe pattern.
// Demonstrates Low Coupling: game logic (routes) emits events without knowing
// who listens. Listeners can be added/removed without modifying the emitting code.
// Alternative approach: a message broker (e.g., Redis Pub/Sub) would be used for
// distributed, multi-process systems. EventEmitter is ideal for single-process apps.
// Reference: https://nodejs.org/api/events.html - Node.js Events documentation

const { EventEmitter } = require('events');

// Subclass EventEmitter to create a domain-specific event bus for the game
class GameEventEmitter extends EventEmitter { }

const gameEvents = new GameEventEmitter();

// ── Event Listeners (Subscribers) ──────────────────────────────────────────
// These react to events without the game logic needing to call them directly.
// This separation means logging/analytics can change without touching game code.

gameEvents.on('userRegistered', ({ username }) => {
    console.log(`[Event] New player registered: ${username}`);
});

gameEvents.on('questionFetched', ({ username }) => {
    console.log(`[Event] Question fetched for: ${username}`);
});

gameEvents.on('answerSubmitted', ({ username, correct, timeTaken }) => {
    const status = correct ? '✓ CORRECT' : '✗ WRONG';
    console.log(`[Event] ${username} answered ${status} in ${timeTaken}s`);
});

gameEvents.on('scoreRecorded', ({ username, score }) => {
    console.log(`[Event] Score recorded - ${username}: ${score} points`);
});

// ── Competition Events ──────────────────────────────────────────────────────
gameEvents.on('competitionCreated', ({ username, code, mode }) => {
    console.log(`[Event] Competition created by ${username}: code=${code} mode=${mode}`);
});

gameEvents.on('competitionJoined', ({ username, code }) => {
    console.log(`[Event] ${username} joined competition ${code}`);
});

gameEvents.on('competitionStarted', ({ username, code }) => {
    console.log(`[Event] Competition ${code} started by ${username}`);
});

gameEvents.on('competitionScoreSubmitted', ({ username, code, score }) => {
    console.log(`[Event] ${username} submitted ${score}pts to competition ${code}`);
});

module.exports = gameEvents;
