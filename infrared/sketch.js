import { initializeCurveEditor, emissionIntensity, updateConeAngle } from './curveEditor.js';
import { initializeReceptionCurveEditor, receptionIntensity, updateReceptionConeAngle } from './receptionCurveEditor.js';

let LED_COUNT = 8;
let LED_SPACING = 9.5;
let CONE_ANGLE = Math.PI * 50 / 180;
let SCALE = 3;
let SHOW_CONE = false;
let INTENSITY_MULTIPLIER = 50;
let GRAYSCALE = true;
let SHOW_ONE = false;

// Add robot state variables
let targetRobot = {
    x: 0,
    y: 0,
    angle: 0,
    isDragging: false,

    dragOffset: { x: 0, y: 0 }
};

// Add simulation state variables
let isSimulating = true;
let simulationData = [];
let simulationChart = null;
let frameCount = 0;

// DOM elements
let ledCountSlider, ledSpacingSlider, coneAngleSlider, scaleSlider;
let ledCountValue, ledSpacingValue, coneAngleValue, scaleValue;
let intensitySlider, intensityValue;
let p5Canvas;

const angleMod = (a) => {return Math.atan2(Math.sin(a), Math.cos(a))};

const angleIsBetween = (angle, start, end) => {
    if (start <= end) return angle >= start && angle <= end;
    return angle >= start || angle <= end;
};

const getReceptorColor = (index) => `hsl(${(index * 360) / LED_COUNT}, 70%, 50%)`;

const initChart = () => {
    const ctx = document.getElementById('receptorChart').getContext('2d');
    const datasets = Array(LED_COUNT).fill(0).map((_, i) => ({
        label: `Receptor ${i + 1}`,
        data: [],
        borderColor: getReceptorColor(i),
        tension: 0.4
    }));

    simulationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Frame'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Reception Intensity'
                    },
                    min: 0,
                    suggestedMax: 1,
                    adapters: {
                        round: 2
                    }
                }
            }
        }
    });
};

const resetSimulation = () => {
    frameCount = 0;
    simulationData = Array(LED_COUNT).fill().map(() => []);
    if (simulationChart) {
        simulationChart.data.labels = [];
        simulationChart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        simulationChart.update();
    }
};

let estimatedAngle = 0;
let estimatedDistance = 0;
let highestReceivedIndex = -1;
let secondHeighestReceivedIndex = -1;
let thirdHeighestReceivedIndex = -1;

let emitterAngle = 0;
let highestEmittedIndex = -1;
let secondHeighestEmittedIndex = -1;
let thirdHeighestEmittedIndex = -1;

let selectedEmitter = -1;
let selectedReceptor = -1;

