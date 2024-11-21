/**
 * Movement and formation rules for the Marblebots swarm.
 * This module defines the base Rule class and specific rule implementations
 * that govern how robots move and form patterns.
 */

import { UWB_MIN_SENSING_RADIUS, UWB_MAX_SENSING_RADIUS, IR_MIN_SENSING_RADIUS, IR_MAX_SENSING_RADIUS } from './constants.js';
import { unsignedMin, mod, signedAngleDiff, unsignedAngleDiff, angleIsBetween, addPolarVectors } from './utils.js';

/**
 * Base class for defining movement and formation rules.
 * Each rule specifies conditions for when it applies and how it affects robot movement.
 */
export class Rule {
    /**
     * Creates a new rule for robot movement and formation.
     *
     * @param {string} name - Name of the rule
     * @param {string} measurement_type - Type of sensor measurement ('uwb', 'ir', or '*')
     * @param {string} applies_to - Which robots the rule applies to ('all', 'i-', 'i+', specific index, or offset pattern)
     * @param {string} apply_if - Condition for when the rule should be applied
     * @param {Object} angle_range - Valid angular range for the rule
     * @param {number} angle_range.start - Start angle in radians
     * @param {number} angle_range.end - End angle in radians
     * @param {Object} distance_range - Valid distance range for the rule
     * @param {number} distance_range.start - Minimum distance in meters
     * @param {number} distance_range.end - Maximum distance in meters
     * @param {boolean} [moving_rule=true] - Whether this rule affects robot movement
     * @param {boolean} [includeSelf=false] - Whether the rule can apply to the robot itself
     */
    constructor(name, measurement_type, applies_to, apply_if, angle_range, distance_range, moving_rule = true, includeSelf = false) {
        this.name = name;
        this.measurement_type = measurement_type;
        this.applies_to = applies_to;
        this.apply_if = apply_if;
        this.start_angle = angle_range.start;
        this.end_angle = angle_range.end;
        this.start_distance = distance_range.start;
        this.end_distance = distance_range.end;
        this.includeSelf = includeSelf;
        this.moving_rule = moving_rule;
    }

    /**
     * Checks if this rule applies to a specific pair of robots.
     *
     * @param {number} i - Index of the current robot
     * @param {number} other_i - Index of the other robot
     * @returns {boolean} Whether the rule applies to this pair
     */
    doesApplyTo(i, other_i) {
        return (this.applies_to == 'all'
            || (this.applies_to == other_i && i != other_i && !this.includeSelf)
            || (this.applies_to == i && i == other_i && this.includeSelf)
            || (this.applies_to == 'i-' && other_i <= i)
            || (this.applies_to == 'i+' && other_i >= i)
            || (this.applies_to.startsWith('i-') && other_i == i - parseInt(this.applies_to.split('-')[1]))
            || (this.applies_to.startsWith('i+') && other_i == i + parseInt(this.applies_to.split('+')[1]))
        )
    }

    /**
     * Checks if an angle is within the rule's valid range.
     *
     * @param {number} angle - Angle to check in radians
     * @returns {boolean} Whether the angle is within range
     */
    isWithinAngleRange(angle) {
        return angleIsBetween(angle, this.start_angle, this.end_angle);
    }

    /**
     * Checks if a distance is within the rule's valid range.
     *
     * @param {number} distance - Distance to check in meters
     * @returns {boolean} Whether the distance is within range
     */
    isWithinDistanceRange(distance) {
        return distance >= this.start_distance && distance <= this.end_distance;
    }

    /**
     * Base implementation for applying a rule.
     * This method should be overridden by specific rule implementations.
     *
     * @param {Object} params - The parameters object
     * @param {number} params.i - Index of the current robot
     * @param {number} params.other_i - Index of the other robot being sensed
     * @param {number} params.id_offset - Offset in the formation between the two robots
     * @param {number} params.theta - Theta of the current robot
     * @param {number} params.ir_distance - Distance measured by IR sensor
     * @param {number} params.ir_angle - Angle measured by IR sensor
     * @param {number} params.ir_ref_theta - Reference theta for IR measurement
     * @param {number} params.ir_other_theta - Other robot's theta for IR measurement
     * @param {number} params.uwb_distance - Distance measured by UWB sensor
     * @param {number} params.uwb_angle - Angle measured by UWB sensor
     * @param {number} params.uwb_ref_theta - Reference theta for UWB measurement
     * @param {number} params.uwb_other_theta - Other robot's theta for UWB measurement
     * @param {number} params.other_is_moving - Whether the other robot is moving
     * @param {number} params.swarm_length - Length of the swarm
     * @returns {{delta_position: number, delta_angle: number, applies: boolean}} Movement adjustments to be applied and whether the rule applies
     */
    apply({
        i,
        other_i,
        id_offset,
        theta,
        ir_distance,
        ir_angle,
        ir_ref_theta,
        ir_other_theta,
        uwb_distance,
        uwb_angle,
        uwb_ref_theta,
        uwb_other_theta,
        other_is_moving,
        swarm_length
    }) {
        let delta_position = 0;
        let delta_angle = 0;

        /*
        Override this function to implement your own rule.
        */

        return { delta_position, delta_angle, applies: true };
    }
}

