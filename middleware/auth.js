const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'qr-attendance-secret-key-change-in-production';

/**
 * Middleware to verify JWT token and attach teacher to request
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.teacher = decoded;
        next();
    });
}

/**
 * Generate JWT token for teacher
 */
function generateToken(teacher) {
    return jwt.sign(
        { id: teacher.id, username: teacher.username, name: teacher.name },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

module.exports = { authenticateToken, generateToken, JWT_SECRET };