const updateSimulation = () => {
    if (!isSimulating) return;

    // Calculate reception for each LED
    const rawValues = [];
    const r = LED_SPACING;

    for (let j = 0; j < LED_COUNT; j++) {
        const emitterAngle = angleMod(j * 2 * Math.PI / LED_COUNT);
        const emitterX = r * Math.cos(emitterAngle);
        const emitterY = r * Math.sin(emitterAngle);

        // For each emitter on the source robot
        let values = [];
        for (let i = 0; i < LED_COUNT; i++) {
            const receptorAngle = angleMod(i * 2 * Math.PI / LED_COUNT + targetRobot.angle);
            const receptorX = targetRobot.x + r * Math.cos(receptorAngle);
            const receptorY = targetRobot.y + r * Math.sin(receptorAngle);

            // Calculate angle between emitter and receptor
            const dx1 = receptorX - emitterX;
            const dy1 = receptorY - emitterY;
            const distance = Math.sqrt(dx1 * dx1 + dy1 * dy1);

            const angleToReceptor = angleMod(Math.atan2(dy1, dx1) - emitterAngle);
            if(!angleIsBetween(angleToReceptor, - CONE_ANGLE, CONE_ANGLE)) {
                values.push(0);
                continue;
            }

            const dx2 = emitterX - receptorX;
            const dy2 = emitterY - receptorY;

            const angleToEmitter = angleMod(Math.atan2(dy2, dx2) - receptorAngle);

            if(!angleIsBetween(angleToEmitter, -CONE_ANGLE, CONE_ANGLE)) {
                values.push(0);
                continue;
            }
            // if (i==0 && j==0) console.log(angleToReceptor, angleToEmitter);


            const emissionIntensityValue = emissionIntensity(Math.abs(angleToReceptor));
            const receptionIntensityValue = receptionIntensity(Math.abs(angleToEmitter));
            const distanceAttenuation = 1 / ((distance * 0.01)**2);

            values.push(emissionIntensityValue * receptionIntensityValue * distanceAttenuation);
        }
        rawValues.push(values);
    }


    let transposedRawValues = Array(LED_COUNT).fill().map(() => []);
    for (let i = 0; i < LED_COUNT; i++) {
        for (let j = 0; j < LED_COUNT; j++) {
            transposedRawValues[j][i] = rawValues[i][j];
        }
    }

    // let sums = transposedRawValues.map(values => values[0]);
    let sums = transposedRawValues.map(values => values.reduce((a, b) => a+b, 0));
    // let sums = rawValues.map(values => values.reduce((a, b) => Math.max(a,b), 0));
    selectedEmitter = sums.indexOf(Math.max(...sums));
    let receptionValues = sums.slice();//rawValues[selectedEmitter];

    let highestReceivedValue = Math.max(0, ...receptionValues);
    let highestReceivedValueIndex = receptionValues.indexOf(highestReceivedValue);
    let newReceptionValues = receptionValues.slice();
    newReceptionValues[highestReceivedValueIndex] = 0;

    let secondHeighestReceivedValue = Math.max(0, ...newReceptionValues);
    let secondHeighestReceivedValueIndex = newReceptionValues.indexOf(secondHeighestReceivedValue);
    newReceptionValues[secondHeighestReceivedValueIndex] = 0;

    let thirdHeighestReceivedValue = Math.max(0, ...newReceptionValues);
    let thirdHeighestReceivedValueIndex = newReceptionValues.indexOf(thirdHeighestReceivedValue);
    newReceptionValues[thirdHeighestReceivedValueIndex] = 0;

    estimatedAngle = highestReceivedValueIndex*45;
    highestReceivedIndex = highestReceivedValueIndex;
    // console.log(highestReceivedValue, secondHeighestReceivedValue, thirdHeighestReceivedValue);
    let angleOffset = 0;
    if (secondHeighestReceivedValue > 0 && thirdHeighestReceivedValue <= 0) {
        let a = 0;
        if (highestReceivedValueIndex == 0 && secondHeighestReceivedValueIndex == LED_COUNT-1) a = -1;
        else if (highestReceivedValueIndex == LED_COUNT-1 && secondHeighestReceivedValueIndex == 0) a = 1;
        else a = highestReceivedValueIndex <= secondHeighestReceivedValueIndex ? 1 : -1;
        angleOffset += a * 45 * (1.5 - highestReceivedValue/secondHeighestReceivedValue);
        secondHeighestReceivedIndex = secondHeighestReceivedValueIndex;
    } else {
        secondHeighestReceivedIndex = -1;
    }

    if (secondHeighestReceivedValue > 0 && thirdHeighestReceivedValue > 0) {
        let a = 0;
        let b = 0;
        if (highestReceivedValueIndex == 0 && secondHeighestReceivedValueIndex == LED_COUNT-1) a = -1;
        else if (highestReceivedValueIndex == LED_COUNT-1 && secondHeighestReceivedValueIndex == 0) a = 1;
        else a = highestReceivedValueIndex <= secondHeighestReceivedValueIndex ? 1 : -1;
        if (highestReceivedValueIndex == 0 && thirdHeighestReceivedValueIndex == LED_COUNT-1) b = -1;
        else if (highestReceivedValueIndex == LED_COUNT-1 && thirdHeighestReceivedValueIndex == 0) b = 1;
        else b = highestReceivedValueIndex <= thirdHeighestReceivedValueIndex ? 1 : -1;

        let offsetA = a * 45 * (1 - highestReceivedValue/secondHeighestReceivedValue);
        let offsetB = b * 45 * (1 - highestReceivedValue/thirdHeighestReceivedValue);
        // console.log(offsetA, offsetB, highestReceivedValue, secondHeighestReceivedValue, thirdHeighestReceivedValue);
        angleOffset += offsetA + offsetB;
        secondHeighestReceivedIndex = secondHeighestReceivedValueIndex;
        thirdHeighestReceivedIndex = thirdHeighestReceivedValueIndex;
    } else {
        thirdHeighestReceivedIndex = -1;
    }

    // console.log(highestReceivedValue, secondHeighestReceivedValue, thirdHeighestReceivedValue, highestReceivedValueIndex, secondHeighestReceivedValueIndex, thirdHeighestReceivedValueIndex, angleOffset);


    // sums = transposedRawValues.map(values => values.reduce((a, b) => Math.max(a,b), 0));
    // selectedReceptor = sums.indexOf(Math.max(...sums));
    // let emissionValues = transposedRawValues[selectedReceptor];

    // let highestEmittedValue = Math.max(0, ...emissionValues);
    // let highestEmittedValueIndex = emissionValues.indexOf(highestEmittedValue);
    // let newEmissionValues = emissionValues.slice();
    // newEmissionValues[highestEmittedValueIndex] = 0;

    // let secondHeighestEmittedValue = Math.max(0, ...newEmissionValues);
    // let secondHeighestEmittedValueIndex = newEmissionValues.indexOf(secondHeighestEmittedValue);
    // newEmissionValues[secondHeighestEmittedValueIndex] = 0;

    // let thirdHeighestEmittedValue = Math.max(0, ...newEmissionValues);
    // let thirdHeighestEmittedValueIndex = newEmissionValues.indexOf(thirdHeighestEmittedValue);
    // newEmissionValues[thirdHeighestEmittedValueIndex] = 0;

    // emitterAngle = highestEmittedValueIndex*45;
    // highestEmittedIndex = highestEmittedValueIndex;
    // let emitterAngleOffset = 0;
    // if (secondHeighestEmittedValue > 0) {
    //     let a = 0;
    //     if (highestEmittedValueIndex == 0 && secondHeighestEmittedValueIndex == LED_COUNT-1) a = -1;
    //     else if (highestEmittedValueIndex == LED_COUNT-1 && secondHeighestEmittedValueIndex == 0) a = 1;
    //     else a = highestEmittedValueIndex <= secondHeighestEmittedValueIndex ? 1 : -1;
    //     emitterAngleOffset += a * (22.5 - 45 * (highestEmittedValue/secondHeighestEmittedValue-1)  );
    //     secondHeighestEmittedIndex = secondHeighestEmittedValueIndex;
    // } else {
    //     secondHeighestEmittedIndex = -1;
    // }

    // if (thirdHeighestEmittedValue > 0) {
    //     let a = 0;
    //     if (highestEmittedValueIndex == 0 && thirdHeighestEmittedValueIndex == LED_COUNT-1) a = -1;
    //     else if (highestEmittedValueIndex == LED_COUNT-1 && thirdHeighestEmittedValueIndex == 0) a = 1;
    //     else a = highestEmittedValueIndex <= thirdHeighestEmittedValueIndex ? 1 : -1;
    //     emitterAngleOffset += a * (22.5 - 45 * (highestEmittedValue/thirdHeighestEmittedValue-1)  );
    //     emitterAngleOffset /= 2;
    //     thirdHeighestEmittedIndex = thirdHeighestEmittedValueIndex;
    // } else {
    //     thirdHeighestEmittedIndex = -1;
    // }

    estimatedAngle += angleOffset;
    estimatedDistance = 1.5*100 / Math.sqrt(highestReceivedValue) + LED_SPACING * Math.cos(Math.PI*angleOffset/180);
    // emitterAngle += emitterAngleOffset;
    // console.log(emitterAngle);

    // Update chart data
    frameCount++;
    simulationChart.data.labels.push(frameCount);
    simulationChart.data.datasets.forEach((dataset, i) => {
        dataset.data.push(sums[i]);
    });

    // Keep only last 100 frames
    if (frameCount > 100) {
        simulationChart.data.labels.shift();
        simulationChart.data.datasets.forEach(dataset => {
            dataset.data.shift();
        });
    }

    // Update y-axis scale based on maximum value
    const allValues = simulationChart.data.datasets.flatMap(dataset => dataset.data);
    const maxValue = Math.max(...allValues);
    simulationChart.options.scales.y.suggestedMax = maxValue * 1.1; // Add 10% padding

    simulationChart.update();
};

