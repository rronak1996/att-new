/**
 * API Helper Functions
 * Centralized API communication for the attendance system
 */

const API_BASE = '/api';

// Token management
const TokenManager = {
    get: () => localStorage.getItem('auth_token'),
    set: (token) => localStorage.setItem('auth_token', token),
    remove: () => localStorage.removeItem('auth_token'),
    getTeacher: () => {
        const data = localStorage.getItem('teacher_data');
        return data ? JSON.parse(data) : null;
    },
    setTeacher: (teacher) => localStorage.setItem('teacher_data', JSON.stringify(teacher)),
    removeTeacher: () => localStorage.removeItem('teacher_data'),
    clear: () => {
        TokenManager.remove();
        TokenManager.removeTeacher();
    }
};

/**
 * Make API request with authentication
 */
async function apiRequest(endpoint, options = {}) {
    const token = TokenManager.get();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        }
    };

    // Add auth token if available
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Convert body to JSON if needed
    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);

        // Handle non-JSON responses (like CSV exports)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/csv')) {
            if (!response.ok) throw new Error('Export failed');
            return { blob: await response.blob(), filename: getFilenameFromResponse(response) };
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP error ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Extract filename from Content-Disposition header
 */
function getFilenameFromResponse(response) {
    const disposition = response.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) return match[1];
    }
    return 'attendance.csv';
}

// ===================================
// Auth API
// ===================================

const AuthAPI = {
    /**
     * Login with username and password
     */
    async login(username, password) {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: { username, password }
        });

        if (data.token) {
            TokenManager.set(data.token);
            TokenManager.setTeacher(data.teacher);
        }

        return data;
    },

    /**
     * Get current teacher info
     */
    async getMe() {
        return apiRequest('/auth/me');
    },

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        return apiRequest('/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword }
        });
    },

    /**
     * Logout - clear local storage
     */
    logout() {
        TokenManager.clear();
        window.location.href = '/teacher/login.html';
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!TokenManager.get();
    }
};

// ===================================
// Lectures API
// ===================================

const LecturesAPI = {
    /**
     * Get all lectures for current teacher
     */
    async getAll() {
        return apiRequest('/lectures');
    },

    /**
     * Get single lecture by ID
     */
    async getById(id) {
        return apiRequest(`/lectures/${id}`);
    },

    /**
     * Create new lecture
     */
    async create(lectureData) {
        return apiRequest('/lectures', {
            method: 'POST',
            body: lectureData
        });
    },

    /**
     * Regenerate QR code for lecture
     */
    async regenerateQR(id) {
        return apiRequest(`/lectures/${id}/regenerate-qr`, {
            method: 'POST'
        });
    },

    /**
     * Delete lecture
     */
    async delete(id) {
        return apiRequest(`/lectures/${id}`, {
            method: 'DELETE'
        });
    }
};

// ===================================
// Attendance API
// ===================================

const AttendanceAPI = {
    /**
     * Mark attendance (for students)
     */
    async mark(token, studentName, rollNumber, latitude, longitude) {
        return apiRequest('/attendance/mark', {
            method: 'POST',
            body: { token, studentName, rollNumber, latitude, longitude }
        });
    },

    /**
     * Verify QR token validity
     */
    async verifyToken(token) {
        return apiRequest(`/attendance/verify-token/${token}`);
    },

    /**
     * Get attendance records for a lecture
     */
    async getForLecture(lectureId) {
        return apiRequest(`/attendance/lectures/${lectureId}/attendance`);
    },

    /**
     * Export attendance as CSV
     */
    async exportCSV(lectureId) {
        const result = await apiRequest(`/attendance/lectures/${lectureId}/attendance/export`);

        // Create download link
        const url = window.URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    }
};

// ===================================
// Utility Functions
// ===================================

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format time for display
 */
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format remaining seconds as MM:SS
 */
function formatTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast alert alert-${type}`;
    toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 3000;
    max-width: 400px;
    animation: slideIn 0.3s ease;
  `;
    toast.innerHTML = message;
    document.body.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => toast.remove(), 5000);
}

/**
 * Get current location from browser
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                let message;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location permission denied. Please enable GPS access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out.';
                        break;
                    default:
                        message = 'An unknown error occurred while getting location.';
                }
                reject(new Error(message));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// Add CSS for toast animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);
