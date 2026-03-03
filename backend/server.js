// server.js - Heart Game API Entry Point
// Demonstrates Low Coupling through modular architecture:
//   - db.js        : Database connection concern
//   - models/      : Data access concern
//   - routes/      : HTTP routing concern
//   - middleware/  : Cross-cutting concerns (auth)
//   - events/      : Event-driven side effects
// Each module has ONE responsibility (High Cohesion) and communicates
// through clean interfaces (Low Coupling).

require('dotenv').config(); // Must be first - loads environment variables
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB, getClient } = require('./db');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const scoreRoutes = require('./routes/scores');
const competitionRoutes = require('./routes/competitions');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware Pipeline ────────────────────────────────────────────────────
// Each middleware handles a distinct cross-cutting concern
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // Required to accept cookies from the React frontend
}));
app.use(express.json());
app.use(cookieParser()); // Parses HTTP-only cookies for JWT authentication

// ── Route Modules ─────────────────────────────────────────────────────────
// Routes are mounted under /api/* prefixes for clear API namespacing
app.use('/api/auth', authRoutes);          // Virtual Identity: register, login, logout
app.use('/api/game', gameRoutes);          // Interoperability: Heart API proxy + game logic
app.use('/api/scores', scoreRoutes);       // Score persistence and leaderboard
app.use('/api/competitions', competitionRoutes); // Custom competitions

app.get('/', (req, res) => {
    res.json({ message: 'Heart Game API is running', version: '1.0.0' });
});

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── Server Startup ─────────────────────────────────────────────────────────
app.listen(PORT, async () => {
    try {
        await connectDB();
        console.log(`Server running on http://localhost:${PORT}`);
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
});

// Graceful shutdown: close MongoDB connection before process exits
process.on('SIGINT', async () => {
    await getClient().close();
    console.log('MongoDB disconnected. Server shut down gracefully.');
    process.exit(0);
});
