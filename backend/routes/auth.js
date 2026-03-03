// routes/auth.js - Authentication Routes (Virtual Identity)
// Implements user registration, login, logout, and session check.
// Virtual Identity is established via JWT stored in HTTP-only cookies:
//   - HTTP-only: JavaScript cannot access the cookie (XSS protection)
//   - SameSite: prevents cross-site request forgery (CSRF protection)
//   - Secure: transmitted over HTTPS only in production
// Alternative considered: localStorage-based tokens are simpler but expose
// tokens to XSS attacks. HTTP-only cookies are the more secure approach.
// Reference: https://owasp.org/www-community/HttpOnly - OWASP HTTP-only cookies

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const gameEvents = require('../events/gameEvents');

/** Shared cookie config - centralised so options are consistent across routes */
const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
    httpOnly: true,                      // No JS access (XSS protection)
    secure: isProduction,                // HTTPS only in production
    // 'none' is required for cross-site cookies (Vercel → Render). Must pair with secure:true.
    // Falls back to 'lax' in local dev where both origins are localhost.
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,        // 24-hour session
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username?.trim() || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        if (username.trim().length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existing = await User.findByUsername(username.trim());
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        const user = await User.create(username.trim(), password);

        // Sign a JWT containing the user's identity payload
        const token = jwt.sign(
            { userId: user._id.toString(), username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, COOKIE_OPTIONS);
        gameEvents.emit('userRegistered', { username: user.username });
        res.status(201).json({ message: 'Account created successfully', username: user.username });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findByUsername(username.trim());
        // Deliberate vague error: don't reveal whether the username exists
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // bcrypt.compare handles timing-safe comparison to prevent timing attacks
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id.toString(), username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, COOKIE_OPTIONS);
        res.json({ message: 'Login successful', username: user.username });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// POST /api/auth/logout - Destroys the session by clearing the cookie
router.post('/logout', (req, res) => {
    res.clearCookie('token', COOKIE_OPTIONS);
    res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me - Returns current user from cookie (used by frontend on load)
router.get('/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ user: null });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ user: { userId: decoded.userId, username: decoded.username } });
    } catch {
        res.clearCookie('token', COOKIE_OPTIONS);
        res.json({ user: null });
    }
});

module.exports = router;
