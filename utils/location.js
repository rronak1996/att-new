/**
 * Calculate the distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters

    const toRad = (deg) => deg * (Math.PI / 180);

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

/**
 * Check if a location is within allowed radius of classroom
 * @param {number} studentLat - Student's latitude
 * @param {number} studentLng - Student's longitude
 * @param {number} classroomLat - Classroom latitude
 * @param {number} classroomLng - Classroom longitude
 * @param {number} allowedRadius - Allowed radius in meters
 * @returns {object} { isValid: boolean, distance: number }
 */
function validateLocation(studentLat, studentLng, classroomLat, classroomLng, allowedRadius) {
    const distance = calculateDistance(studentLat, studentLng, classroomLat, classroomLng);
    return {
        isValid: distance <= allowedRadius,
        distance: Math.round(distance)
    };
}

module.exports = { calculateDistance, validateLocation };
