

let receptionCurve = [
    { x: 0, y: 1 },
    { x: 10, y: 0.98 },
    { x: 20, y: 0.95 },
    { x: 30, y: 0.87 },
    { x: 40, y: 0.75 },
    { x: 45, y: 0.68 },
    { x: 50, y: 0.6 },
    { x: 55, y: 0.5 },
    { x: 60, y: 0.4 },
    { x: 70, y: 0.25 },
    { x: 80, y: 0.1 }
];

// Convert reception curve data to control points
export let controlPoints = receptionCurve.map(point => ({
    x: point.x / 90, // Normalize x to 0-1 range
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

// Reception intensity function using the curve data
export const receptionIntensity = (angle) => {
    const degrees = Math.abs(angle * 180 / Math.PI);
    if (degrees > 80) return 0;
    return interpolate(degrees, receptionCurve);
};

let isDragging = false;
let selectedPoint = null;
let curveEditor;
let p5Instance;

function getMousePos(p) {
    const rect = curveEditor.getBoundingClientRect();
    const width = p.width;
    const height = p.height;
    const padding = 30;

    return {
        x: (p.mouseX - padding) / (width - 2 * padding),
        y: 1 - (p.mouseY - padding) / (height - 2 * padding)
    };
}

function findNearestPoint(mousePos) {
    const threshold = 0.05;
    let nearestPoint = null;
    let minDistance = threshold;

    controlPoints.forEach((point, index) => {
        const dx = point.x - mousePos.x;
        const dy = point.y - mousePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
            minDistance = distance;
            nearestPoint = index;
        }
    });

    return nearestPoint;
}

export function initializeReceptionCurveEditor(coneAngle) {
    const receptionCurveSketch = (p) => {
        p.setup = () => {
            curveEditor = document.getElementById('receptionCurveEditor');
            const container = curveEditor.parentElement;
            p.createCanvas(container.clientWidth-32, 200, curveEditor);

            curveEditor.addEventListener('mousedown', () => {
                const mousePos = getMousePos(p);
                selectedPoint = findNearestPoint(mousePos);
                if (selectedPoint !== null) {
                    isDragging = true;
                }
            });
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
            const gridStep = Math.ceil(maxAngleDeg / 10) * 2;

            // Vertical grid lines and labels
            for (let deg = 0; deg <= maxAngleDeg; deg += gridStep) {
                const x = deg / maxAngleDeg;
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

            // Horizontal grid lines and labels
            for (let y = 0; y <= 100; y += 10) {
                const canvasY = height - (padding + y * (height - 2 * padding) / 100);

                // Grid line
                p.stroke('#eee');
                p.line(padding, canvasY, width - padding, canvasY);

                // Label
                p.fill('#666');
                p.noStroke();
                p.textAlign(p.RIGHT);
                p.text(y + '%', padding - 2, canvasY + 3);
            }

            // Handle point dragging
            if (isDragging && selectedPoint !== null) {
                const mousePos = getMousePos(p);

                // Constrain x movement for end points
                if (selectedPoint === 0) mousePos.x = 0;
                else if (selectedPoint === controlPoints.length - 1) mousePos.x = 1;
                else {
                    mousePos.x = p.constrain(mousePos.x,
                        controlPoints[selectedPoint - 1].x,
                        controlPoints[selectedPoint + 1].x);
                }

                // Constrain y movement
                mousePos.y = p.constrain(mousePos.y, 0, 1);

                controlPoints[selectedPoint] = mousePos;

                if (!p.mouseIsPressed) {
                    isDragging = false;
                    selectedPoint = null;
                }
            }

            const drawCurve = (p, width, height, padding) => {
                p.stroke('#F96E2A');
                p.strokeWeight(2);
                p.noFill();
                p.beginShape();
                for (let x = 0; x <= 1; x += 0.01) {
                    const angleInRadians = x * Math.PI / 2;
                    const y = receptionIntensity(angleInRadians);
                    const canvasX = padding + x * (width - 2 * padding);
                    const canvasY = height - (padding + y * (height - 2 * padding));
                    p.vertex(canvasX, canvasY);
                }
                p.endShape();
            };

            drawCurve(p, width, height, padding, coneAngle);

            // Draw control points
            p.noStroke();
            controlPoints.forEach((point, index) => {
                const canvasX = padding + point.x * (width - 2 * padding);
                const canvasY = height - (padding + point.y * (height - 2 * padding));

                if (index === selectedPoint) {
                    p.fill('#F96E2A');
                    p.circle(canvasX, canvasY, 10);
                } else {
                    p.fill('#666');
                    p.circle(canvasX, canvasY, 8);
                }
            });
        };
    };

    p5Instance = new p5(receptionCurveSketch);
    p5Instance.coneAngle = coneAngle;
}

export function updateReceptionConeAngle(coneAngle) {
    if (p5Instance) {
        p5Instance.coneAngle = coneAngle;
    }
}
