let emissionCurve = [
    { x: 0, y: 1 },
    { x: 10, y: 0.98 },
    { x: 20, y: 0.94 },
    { x: 30, y: 0.85 },
    { x: 40, y: 0.72 },
    { x: 45, y: 0.63 },
    { x: 50, y: 0.53 },
    { x: 55, y: 0.42 },
    { x: 60, y: 0.3 },
    { x: 70, y: 0.1 },
    { x: 80, y: 0.01 }
]

// Convert emission curve data to control points
export let controlPoints = emissionCurve.map(point => ({
    x: point.x, // Normalize x to 0-1 range
    y: point.y
}));

// Function to interpolate between points
const interpolate = (x, points) => {
    // Find the two points that x falls between
    for (let i = 0; i < points.length - 1; i++) {
        if (x >= points[i].x && x <= points[i+1].x) {
            const t = (x - points[i].x) / (points[i+1].x - points[i].x);
            return points[i].y + t * (points[i+1].y - points[i].y);
        }
    }
    return 0; // Return 0 if x is outside the range
};

// Emission intensity function using the curve data
export const emissionIntensity = (angle) => {
    const degrees = Math.abs(angle * 180 / Math.PI);
    if (degrees > 80) return 0;
    return interpolate(degrees, controlPoints);
};

let isDragging = false;
let selectedPoint = null;
let curveEditor;
let p5Instance;

const curveEditorSketch = (p) => {
    p.setup = () => {
        curveEditor = document.getElementById('curveEditor');
        const container = curveEditor.parentElement;
        p.createCanvas(container.clientWidth-32, 200, curveEditor);

        curveEditor.addEventListener('mousedown',
            () => {
                const mousePos = getMousePos(p);
                selectedPoint = findNearestPoint(p, mousePos);
                if (selectedPoint !== null) {
                    isDragging = true;
                }
            }
        );
    };

    p.draw = () => {
        const width = p.width;
        const height = p.height;
        const padding = 30;

        // Clear canvas
        p.background(255);

        // Draw grid
        p.stroke('#eee');
        p.strokeWeight(1);

        // Calculate max angle in degrees
        const maxAngleDeg = p.coneAngle * 180 / Math.PI;
        const gridStep = Math.ceil(maxAngleDeg / 10) * 2; // Round to nearest even number for nice grid divisions

        // Vertical grid lines and labels
        for (let deg = 0; deg <= maxAngleDeg; deg += gridStep) {
            const x = deg / maxAngleDeg; // Normalize to 0-1
            const canvasX = padding + x * (width - 2 * padding);

            // Grid line
            p.line(canvasX, padding, canvasX, height - padding);

            // Label
            p.fill('#666');
            p.noStroke();
            p.textAlign(p.CENTER);
            p.textSize(10);
            p.text(Math.round(deg) + '°', canvasX, height - padding + 12);
        }

        // Horizontal grid lines and labels (intensity)
        for (let y = 0; y <= 100; y += 10) {
            const canvasY = height - (padding + y * (height - 2 * padding) / 100);

            // Grid line
            p.stroke('#eee');
            p.line(padding, canvasY, width - padding, canvasY);

            // Label intensity values on the left
            // if (y % 0.2 === 0) {
            p.fill('#666');
            p.noStroke();
            p.textAlign(p.RIGHT);
            p.text(y + '%', padding - 2, canvasY + 3);
            // }
        }

        // Draw curve
        drawCurve(p, width, height, padding);

        // Draw control points
        p.stroke(0);
        p.strokeWeight(1);
        p.fill('#F96E2A');
        controlPoints.forEach(point => {
            const canvasX = padding + point.x * (width - 2 * padding) / (360 * p.coneAngle / Math.PI);
            const canvasY = height - (padding + point.y * (height - 2 * padding));
            p.circle(canvasX, canvasY, 6);
            p.noFill();
            p.circle(canvasX, canvasY, 10);
        });
    };

    p.mouseDragged = () => {
        if (isDragging && selectedPoint !== null) {
            const mousePos = getMousePos(p);
            // Don't allow moving first and last points horizontally
            if (selectedPoint > 0 && selectedPoint < controlPoints.length - 1) {
                controlPoints[selectedPoint].x = (360 * p.coneAngle / Math.PI) * mousePos.x;
            }
            controlPoints[selectedPoint].y = mousePos.y;
            // Keep points ordered by x coordinate
            controlPoints.sort((a, b) => a.x - b.x);
            selectedPoint = controlPoints.findIndex(p => p === controlPoints[selectedPoint]);
        }
    };

    p.mouseReleased = () => {
        isDragging = false;
        selectedPoint = null;
    };
};

function getMousePos(p) {
    const padding = 30;
    const rect = curveEditor.getBoundingClientRect();
    const scaleX = p.width / rect.width;
    const scaleY = p.height / rect.height;

    return {
        x: Math.max(0, Math.min(1, ((p.mouseX - padding) / (p.width - 2 * padding)))),
        y: Math.max(0, Math.min(1, 1 - ((p.mouseY - padding) / (p.height - 2 * padding))))
    };
}

function findNearestPoint(p, mousePos) {
    const threshold = 0.05;
    let minDist = Infinity;
    let nearestIndex = null;

    controlPoints.forEach((point, index) => {
        const dx = point.x / (360 * p.coneAngle / Math.PI) - mousePos.x;
        const dy = point.y - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold && dist < minDist) {
            minDist = dist;
            nearestIndex = index;
        }
    });

    return nearestIndex;
}

const drawCurve = (p, width, height, padding) => {
    p.stroke('#4A90E2');
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    for (let x = 0; x <= 1; x += 0.01) {
        const angleInRadians = x * 2 * p.coneAngle;
        const y = emissionIntensity(angleInRadians);
        const canvasX = padding + x * (width - 2 * padding);
        const canvasY = height - (padding + y * (height - 2 * padding));
        p.vertex(canvasX, canvasY);
    }
    p.endShape();
};

export function initializeCurveEditor(coneAngle) {
    // Create p5 instance
    p5Instance = new p5(curveEditorSketch);
    p5Instance.coneAngle = coneAngle;

    // Add reset button listener
    document.getElementById('resetCurve').addEventListener('click', () => {
        controlPoints = emissionCurve.map(point => ({
            x: point.x, // Normalize x to 0-1 range
            y: point.y
        }));
    });
}

export function updateConeAngle(coneAngle) {
    if (p5Instance) {
        p5Instance.coneAngle = coneAngle;
    }
}
