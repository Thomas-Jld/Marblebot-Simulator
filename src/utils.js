/**
 * Mathematical utility functions for the Marblebots simulator.
 * These functions handle various mathematical operations needed for robot positioning and movement.
 */

/**
 * Finds the minimum value between two numbers while considering their signs.
 * This function is used for determining the shortest path in signed number spaces.
 *
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The "unsigned minimum" between the two numbers
 */
export function unsignedMin(a, b) {
    if (a < 0 && b < 0) return Math.max(a, b);
    if (a < 0 && b >= 0) if (Math.abs(a) > b) return -1*b; else return a;
    if (a >= 0 && b < 0) if (a > Math.abs(b)) return b; else return a;
    return Math.min(a, b);
}


/**
 * Finds the maximum value between two numbers while considering their signs.
 * This function is used for determining the shortest path in signed number spaces.
 *
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The "unsigned maximum" between the two numbers
 */
export function unsignedMax(a, b) {
    if (a < 0 && b < 0) if (Math.abs(a) > Math.abs(b)) return a; else return b;
    if (a < 0 && b >= 0) return b;
    if (a >= 0 && b < 0) return a;
    return Math.max(a, b);
}


/**
 * Implements a proper modulo operation that works with negative numbers.
 * JavaScript's % operator is actually a remainder operator, not a proper modulo.
 *
 * @param {number} n - The number to perform modulo on
 * @param {number} m - The modulo base
 * @returns {number} The proper modulo result
 */
export function mod(n, m) {
    return ((n % m) + m) % m;
}

/**
 * Calculates the signed angular difference between two angles.
 * Returns the shortest angular distance, maintaining sign to indicate direction.
 * Positive means counterclockwise, negative means clockwise.
 *
 * @param {number} a - First angle in radians
 * @param {number} b - Second angle in radians
 * @returns {number} The signed angular difference in radians, in range [-π, π]
 */
export function signedAngleDiff(a, b) {
    return mod(a - b + Math.PI, 2 * Math.PI) - Math.PI;
}

/**
 * Calculates the absolute (unsigned) angular difference between two angles.
 *
 * @param {number} a - First angle in radians
 * @param {number} b - Second angle in radians
 * @returns {number} The absolute angular difference in radians, in range [0, π]
 */
export function unsignedAngleDiff(a, b) {
    return Math.abs(signedAngleDiff(a, b));
}

/**
 * Checks if an angle lies between two other angles.
 * Handles cases where the angular range crosses over the 0/2π boundary.
 *
 * @param {number} angle - The angle to check, in radians
 * @param {number} start - The start of the angular range, in radians
 * @param {number} end - The end of the angular range, in radians
 * @returns {boolean} True if angle is within the range, false otherwise
 */
export function angleIsBetween(angle, start, end) {
    if (start <= end) return angle >= start && angle <= end;
    return angle >= start || angle <= end;
}

/**
 * Adds two vectors in polar coordinates.
 * Used for combining multiple movement vectors in the formation rules.
 *
 * @param {number} r1 - Magnitude of first vector
 * @param {number} phi1 - Angle of first vector in radians
 * @param {number} r2 - Magnitude of second vector
 * @param {number} phi2 - Angle of second vector in radians
 * @returns {Object} Result vector in polar coordinates {r, phi}
 */
export function addPolarVectors(r1, phi1, r2, phi2) {
    return {
        r: Math.sqrt(r1**2 + r2**2 + 2 * r1 * r2 * Math.cos(phi2 - phi1)),
        phi: phi1 + Math.atan2(r2 * Math.sin(phi2 - phi1), r1 + r2 * Math.cos(phi2 - phi1))
    }
}
