/**
 * Configuration constants for the Marblebots simulator.
 * All distance measurements are in meters, angles in radians, and speeds in meters/second.
 */

/** Physical dimensions of each MarbleBot (in meters) */
export const ROBOT_RADIUS = 0.03 / 2;

/**
 * UWB (Ultra-Wideband) Sensor Configuration
 * Used for long-range detection and formation control
 */
export const UWB_MIN_SENSING_RADIUS = 0.03;    // Minimum detection range (m)
export const UWB_MAX_SENSING_RADIUS = 20.0;   // Maximum detection range (m)
export const UWB_PRECISION = 0.1;             // Base precision value

/**
 * Dynamic sensor error values that can be updated via UI sliders
 * These represent the maximum error range for sensor measurements
 */
let _uwbAngularPrecision = Math.PI / 180;  // Default angular error for UWB (rad)
let _uwbRadialPrecision = 0.01;          // Default radial error for UWB (m)
let _irAngularPrecision = Math.PI / 180;    // Default angular error for IR (rad)
let _irRadialPrecision = 0.01;              // Default radial error for IR (m)

export const getUWBAngularPrecision = () => _uwbAngularPrecision;
export const getUWBRadialPrecision = () => _uwbRadialPrecision;
export const getIRAngularPrecision = () => _irAngularPrecision;
export const getIRRadialPrecision = () => _irRadialPrecision;
export const setUWBAngularPrecision = (value) => { _uwbAngularPrecision = value; };
export const setUWBRadialPrecision = (value) => { _uwbRadialPrecision = value; };
export const setIRAngularPrecision = (value) => { _irAngularPrecision = value; };
export const setIRRadialPrecision = (value) => { _irRadialPrecision = value; };

/**
 * IR (Infrared) Sensor Configuration
 * Used for close-range detection and collision avoidance
 */
export const IR_MIN_SENSING_RADIUS = 0.01;    // Minimum detection range (m)
export const IR_MAX_SENSING_RADIUS = 0.32;    // Maximum detection range (m)
export const IR_PRECISION = 0.0001;           // Base precision value

/** Movement constraints */
export const MAX_SPEED_M_S = 0.3;           // Maximum linear speed (m/s)
export const MIN_SPEED_M_S = 0.01;           // Minimum linear speed (m/s)
export const MAX_ROT_SPEED_RAD_S = 2 * Math.PI;  // Maximum rotational speed (rad/s)

/** Visualization parameters */
export const ZOOM = 0.8;                     // Default zoom level
export const ARENA_SIZE = 1.0;               // Size of the arena (m)
export const COL_MIN = 100;                  // Minimum color value for robots
export const COL_MAX = 170;                  // Maximum color value for robots
