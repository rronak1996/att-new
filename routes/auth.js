const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../database/init');
const { generateToken, authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Teacher login with username and password
 */
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find teacher by username
        const teacher = db.getTeacherByUsername(username);

        if (!teacher) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Verify password
        const validPassword = bcrypt.compareSync(password, teacher.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = generateToken(teacher);

        res.json({
            message: 'Login successful',
            token,
            teacher: {
                id: teacher.id,
                username: teacher.username,
                name: teacher.name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

/**
 * GET /api/auth/me
 * Get current logged-in teacher info
 */
router.get('/me', authenticateToken, (req, res) => {
    try {
        const teacher = db.getTeacherById(req.teacher.id);

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        res.json({
            teacher: {
                id: teacher.id,
                username: teacher.username,
                name: teacher.name,
                created_at: teacher.created_at
            }
        });
    } catch (error) {
        console.error('Get teacher error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/auth/change-password
 * Change teacher password
 */
router.post('/change-password', authenticateToken, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Get teacher
        const teacher = db.getTeacherById(req.teacher.id);

        // Verify current password
        if (!bcrypt.compareSync(currentPassword, teacher.password_hash)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        const newHash = bcrypt.hashSync(newPassword, 10);
        db.updateTeacherPassword(req.teacher.id, newHash);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
