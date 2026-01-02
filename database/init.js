const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Database file path
const DB_PATH = path.join(__dirname, 'data.json');

// Default database structure
const defaultData = {
  teachers: [],
  lectures: [],
  attendance: []
};

/**
 * Simple JSON file-based database
 * Works without any native module compilation
 */
class Database {
  constructor() {
    this.data = this.load();
    this.initDefaultTeacher();
  }

  /**
   * Load database from file
   */
  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const content = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Error loading database:', error.message);
    }
    return { ...defaultData };
  }

  /**
   * Save database to file
   */
  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving database:', error.message);
    }
  }

  /**
   * Create default teacher if not exists
   */
  initDefaultTeacher() {
    const existingTeacher = this.data.teachers.find(t => t.username === 'teacher');
    if (!existingTeacher) {
      const passwordHash = bcrypt.hashSync('teacher123', 10);
      this.data.teachers.push({
        id: 1,
        username: 'teacher',
        password_hash: passwordHash,
        name: 'Default Teacher',
        created_at: new Date().toISOString()
      });
      this.save();
      console.log('✅ Default teacher account created (username: teacher, password: teacher123)');
    }
  }

  /**
   * Generate next ID for a collection
   */
  nextId(collection) {
    const items = this.data[collection];
    if (items.length === 0) return 1;
    return Math.max(...items.map(item => item.id)) + 1;
  }

  // ===================================
  // Teachers
  // ===================================

  getTeacherByUsername(username) {
    return this.data.teachers.find(t => t.username === username);
  }

  getTeacherById(id) {
    return this.data.teachers.find(t => t.id === id);
  }

  updateTeacherPassword(id, passwordHash) {
    const teacher = this.getTeacherById(id);
    if (teacher) {
      teacher.password_hash = passwordHash;
      this.save();
      return true;
    }
    return false;
  }

  // ===================================
  // Lectures
  // ===================================

  getLecturesByTeacher(teacherId) {
    return this.data.lectures
      .filter(l => l.teacher_id === teacherId)
      .map(l => ({
        ...l,
        attendance_count: this.data.attendance.filter(a => a.lecture_id === l.id).length
      }))
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.lecture_number - a.lecture_number;
      });
  }

  getLectureById(id) {
    const lecture = this.data.lectures.find(l => l.id === id);
    if (lecture) {
      return {
        ...lecture,
        attendance_count: this.data.attendance.filter(a => a.lecture_id === id).length
      };
    }
    return null;
  }

  getLectureByToken(token) {
    return this.data.lectures.find(l => l.qr_token === token);
  }

  createLecture(lectureData) {
    const lecture = {
      id: this.nextId('lectures'),
      ...lectureData,
      created_at: new Date().toISOString()
    };
    this.data.lectures.push(lecture);
    this.save();
    return lecture;
  }

  updateLectureQR(id, token, expiresAt) {
    const lecture = this.data.lectures.find(l => l.id === id);
    if (lecture) {
      lecture.qr_token = token;
      lecture.qr_expires_at = expiresAt;
      this.save();
      return true;
    }
    return false;
  }

  deleteLecture(id, teacherId) {
    const index = this.data.lectures.findIndex(l => l.id === id && l.teacher_id === teacherId);
    if (index !== -1) {
      this.data.lectures.splice(index, 1);
      // Also delete related attendance
      this.data.attendance = this.data.attendance.filter(a => a.lecture_id !== id);
      this.save();
      return true;
    }
    return false;
  }

  // ===================================
  // Attendance
  // ===================================

  getAttendanceByLecture(lectureId) {
    return this.data.attendance
      .filter(a => a.lecture_id === lectureId)
      .sort((a, b) => new Date(a.marked_at) - new Date(b.marked_at));
  }

  getAttendanceByLectureAndRoll(lectureId, rollNumber) {
    return this.data.attendance.find(
      a => a.lecture_id === lectureId && a.roll_number === rollNumber
    );
  }

  createAttendance(attendanceData) {
    const attendance = {
      id: this.nextId('attendance'),
      ...attendanceData,
      marked_at: new Date().toISOString()
    };
    this.data.attendance.push(attendance);
    this.save();
    return attendance;
  }
}

// Export singleton instance
const db = new Database();
console.log('✅ Database initialized successfully');

module.exports = db;
