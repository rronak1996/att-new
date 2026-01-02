/**
 * Student Attendance JavaScript
 * Handles the student-facing attendance marking functionality
 */

// State
let qrToken = null;
let lectureInfo = null;
let studentLocation = null;
let timerInterval = null;

// ===================================
// Initialization
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    qrToken = urlParams.get('token');

    if (!qrToken) {
        showInvalid('No QR code token found. Please scan a valid QR code from your teacher.');
        return;
    }

    // Verify token and start the process
    verifyAndInit();

    // Handle form submission
    document.getElementById('attendanceForm').addEventListener('submit', handleSubmit);
});

// ===================================
// Token Verification
// ===================================

async function verifyAndInit() {
    showLoading('Verifying QR code...');

    try {
        const data = await AttendanceAPI.verifyToken(qrToken);

        if (!data.valid) {
            showInvalid(data.error || 'Invalid QR code');
            return;
        }

        lectureInfo = data.lecture;
        updateLectureInfo();
        startTimer(data.remainingSeconds);

        // Now get location
        await requestLocation();

    } catch (error) {
        showInvalid(error.message);
    }
}

function updateLectureInfo() {
    document.getElementById('lectureInfo').textContent =
        `${lectureInfo.subject} • ${formatDate(lectureInfo.date)} • Lecture ${lectureInfo.lectureNumber}`;
}

// ===================================
// Timer
// ===================================

function startTimer(seconds) {
    updateTimer(seconds);

    timerInterval = setInterval(() => {
        seconds--;

        if (seconds <= 0) {
            clearInterval(timerInterval);
            showInvalid('QR code has expired. Please ask your teacher to generate a new one.');
            return;
        }

        updateTimer(seconds);
    }, 1000);
}

function updateTimer(seconds) {
    const timerEl = document.getElementById('qrTimer');
    timerEl.textContent = formatTimer(seconds);

    const alertEl = document.getElementById('timerAlert');
    if (seconds <= 60) {
        alertEl.className = 'alert alert-warning mb-lg';
    }
}

// ===================================
// Location
// ===================================

async function requestLocation() {
    showForm();
    updateLocationStatus('pending', 'Requesting location access...');

    try {
        studentLocation = await getCurrentLocation();
        updateLocationStatus('success', `Location acquired (±${Math.round(studentLocation.accuracy)}m accuracy)`);
        enableSubmit();
    } catch (error) {
        updateLocationStatus('error', error.message);
        // Still show form but disable submit
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('submitText').textContent = 'Location required';

        // Show retry button
        showLocationRetry();
    }
}

function updateLocationStatus(status, text) {
    const statusEl = document.getElementById('locationStatus');
    const textEl = document.getElementById('locationText');

    statusEl.className = `location-status ${status}`;
    textEl.textContent = text;
}

function showLocationRetry() {
    const statusEl = document.getElementById('locationStatus');
    statusEl.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    <span id="locationText">Location access denied</span>
    <button type="button" class="btn btn-sm btn-secondary" onclick="retryLocation()" style="margin-left: auto;">
      Retry
    </button>
  `;
}

async function retryLocation() {
    updateLocationStatus('pending', 'Requesting location access...');

    try {
        studentLocation = await getCurrentLocation();
        updateLocationStatus('success', `Location acquired (±${Math.round(studentLocation.accuracy)}m accuracy)`);
        enableSubmit();
    } catch (error) {
        updateLocationStatus('error', error.message);
        showLocationRetry();
    }
}

function enableSubmit() {
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('submitText').textContent = 'Mark Attendance';
}

// ===================================
// Form Submission
// ===================================

async function handleSubmit(e) {
    e.preventDefault();

    const studentName = document.getElementById('studentName').value.trim();
    const rollNumber = document.getElementById('rollNumber').value.trim().toUpperCase();

    if (!studentLocation) {
        showToast('Location is required to mark attendance', 'error');
        return;
    }

    // Disable form
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('submitText').textContent = 'Submitting...';

    try {
        const result = await AttendanceAPI.mark(
            qrToken,
            studentName,
            rollNumber,
            studentLocation.latitude,
            studentLocation.longitude
        );

        // Stop timer
        clearInterval(timerInterval);

        // Show success
        showSuccess(result.attendance);

    } catch (error) {
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitText').textContent = 'Mark Attendance';
        showToast(error.message, 'error');
    }
}

// ===================================
// State Management
// ===================================

function showLoading(text = 'Loading...') {
    hideAllStates();
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingState').classList.remove('hidden');
}

function showInvalid(message) {
    hideAllStates();
    document.getElementById('errorText').textContent = message;
    document.getElementById('invalidState').classList.remove('hidden');
    document.getElementById('lectureInfo').textContent = 'Unable to load lecture';
    clearInterval(timerInterval);
}

function showForm() {
    hideAllStates();
    document.getElementById('formState').classList.remove('hidden');
}

function showSuccess(attendance) {
    hideAllStates();
    document.getElementById('confirmedName').textContent = attendance.studentName;
    document.getElementById('confirmedRoll').textContent = attendance.rollNumber;
    document.getElementById('confirmedTime').textContent = formatTime(attendance.markedAt);
    document.getElementById('successState').classList.remove('hidden');
}

function hideAllStates() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('invalidState').classList.add('hidden');
    document.getElementById('formState').classList.add('hidden');
    document.getElementById('successState').classList.add('hidden');
}
