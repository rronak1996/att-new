const express = require('express');
const router = express.Router();
const db = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const { validateLocation } = require('../utils/location');

/**
 * POST /api/attendance/mark
 * Mark attendance for a student (public endpoint)
 */
router.post('/mark', (req, res) => {
    try {
        const { token, studentName, rollNumber, latitude, longitude } = req.body;

        // Validate required fields
        if (!token || !studentName || !rollNumber) {
            return res.status(400).json({
                error: 'Token, student name, and roll number are required'
            });
        }

        // Find lecture by QR token
        const lecture = db.getLectureByToken(token);

        if (!lecture) {
            return res.status(404).json({ error: 'Invalid QR code' });
        }

        // Check if QR code has expired
        const now = new Date();
        const expiresAt = new Date(lecture.qr_expires_at);

        if (expiresAt <= now) {
            return res.status(410).json({ error: 'QR code has expired. Please ask your teacher to generate a new one.' });
        }

        // Check if student already marked attendance
        const normalizedRoll = rollNumber.trim().toUpperCase();
        const existingAttendance = db.getAttendanceByLectureAndRoll(lecture.id, normalizedRoll);

        if (existingAttendance) {
            return res.status(409).json({ error: 'Attendance already marked for this roll number' });
        }

        // Validate location if provided
        let locationStatus = 'unavailable';
        let studentLat = null;
        let studentLng = null;

        if (latitude !== undefined && longitude !== undefined) {
            studentLat = latitude;
            studentLng = longitude;

            const locationCheck = validateLocation(
                latitude,
                longitude,
                lecture.classroom_lat,
                lecture.classroom_lng,
                lecture.allowed_radius
            );

            if (locationCheck.isValid) {
                locationStatus = 'verified';
            } else {
                locationStatus = 'rejected';
                return res.status(403).json({
                    error: `Location mismatch. You are ${locationCheck.distance} meters away from the classroom. Maximum allowed: ${lecture.allowed_radius} meters.`
                });
            }
        } else {
            // Location not provided - reject attendance
            return res.status(400).json({
                error: 'Location permission is required to mark attendance. Please enable GPS and try again.'
            });
        }

        // Create attendance record
        const attendance = db.createAttendance({
            lecture_id: lecture.id,
            student_name: studentName.trim(),
            roll_number: normalizedRoll,
            location_lat: studentLat,
            location_lng: studentLng,
            location_status: locationStatus
        });

        res.status(201).json({
            message: 'Attendance marked successfully!',
            attendance: {
                id: attendance.id,
                studentName: attendance.student_name,
                rollNumber: attendance.roll_number,
                locationStatus: attendance.location_status,
                markedAt: attendance.marked_at
            }
        });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ error: 'Server error while marking attendance' });
    }
});

/**
 * GET /api/attendance/lectures/:id/attendance
 * Get attendance records for a lecture (teacher only)
 */
router.get('/lectures/:id/attendance', authenticateToken, (req, res) => {
    try {
        const lectureId = parseInt(req.params.id);
        const lecture = db.getLectureById(lectureId);

        if (!lecture || lecture.teacher_id !== req.teacher.id) {
            return res.status(404).json({ error: 'Lecture not found' });
        }

        // Get attendance records
        const attendance = db.getAttendanceByLecture(lectureId);

        res.json({
            lecture: {
                id: lecture.id,
                subject: lecture.subject,
                date: lecture.date,
                lectureNumber: lecture.lecture_number
            },
            totalStudents: attendance.length,
            attendance
        });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/attendance/lectures/:id/attendance/export
 * Export attendance as CSV (teacher only)
 */
router.get('/lectures/:id/attendance/export', authenticateToken, (req, res) => {
    try {
        const lectureId = parseInt(req.params.id);
        const lecture = db.getLectureById(lectureId);

        if (!lecture || lecture.teacher_id !== req.teacher.id) {
            return res.status(404).json({ error: 'Lecture not found' });
        }

        // Get attendance records
        const attendance = db.getAttendanceByLecture(lectureId);

        // Generate CSV
        const csvHeader = 'Roll Number,Student Name,Time,Location Status\n';
        const csvRows = attendance.map(a =>
            `"${a.roll_number}","${a.student_name}","${new Date(a.marked_at).toLocaleString()}","${a.location_status}"`
        ).join('\n');

        const csv = csvHeader + csvRows;
        const filename = `attendance_${lecture.subject}_${lecture.date}_lecture${lecture.lecture_number}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (error) {
        console.error('Export attendance error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/attendance/verify-token/:token
 * Verify if a QR token is valid (public endpoint for students)
 */
router.get('/verify-token/:token', (req, res) => {
    try {
        const lecture = db.getLectureByToken(req.params.token);

        if (!lecture) {
            return res.status(404).json({ valid: false, error: 'Invalid QR code' });
        }

        const now = new Date();
        const expiresAt = new Date(lecture.qr_expires_at);

        if (expiresAt <= now) {
            return res.status(410).json({ valid: false, error: 'QR code has expired' });
        }

        res.json({
            valid: true,
            lecture: {
                subject: lecture.subject,
                date: lecture.date,
                lectureNumber: lecture.lecture_number
            },
            remainingSeconds: Math.floor((expiresAt - now) / 1000)
        });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ valid: false, error: 'Server error' });
    }
});

module.exports = router;