// Canvas pan controls
const offset = {
    x: 0,
    y: 0,
    focused: false
};

const sketch = (p) => {
    p.setup = () => {
        const container = document.getElementById('simulation-container');
        p5Canvas = document.getElementById('p5Canvas');
        p.createCanvas(container.clientWidth, container.clientHeight, p5Canvas);
        // canvas.parent(p5Canvas.parentElement);
        // p5Canvas.remove(); // Remove the original canvas
        // p5Canvas = document.querySelector('#simulation-container canvas'); // Get the new p5 canvas
        setupControls(p);
        initChart();
    };

    p.draw = () => {
        p.background(0);
        p.translate(p.width / 2, p.height / 2);
        p.scale(SCALE);
        p.translate(offset.x, offset.y);

        // Draw robot body
        p.fill(71, 102, 59);
        p.stroke(0);
        p.strokeWeight(0.2);
        p.circle(0, 0, 23);

        const r2 = 3000;
        // Draw LEDs and their emission patterns
        for (let i = 0; i < (SHOW_ONE ? 1 : LED_COUNT); i++) {
            const r = LED_SPACING;
            const angle = p.map(i, 0, LED_COUNT, 0, p.TWO_PI);
            const x = r * p.cos(angle);
            const y = r * p.sin(angle);

            // Draw emission pattern
            p.push();
            p.translate(x, y);
            p.rotate(i * p.TWO_PI / LED_COUNT);
            p.noFill();

            let step = 0.005;
            for (let a = -CONE_ANGLE+step; a < CONE_ANGLE; a += step) {
                const intensity = emissionIntensity(a);

                if (SHOW_CONE) p.noStroke();
                else if (GRAYSCALE) p.stroke(255, 255, 255, INTENSITY_MULTIPLIER * (intensity - 0.0) / 0.4);
                else p.stroke(255*(i%2), 255*((i+1)%2), 255*(i%2) + 255*((i+1)%2), intensity * INTENSITY_MULTIPLIER);

                if(GRAYSCALE) p.fill(255, 255, 255, INTENSITY_MULTIPLIER * (intensity - 0.0) / 0.4);
                else p.fill(255*(i%2), 255*((i+1)%2), 255*(i%2) + 255*((i+1)%2), intensity * INTENSITY_MULTIPLIER);
                p.strokeWeight(0.5);

                if (SHOW_CONE) {
                    p.arc(0, 0, 2*r2, 2*r2, a - step/2, a + step/2);
                } else {
                    p.line(0, 0, r2 * p.cos(a), r2 * p.sin(a));
                }
            }
            p.pop();
            // Draw LED
            p.push();
            p.fill(255);
            p.stroke(selectedEmitter == i ? "red" : 0);
            p.strokeWeight(0.2);
            p.translate(x, y);
            p.rotate(-Math.PI / 2 + i * p.TWO_PI / LED_COUNT);
            p.circle(0, 0, 2.1);
            p.rect(- 1.5, - 1.5, 3, 1);
            p.pop();

        }




        const small_r = 11.5;

        for (let i = 0; i < LED_COUNT; i++) {
            const r = LED_SPACING;
            const angle = p.map(i, 0, LED_COUNT, -Math.PI, Math.PI);
            const x = r * p.cos(angle);
            const y = r * p.sin(angle);
            // Calculate vector from source to target robot
            const dx = targetRobot.x - x;
            const dy = targetRobot.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angleToTarget = Math.atan2(dy, dx);
            const shadow_angle = Math.atan2(11.5, distance);
            const led_angle = p.map(i, 0, LED_COUNT, -Math.PI, Math.PI);

            if(angleIsBetween(led_angle, angleMod(angleToTarget - CONE_ANGLE), angleMod(angleToTarget + CONE_ANGLE))) {
                p.push();
                p.translate(x + dx, y + dy);
                p.rotate(angleToTarget);
                p.translate(0, 0);
                p.fill(0);
                p.stroke(0);
                p.strokeWeight(0.2);
                p.circle(0, 0, 23);
                p.quad(0, small_r, 0, -small_r, r2 * p.cos(shadow_angle), - r2 * p.sin(shadow_angle) - small_r, r2 * p.cos(shadow_angle), r2 * p.sin(shadow_angle) + small_r);
                p.pop();
            }
        }

        // Draw target robot
        p.push();
        p.translate(targetRobot.x, targetRobot.y);
        p.rotate(targetRobot.angle);

        // Draw robot body
        p.fill(71, 102, 59);
        p.stroke(0);
        p.strokeWeight(0.2);
        p.circle(0, 0, 23);

        // Draw photodiodes
        p.stroke(255);
        p.fill(0);
        for (let i = 0; i < LED_COUNT; i++) {
            const r = LED_SPACING;
            const angle = p.map(i, 0, LED_COUNT, 0, p.TWO_PI);
            const x = r * p.cos(angle);
            const y = r * p.sin(angle);

            p.push();
            p.translate(x, y);
            p.rotate(-Math.PI / 2 + i * p.TWO_PI / LED_COUNT);
            // Use the same color as the graph
            const color = getReceptorColor(i);
            p.stroke(selectedReceptor == i ? "red" : 0);
            p.fill(highestReceivedIndex == i ? 255 : secondHeighestReceivedIndex == i ? 200 : thirdHeighestReceivedIndex == i ? 150 : 0);
            p.circle(0, 0, 2.1);
            p.fill(color);
            p.rect(-1.5, -1.5, 3, 1);
            p.pop();
        }
        p.pop();


        if (isSimulating) {
            // Draw estimated angle and distance
            p.push();
            p.stroke(255);
            p.strokeWeight(0.2);
            p.textAlign(p.CENTER);
            p.textSize(15/SCALE);
            p.line(0, 0, targetRobot.x, targetRobot.y);
            p.translate(targetRobot.x/2, targetRobot.y/2);
            let a = Math.atan2(targetRobot.y, targetRobot.x);
            const actualDistance = Math.sqrt(targetRobot.x * targetRobot.x + targetRobot.y * targetRobot.y);
            const actualAngle = 180 + 180 * (Math.atan2(targetRobot.y, targetRobot.x) - targetRobot.angle) / Math.PI % 360;
            p.rotate(Math.abs(a) < Math.PI/2 ? a : Math.PI + a);
            p.fill(0, 255, 255);
            p.text('d: ' + estimatedDistance.toFixed(0) + ' mm, a: ' + estimatedAngle.toFixed(2) % 360 + ' °', 0, 30/SCALE);
            p.fill(0, 255, 0);
            p.text('d: ' + actualDistance.toFixed(0) + ' mm, a: ' + actualAngle.toFixed(2) + ' °', 0, -30/SCALE);

            const deltaDistance = Math.abs(estimatedDistance - actualDistance);
            const deltaAngle = 180 * angleMod(Math.PI * Math.abs(estimatedAngle - actualAngle)/180) / Math.PI;
            p.fill(255, 0, 0);
            p.text('Δd: ' + deltaDistance.toFixed(0) + ' mm, Δa: ' + deltaAngle.toFixed(2) + ' °', 0, 0);
            p.pop();

            p.push();
            p.translate(targetRobot.x, targetRobot.y);
            p.rotate(-Math.PI/2 + Math.PI *estimatedAngle / 180 + targetRobot.angle);
            p.stroke(255, 0, 0);
            p.strokeWeight(2);
            p.circle(0, estimatedDistance, 2*LED_SPACING);
            // console.log(estimatedDistance, estimatedAngle);
            p.pop();
        }

        updateSimulation();
    };

    p.windowResized = () => {
        const container = document.getElementById('simulation-container');
        p.resizeCanvas(container.clientWidth, container.clientHeight);
    };
};

