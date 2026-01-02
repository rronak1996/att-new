/**
 * Teacher Dashboard JavaScript
 * Handles all teacher-related functionality
 */

// State
let lectures = [];
let currentLectureId = null;
let qrTimerInterval = null;

// ===================================
// Initialization
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!AuthAPI.isAuthenticated()) {
        window.location.href = '/teacher/login.html';
        return;
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Set teacher name
    const teacher = TokenManager.getTeacher();
    if (teacher) {
        document.getElementById('teacherName').textContent = `👋 ${teacher.name}`;
    }

    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();

    // Load lectures
    loadLectures();

    // Handle create lecture form
    document.getElementById('createLectureForm').addEventListener('submit', handleCreateLecture);
});

// ===================================
// Theme Toggle
// ===================================

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// ===================================
// Logout
// ===================================

function handleLogout() {
    AuthAPI.logout();
}

// ===================================
// Load Lectures
// ===================================

async function loadLectures() {
    showLoading('Loading lectures...');

    try {
        const data = await LecturesAPI.getAll();
        lectures = data.lectures;
        renderLectures();
        updateStats();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderLectures() {
    const grid = document.getElementById('lecturesGrid');
    const emptyState = document.getElementById('emptyState');

    if (lectures.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    grid.innerHTML = lectures.map(lecture => {
        const isExpired = new Date(lecture.qr_expires_at) <= new Date();
        const expiryStatus = isExpired
            ? '<span class="badge badge-error">Expired</span>'
            : '<span class="badge badge-success">Active</span>';

        return `
      <div class="lecture-card">
        <div class="lecture-card-header">
          <h3>${escapeHtml(lecture.subject)}</h3>
          <p style="opacity: 0.9; margin: 0;">${formatDate(lecture.date)} • Lecture ${lecture.lecture_number}</p>
        </div>
        <div class="lecture-card-body">
          <div class="flex justify-between items-center mb-md">
            <span class="text-muted">QR Status</span>
            ${expiryStatus}
          </div>
          <div class="flex justify-between items-center mb-md">
            <span class="text-muted">Attendance</span>
            <strong>${lecture.attendance_count || 0} students</strong>
          </div>
          ${lecture.notes ? `<p class="text-muted" style="font-size: 0.875rem; margin: 0;">${escapeHtml(lecture.notes)}</p>` : ''}
        </div>
        <div class="lecture-card-footer">
          <button class="btn btn-primary btn-sm" onclick="viewQR(${lecture.id})">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01"/>
            </svg>
            QR Code
          </button>
          <button class="btn btn-secondary btn-sm" onclick="viewAttendance(${lecture.id})">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Attendance
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteLecture(${lecture.id})" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    }).join('');
}

function updateStats() {
    const now = new Date();
    document.getElementById('totalLectures').textContent = lectures.length;
    document.getElementById('totalAttendance').textContent = lectures.reduce((sum, l) => sum + (l.attendance_count || 0), 0);
    document.getElementById('activeLectures').textContent = lectures.filter(l => new Date(l.qr_expires_at) > now).length;
}

// ===================================
// Create Lecture Modal
// ===================================

function openCreateModal() {
    document.getElementById('createModal').classList.add('active');
}

function closeCreateModal() {
    document.getElementById('createModal').classList.remove('active');
    document.getElementById('createLectureForm').reset();
    document.getElementById('date').valueAsDate = new Date();
}

async function useCurrentLocation() {
    try {
        const location = await getCurrentLocation();
        document.getElementById('classroomLat').value = location.latitude.toFixed(6);
        document.getElementById('classroomLng').value = location.longitude.toFixed(6);
        showToast('Location captured successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleCreateLecture(e) {
    e.preventDefault();

    const lectureData = {
        subject: document.getElementById('subject').value.trim(),
        date: document.getElementById('date').value,
        lectureNumber: parseInt(document.getElementById('lectureNumber').value),
        notes: document.getElementById('notes').value.trim(),
        classroomLat: parseFloat(document.getElementById('classroomLat').value),
        classroomLng: parseFloat(document.getElementById('classroomLng').value),
        allowedRadius: parseInt(document.getElementById('allowedRadius').value) || 100
    };

    showLoading('Creating lecture...');

    try {
        const data = await LecturesAPI.create(lectureData);
        closeCreateModal();
        await loadLectures();
        showToast('Lecture created successfully!', 'success');

        // Show the QR code immediately
        currentLectureId = data.lecture.id;
        showQRCode(data.qrCode, data.expiresIn, data.lecture);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===================================
// QR Code Modal
// ===================================

async function viewQR(lectureId) {
    showLoading('Loading QR code...');
    currentLectureId = lectureId;

    try {
        const data = await LecturesAPI.getById(lectureId);

        if (data.isExpired) {
            showQRExpired(data.lecture);
        } else {
            showQRCode(data.qrCode, data.remainingSeconds, data.lecture);
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

function showQRCode(qrDataUrl, remainingSeconds, lecture) {
    document.getElementById('qrModalTitle').textContent = `${lecture.subject} - Lecture ${lecture.lecture_number}`;
    document.getElementById('qrCodeImg').src = qrDataUrl;
    document.getElementById('qrContainer').classList.remove('hidden');
    document.getElementById('qrExpired').classList.add('hidden');
    document.getElementById('qrModal').classList.add('active');

    startQRTimer(remainingSeconds);
}

function showQRExpired(lecture) {
    document.getElementById('qrModalTitle').textContent = `${lecture.subject} - Lecture ${lecture.lecture_number}`;
    document.getElementById('qrContainer').classList.add('hidden');
    document.getElementById('qrExpired').classList.remove('hidden');
    document.getElementById('qrModal').classList.add('active');
}

function startQRTimer(seconds) {
    clearInterval(qrTimerInterval);

    const timerEl = document.getElementById('qrTimer');
    timerEl.textContent = formatTimer(seconds);
    timerEl.classList.toggle('expiring', seconds <= 60);

    qrTimerInterval = setInterval(() => {
        seconds--;

        if (seconds <= 0) {
            clearInterval(qrTimerInterval);
            document.getElementById('qrContainer').classList.add('hidden');
            document.getElementById('qrExpired').classList.remove('hidden');
            loadLectures(); // Refresh stats
            return;
        }

        timerEl.textContent = formatTimer(seconds);
        timerEl.classList.toggle('expiring', seconds <= 60);
    }, 1000);
}

function closeQRModal() {
    document.getElementById('qrModal').classList.remove('active');
    clearInterval(qrTimerInterval);
}

async function regenerateQR() {
    if (!currentLectureId) return;

    showLoading('Generating new QR code...');

    try {
        const data = await LecturesAPI.regenerateQR(currentLectureId);
        const lecture = lectures.find(l => l.id === currentLectureId);
        showQRCode(data.qrCode, data.expiresIn, lecture);
        await loadLectures();
        showToast('New QR code generated!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===================================
// Attendance Modal
// ===================================

async function viewAttendance(lectureId) {
    showLoading('Loading attendance...');
    currentLectureId = lectureId;

    try {
        const data = await AttendanceAPI.getForLecture(lectureId);
        renderAttendance(data);
        document.getElementById('attendanceModal').classList.add('active');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderAttendance(data) {
    const { lecture, totalStudents, attendance } = data;

    document.getElementById('attendanceModalTitle').textContent =
        `${lecture.subject} - Lecture ${lecture.lectureNumber} (${formatDate(lecture.date)})`;

    const content = document.getElementById('attendanceContent');
    const exportBtn = document.getElementById('exportBtn');

    if (attendance.length === 0) {
        content.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="17" y1="11" x2="23" y2="11"/>
        </svg>
        <h3>No attendance recorded</h3>
        <p>Share the QR code with students to start recording attendance</p>
      </div>
    `;
        exportBtn.disabled = true;
        return;
    }

    exportBtn.disabled = false;

    content.innerHTML = `
    <p class="mb-md"><strong>${totalStudents}</strong> students marked attendance</p>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Roll Number</th>
            <th>Name</th>
            <th>Time</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${attendance.map((a, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${escapeHtml(a.roll_number)}</strong></td>
              <td>${escapeHtml(a.student_name)}</td>
              <td>${formatTime(a.marked_at)}</td>
              <td>
                <span class="badge ${a.location_status === 'verified' ? 'badge-success' : 'badge-error'}">
                  ${a.location_status}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal').classList.remove('active');
}

async function exportAttendance() {
    if (!currentLectureId) return;

    try {
        await AttendanceAPI.exportCSV(currentLectureId);
        showToast('Attendance exported successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ===================================
// Delete Lecture
// ===================================

async function deleteLecture(lectureId) {
    if (!confirm('Are you sure you want to delete this lecture? All attendance records will be lost.')) {
        return;
    }

    showLoading('Deleting lecture...');

    try {
        await LecturesAPI.delete(lectureId);
        await loadLectures();
        showToast('Lecture deleted successfully', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===================================
// Utility Functions
// ===================================

function showLoading(text = 'Loading...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
