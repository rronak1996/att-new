const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const router = express.Router();
const db = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

// QR code expiry time in minutes
const QR_EXPIRY_MINUTES = 5;

/**
 * Generate QR token and expiry time
 */
function generateQRData() {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + QR_EXPIRY_MINUTES * 60 * 1000).toISOString();
    return { token, expiresAt };
}

/**
 * GET /api/lectures
 * Get all lectures for the logged-in teacher
 */
router.get('/', authenticateToken, (req, res) => {
    try {
        const lectures = db.getLecturesByTeacher(req.teacher.id);
        res.json({ lectures });
    } catch (error) {
        console.error('Get lectures error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/lectures
 * Create a new lecture with QR code
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { subject, date, lectureNumber, notes, classroomLat, classroomLng, allowedRadius } = req.body;

        // Validate required fields
        if (!subject || !date || !lectureNumber || classroomLat === undefined || classroomLng === undefined) {
            return res.status(400).json({
                error: 'Subject, date, lecture number, and classroom coordinates are required'
            });
        }

        // Generate QR data
        const { token, expiresAt } = generateQRData();

        // Create lecture
        const lecture = db.createLecture({
            teacher_id: req.teacher.id,
            subject,
            date,
            lecture_number: lectureNumber,
            notes: notes || null,
            qr_token: token,
            qr_expires_at: expiresAt,
            classroom_lat: classroomLat,
            classroom_lng: classroomLng,
            allowed_radius: allowedRadius || 100
        });

        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(
            `${req.protocol}://${req.get('host')}/student/mark.html?token=${token}`,
            { width: 300, margin: 2 }
        );

        res.status(201).json({
            message: 'Lecture created successfully',
            lecture,
            qrCode: qrDataUrl,
            expiresIn: QR_EXPIRY_MINUTES * 60 // seconds
        });
    } catch (error) {
        console.error('Create lecture error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/lectures/:id
 * Get a single lecture by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const lecture = db.getLectureById(parseInt(req.params.id));

        if (!lecture || lecture.teacher_id !== req.teacher.id) {
            return res.status(404).json({ error: 'Lecture not found' });
        }

        // Generate QR code if token exists and not expired
        let qrCode = null;
        const now = new Date();
        const expiresAt = new Date(lecture.qr_expires_at);

        if (lecture.qr_token && expiresAt > now) {
            qrCode = await QRCode.toDataURL(
                `${req.protocol}://${req.get('host')}/student/mark.html?token=${lecture.qr_token}`,
                { width: 300, margin: 2 }
            );
        }

        res.json({
            lecture,
            qrCode,
            isExpired: expiresAt <= now,
            remainingSeconds: Math.max(0, Math.floor((expiresAt - now) / 1000))
        });
    } catch (error) {
        console.error('Get lecture error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/lectures/:id/regenerate-qr
 * Generate a new QR code for an existing lecture
 */
router.post('/:id/regenerate-qr', authenticateToken, async (req, res) => {
    try {
        const lecture = db.getLectureById(parseInt(req.params.id));

        if (!lecture || lecture.teacher_id !== req.teacher.id) {
            return res.status(404).json({ error: 'Lecture not found' });
        }

        // Generate new QR data
        const { token, expiresAt } = generateQRData();

        // Update lecture with new QR
        db.updateLectureQR(parseInt(req.params.id), token, expiresAt);

        // Generate QR code
        const qrDataUrl = await QRCode.toDataURL(
            `${req.protocol}://${req.get('host')}/student/mark.html?token=${token}`,
            { width: 300, margin: 2 }
        );

        res.json({
            message: 'QR code regenerated successfully',
            qrCode: qrDataUrl,
            expiresAt,
            expiresIn: QR_EXPIRY_MINUTES * 60
        });
    } catch (error) {
        console.error('Regenerate QR error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * DELETE /api/lectures/:id
 * Delete a lecture
 */
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const deleted = db.deleteLecture(parseInt(req.params.id), req.teacher.id);

        if (!deleted) {
            return res.status(404).json({ error: 'Lecture not found' });
        }

        res.json({ message: 'Lecture deleted successfully' });
    } catch (error) {
        console.error('Delete lecture error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