/**
 * Rule that makes the anchor robot (index 0) face north.
 * This provides a reference orientation for the swarm.
 */
export const faceNorth = new Rule(
    'faceNorth',
    '*',
    '0',
    'this.i == 0',
    {start: -2 * Math.PI, end: 2 * Math.PI},
    {start: 0, end: 1000},
    false,
    true
)

/**
 * Rule implementation for facing north.
 * Calculates the angle difference to rotate to 0 radians (north).
 */
faceNorth.apply = ({ theta }) => {
    return { delta_position: 0, delta_angle: signedAngleDiff(0, theta), applies: true };
}

/**
 * Rule that makes robots move away from the anchor using IR sensors.
 * This helps maintain minimum separation between robots.
 */
export const irMoveAwayFromAnchor = new Rule(
    'irMoveAwayFromAnchor',
    'ir',
    '0',
    'this.i !=  othersId[1] && this.i != othersId[othersId.length - 1]',
    {start: -2 * Math.PI, end: 2 * Math.PI},
    {start: IR_MIN_SENSING_RADIUS, end: IR_MAX_SENSING_RADIUS},
    true
)

/**
 * Implementation of IR-based collision avoidance.
 * Moves robots away from the anchor when they get too close.
 */
irMoveAwayFromAnchor.apply = ({ theta, ir_distance, ir_angle, ir_ref_theta }) => {
    const phi = signedAngleDiff(signedAngleDiff(ir_angle + ir_ref_theta, theta), Math.PI);
    const r = (0.05 + IR_MAX_SENSING_RADIUS - ir_distance);
    return { delta_position: r, delta_angle: phi, applies: true };
}

/**
 * Rule for following the previous robot in sequence using UWB.
 */
export const uwbRuleGoToIMinusOne = new Rule(
    'uwbRuleGoToIMinusOne',
    'uwb',
    'i-1',
    'true',
    {start: -2 * Math.PI, end: 2 * Math.PI},
    {start: UWB_MIN_SENSING_RADIUS, end: UWB_MAX_SENSING_RADIUS},
    true
)

/**
 * Implementation of UWB-based following behavior.
 * Maintains a specific distance from the previous robot.
 */
uwbRuleGoToIMinusOne.apply = ({ theta, uwb_distance, uwb_angle, uwb_ref_theta }) => {
    const phi = signedAngleDiff(uwb_angle + uwb_ref_theta, theta);
    const r = (uwb_distance - UWB_MIN_SENSING_RADIUS);
    return { delta_position: r, delta_angle: phi, applies: true };
}

/**
 * Rule for forming a circle using IR sensors.
 * Used for close-range circle formation.
 */
export const irShapeCircle = new Rule(
    'irShapeCircle',
    'ir',
    '0',
    'this.i ==  othersId[1] || this.i == othersId[othersId.length - 1]',
    {start: -2 * Math.PI, end: 2 * Math.PI},
    {start: IR_MIN_SENSING_RADIUS, end: IR_MAX_SENSING_RADIUS },
    true
)

/**
 * Implementation of IR-based circle formation.
 * Positions robots in a circle based on their sequence number.
 */
irShapeCircle.apply = ({ id_offset, theta, ir_distance, ir_angle, ir_ref_theta, ir_other_theta, other_is_moving, swarm_length }) => {

    const polygon_angles = Math.PI / 2 - Math.PI / swarm_length;
    const r1 = ir_distance;
    const phi1 = signedAngleDiff(ir_angle + ir_ref_theta, theta);

    const r2 = 0.2;
    const phi2 = polygon_angles + ir_other_theta - ir_ref_theta;

    let { r, phi } = addPolarVectors(r1, phi1, r2, phi2);

    for (let i = 1; i < id_offset; i++) {
        ({ r, phi } = addPolarVectors(r, phi, r2, polygon_angles - 2 * i * (Math.PI / 2 - polygon_angles) + ir_other_theta - ir_ref_theta));
    }

    return { delta_position: r, delta_angle: phi, applies: r > 0.05 };
}

/**
 * Rule for forming a circle using UWB sensors.
 * Used for long-range circle formation.
 */
export const uwbShapeCircle = new Rule(
    'uwbShapeCircle',
    'uwb',
    '0',
    'true',
    {start: -2 * Math.PI, end: 2 * Math.PI},
    {start: UWB_MIN_SENSING_RADIUS, end: UWB_MAX_SENSING_RADIUS},
    true
)

/**
 * Implementation of UWB-based circle formation.
 * Positions robots in a circle using long-range measurements.
 */