function setupControls(p) {
    // Setup collapsible sections
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.control-section');
            const content = section.querySelector('.section-content');
            const toggleButton = section.querySelector('.toggle-section');

            content.classList.toggle('collapsed');
            toggleButton.classList.toggle('collapsed');
        });
    });

    // Initialize slider elements
    ledCountSlider = document.getElementById('ledCount');
    ledSpacingSlider = document.getElementById('ledSpacing');
    coneAngleSlider = document.getElementById('coneAngle');
    scaleSlider = document.getElementById('scale');

    ledCountValue = document.getElementById('ledCountValue');
    ledSpacingValue = document.getElementById('ledSpacingValue');
    coneAngleValue = document.getElementById('coneAngleValue');
    scaleValue = document.getElementById('scaleValue');

    // Initialize intensity controls
    intensitySlider = document.getElementById('intensity');
    intensityValue = document.getElementById('intensityValue');

    // Add checkbox listeners
    const showConeCheckbox = document.getElementById('show-cone');
    showConeCheckbox.addEventListener('change', function() {
        SHOW_CONE = this.checked;
    });

    const grayscaleCheckbox = document.getElementById('grayscale');
    grayscaleCheckbox.addEventListener('change', function() {
        GRAYSCALE = this.checked;
    });

    const showOneCheckbox = document.getElementById('show-one');
    showOneCheckbox.addEventListener('change', function() {
        SHOW_ONE = this.checked;
    });

    // Add event listeners
    ledCountSlider.addEventListener('input', function() {
        LED_COUNT = parseInt(this.value);
        ledCountValue.textContent = LED_COUNT;
    });

    ledSpacingSlider.addEventListener('input', function() {
        LED_SPACING = parseFloat(this.value);
        ledSpacingValue.textContent = LED_SPACING;
    });

    coneAngleSlider.addEventListener('input', function() {
        const newAngle = p.radians(parseFloat(coneAngleSlider.value));
        CONE_ANGLE = newAngle;
        coneAngleValue.textContent = coneAngleSlider.value;
        updateConeAngle(newAngle);
        updateReceptionConeAngle(newAngle);
    });

    scaleSlider.addEventListener('input', function() {
        SCALE = parseFloat(this.value);
        scaleValue.textContent = SCALE;
    });

    intensitySlider.addEventListener('input', function() {
        INTENSITY_MULTIPLIER = parseInt(this.value);
        intensityValue.textContent = INTENSITY_MULTIPLIER;
    });

    // Initialize curve editors
    initializeCurveEditor(CONE_ANGLE);
    initializeReceptionCurveEditor(CONE_ANGLE);

    // Setup reset buttons
    document.getElementById('resetCurve').addEventListener('click', () => {
        initializeCurveEditor(CONE_ANGLE);
    });

    document.getElementById('resetReceptionCurve').addEventListener('click', () => {
        initializeReceptionCurveEditor(CONE_ANGLE);
    });

    // Setup simulation controls
    const startStopButton = document.getElementById('startStopSimulation');
    const resetButton = document.getElementById('resetSimulation');

    startStopButton.addEventListener('click', () => {
        isSimulating = !isSimulating;
        startStopButton.textContent = isSimulating ? 'Stop Simulation' : 'Start Simulation';
        startStopButton.classList.toggle('active');
    });

    resetButton.addEventListener('click', () => {
        resetSimulation();
    });

    // Setup canvas controls
    p5Canvas.addEventListener('wheel', (event) => {
        const scaleDelta = -event.deltaY * 0.01;
        const newScale = Math.min(Math.max(SCALE + scaleDelta, 1), 50);

        SCALE = newScale;
        scaleSlider.value = newScale;
        scaleValue.textContent = newScale.toFixed(1);

        return false;
    });


    p5Canvas.addEventListener('mouseup', () => {
    });

    // Initialize target robot position
    targetRobot.x = 200;
    targetRobot.y = 0;

    // Add mouse event listeners for robot dragging
    p5Canvas.addEventListener('mousedown', (e) => {
        const rect = p5Canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / SCALE - p.width / (2 * SCALE) - offset.x;
        const mouseY = (e.clientY - rect.top) / SCALE - p.height / (2 * SCALE) - offset.y;

        // Check if mouse is over the target robot
        const dx = mouseX - targetRobot.x;
        const dy = mouseY - targetRobot.y;
        if (Math.sqrt(dx * dx + dy * dy) < 11.5) { // Robot radius
            targetRobot.isDragging = true;
            targetRobot.dragOffset.x = dx;
            targetRobot.dragOffset.y = dy;
            e.preventDefault();
        } else {
            offset.focused = true;
        }
    });

    p5Canvas.addEventListener('mousemove', (e) => {

        if (offset.focused) {
            offset.x += e.movementX / SCALE;
            offset.y += e.movementY / SCALE;
        }
        if (targetRobot.isDragging) {
            const rect = p5Canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / SCALE - p.width / (2 * SCALE) - offset.x;
            const mouseY = (e.clientY - rect.top) / SCALE - p.height / (2 * SCALE) - offset.y;

            targetRobot.x = mouseX - targetRobot.dragOffset.x;
            targetRobot.y = mouseY - targetRobot.dragOffset.y;
            e.preventDefault();
        }
    });

    p5Canvas.addEventListener('mouseup', () => {
        targetRobot.isDragging = false;
        offset.focused = false;
    });

    // Add keyboard event listeners for rotation
    document.addEventListener('keydown', (e) => {
        if (e.key === '-' || e.key === '_') {
            targetRobot.angle -= Math.PI / 72; // Rotate 10 degrees counter-clockwise
            targetRobot.angle = angleMod(targetRobot.angle);
        } else if (e.key === '+' || e.key === '=') {
            targetRobot.angle += Math.PI / 72; // Rotate 10 degrees clockwise
            targetRobot.angle = angleMod(targetRobot.angle);
        }
    });
}

// Initialize p5 in instance mode
new p5(sketch);
