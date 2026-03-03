// middleware/auth.js - JWT Authentication Middleware
// Demonstrates Low Coupling: route handlers don't need to know HOW authentication works.
// They simply call next() (authenticated) or receive a 401 (unauthenticated).
// Virtual Identity: JWT (JSON Web Token) establishes the digital identity of the requester
// without requiring a server-side session store (stateless authentication).
// Reference: https://jwt.io/ - JWT standard (RFC 7519)

const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT stored in the HTTP-only cookie 'token'.
 * HTTP-only cookies cannot be read by JavaScript, preventing XSS token theft.
 * On success, attaches decoded { userId, username } to req.user.
 */
function authMiddleware(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { userId, username, iat, exp }
        next();
    } catch {
        // Token is expired or tampered - clear the invalid cookie
        res.clearCookie('token');
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
}

module.exports = authMiddleware;