uwbShapeCircle.apply = ({ id_offset, theta, uwb_distance, uwb_angle, uwb_ref_theta, uwb_other_theta, other_is_moving, swarm_length }) => {
    const polygon_angles = Math.PI / 2 - Math.PI / swarm_length;
    const r1 = uwb_distance;
    const phi1 = signedAngleDiff(uwb_angle + uwb_ref_theta, theta);

    const r2 = 0.2;
    const phi2 = polygon_angles + uwb_other_theta - uwb_ref_theta;

    let { r, phi } = addPolarVectors(r1, phi1, r2, phi2);

    for (let i = 1; i < id_offset; i++) {
        ({ r, phi } = addPolarVectors(r, phi, r2, polygon_angles - 2 * i * (Math.PI / 2 - polygon_angles) + uwb_other_theta - uwb_ref_theta));
    }

    phi = mod(phi + Math.PI, 2 * Math.PI) - Math.PI;

    return { delta_position: r * 0.9, delta_angle: phi, applies: r > minRadiusThreshold };
}

/**
 * Rule for forming a regular polygon using UWB sensors.
 * Used for long-range polygon formation with configurable number of sides.
 */
export const uwbShapePolygon = new Rule(
    'uwbShapePolygon',
    'uwb',
    '0',
    'true',
    {start: -2 * Math.PI, end: 2 * Math.PI},
    {start: UWB_MIN_SENSING_RADIUS, end: UWB_MAX_SENSING_RADIUS},
    true
)

/**
 * Implementation of UWB-based polygon formation.
 * Positions robots in a regular polygon using long-range measurements.
 * The number of sides is configurable through the polygonSides variable.
 */
uwbShapePolygon.apply = ({ id_offset, theta, uwb_distance, uwb_angle, uwb_ref_theta, uwb_other_theta, other_is_moving, swarm_length }) => {
    const a = 2 * Math.PI / polygonSides;  // Angle between vertices

    const r1 = uwb_distance;
    const phi1 = signedAngleDiff(uwb_angle + uwb_ref_theta, theta);

    const r2 = 0.2;  // Step size for positioning
    const phi2 = Math.PI / 2 + uwb_other_theta - uwb_ref_theta;

    let { r, phi } = addPolarVectors(r1, phi1, r2, phi2);

    // Position robots along the polygon vertices
    for (let i = 1; i < Math.min(id_offset, swarm_length - 1 - swarm_length % polygonSides); i++) {
        ({ r, phi } = addPolarVectors(r, phi, r2, Math.PI / 2 - (a) * Math.round(i / Math.floor(swarm_length / polygonSides)) + uwb_other_theta - uwb_ref_theta));
    }

    phi = mod(phi + Math.PI, 2 * Math.PI) - Math.PI;

    return { delta_position: r*0.9, delta_angle: phi,  applies: r > minRadiusThreshold };
}

/**
 * Rule for making robots face the center of the circle using IR.
 * Used for maintaining orientation in close-range formations.
 */
export const irFaceCircleCenter = new Rule(
    'faceCircleCenter',
    'ir',
    'i-1',
    'true',
    {start: -2 * Math.PI, end: 2 * Math.PI},
    {start: IR_MIN_SENSING_RADIUS, end: IR_MAX_SENSING_RADIUS},
    false
)

/**
 * Implementation of IR-based center facing behavior.
 * Orients robots to face the center of the formation.
 */
irFaceCircleCenter.apply = ({ theta, ir_other_theta, swarm_length }) => {
    const polygon_angles = 0.5 * Math.PI * (swarm_length - 2) / swarm_length;
    const gamma = ir_other_theta + 2 * polygon_angles + Math.PI;
    const phi = signedAngleDiff(gamma, theta);
    return { delta_position: 0, delta_angle: phi, applies: true };
}

/**
 * Rule for making robots face the center of the circle using UWB.
 * Used for maintaining orientation in long-range formations.
 */
export const uwbFaceCircleCenter = new Rule(
    'uwbFaceCircleCenter',
    'uwb',
    'i-1',
    'true',
    {start: -2 * Math.PI, end: 2 * Math.PI},
    {start: UWB_MIN_SENSING_RADIUS, end: UWB_MAX_SENSING_RADIUS},
    false
)

/**
 * Implementation of UWB-based center facing behavior.
 * Orients robots to face the center using long-range measurements.
 */
uwbFaceCircleCenter.apply = ({ theta, uwb_other_theta, swarm_length }) => {
    const polygon_angles = 0.5 * Math.PI * (swarm_length - 2) / swarm_length;
    const gamma = uwb_other_theta + 2 * polygon_angles + Math.PI;
    const phi = signedAngleDiff(gamma, theta);
    return { delta_position: 0, delta_angle: phi, applies: true };
}

/** List of active rules in the simulation */
export let formationType = 'circle';
export let polygonSides = 4;
export let minRadiusThreshold = 0.05;

export const setFormationType = (type) => {
    formationType = type;
};

export const setPolygonSides = (sides) => {
    polygonSides = sides;
};

export const setMinRadiusThreshold = (threshold) => {
    minRadiusThreshold = threshold;
};

export const getActiveRules = () => {
    const baseRules = [
        // faceNorth,
        irMoveAwayFromAnchor,
    ];

    if (formationType === 'circle') {
        return [...baseRules, irShapeCircle, uwbShapeCircle, uwbFaceCircleCenter];
    } else {
        return [...baseRules, uwbShapePolygon, uwbFaceCircleCenter];
    }
};

export const rules = getActiveRules();
