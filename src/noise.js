import { getNoiseScale, getNoiseSpeed } from './constants.js';

// Base offsets for different error types
const IR_RADIAL_OFFSET = 0;
const IR_ANGULAR_OFFSET = 100;
const UWB_RADIAL_OFFSET = 200;
const UWB_ANGULAR_OFFSET = 300;

// Perlin noise functions for different error types
export function getIRRadialError(x, y, time) {
    return noise(
        x * getNoiseScale(),
        y * getNoiseScale(),
        IR_RADIAL_OFFSET + time
    ) * 2 - 1; // Range -1 to 1
}

export function getIRAngularError(x, y, time) {
    return noise(
        x * getNoiseScale(),
        y * getNoiseScale(),
        IR_ANGULAR_OFFSET + time
    ) * 2 - 1;
}

export function getUWBRadialError(x, y, time) {
    return noise(
        x * getNoiseScale(),
        y * getNoiseScale(),
        UWB_RADIAL_OFFSET + time
    ) * 2 - 1;
}

export function getUWBAngularError(x, y, time) {
    return noise(
        x * getNoiseScale(),
        y * getNoiseScale(),
        UWB_ANGULAR_OFFSET + time
    ) * 2 - 1;
}

// Error visualization toggles
let showIRRadialError = false;
let showIRAngularError = false;
let showUWBRadialError = true;
let showUWBAngularError = false;

// Toggle functions
export function toggleIRRadialError() { showIRRadialError = !showIRRadialError; }
export function toggleIRAngularError() { showIRAngularError = !showIRAngularError; }
export function toggleUWBRadialError() { showUWBRadialError = !showUWBRadialError; }
export function toggleUWBAngularError() { showUWBAngularError = !showUWBAngularError; }

// Draw error map using p5js
export function drawErrorMap() {
    if (!showIRRadialError && !showIRAngularError &&
        !showUWBRadialError && !showUWBAngularError) return;

    // Use frameCount as time parameter, scaled by noise speed
    const time = frameCount * getNoiseSpeed();
    const squareSize = 30;

    push();
    noStroke();
    for (let x = 0; x < width / squareSize; x++) {
        for (let y = 0; y < height / squareSize; y++) {
            let error = 0;
            let activeErrors = 0;

            if (showIRRadialError) {
                error += getIRRadialError((x + 0.5)*squareSize, (y + 0.5)*squareSize, time);
                activeErrors++;
            }
            if (showIRAngularError) {
                error += getIRAngularError((x + 0.5)*squareSize, (y + 0.5)*squareSize, time);
                activeErrors++;
            }
            if (showUWBRadialError) {
                error += getUWBRadialError((x + 0.5)*squareSize, (y + 0.5)*squareSize, time);
                activeErrors++;
            }
            if (showUWBAngularError) {
                error += getUWBAngularError((x + 0.5)*squareSize, (y + 0.5)*squareSize, time);
                activeErrors++;
            }

            if (activeErrors > 0) {
                error /= activeErrors; // Average the active errors
                // Map error from -1,1 to 0,255
                const col = map(error, -1, 1, -255, 255);

                fill(255 - Math.max(0, col), 255 + Math.min(0, col), 255, 128);
                rect(x * squareSize, y * squareSize, squareSize, squareSize);
            }
        }
    }
    pop();
}

wrapper.drawings.errorMap = drawErrorMap;
