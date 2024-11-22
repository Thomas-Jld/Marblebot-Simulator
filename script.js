import * as THREE from 'three';
import { createRandomSwarm } from './src/marblebots.js'
import { rules, setFormationType, getActiveRules, setPolygonSides, setMinRadiusThreshold } from './src/rules.js'
import { createScene } from './src/scene.js';
import {
    setUWBAngularPrecision,
    setUWBRadialPrecision,
    setIRAngularPrecision,
    setIRRadialPrecision,
    ZOOM,
    setNoiseScale,
    setNoiseSpeed
} from './src/constants.js';
import {
    toggleUWBAngularError,
    toggleUWBRadialError,
    toggleIRAngularError,
    toggleIRRadialError,
    drawErrorMap
} from './src/noise.js';

let { scene, camera, renderer, container, canvas } = createScene();

let helpersHidden = false;
const swarmSize = 16;
const swarm = createRandomSwarm(swarmSize);
swarm.forEach(marbleBot => {
    scene.add(marbleBot.mesh);
    marbleBot.createHelpers(swarm.length);
});

let regenButton = document.getElementById('regen-button');
regenButton.addEventListener('click', () => {
    wrapper.drawings = {};
    wrapper.drawings.errorMap = drawErrorMap;
    swarm.forEach(marbleBot => {
        scene.remove(marbleBot.mesh);
    });
    swarm.length = 0;
    let newSwarm = createRandomSwarm(swarmSize);
    newSwarm.forEach(marbleBot => {
        swarm.push(marbleBot);
        scene.add(marbleBot.mesh);
        marbleBot.createHelpers(newSwarm.length);
    });
    triggerButton({
        clientX: canvas.width / 2,
        clientY: canvas.height / 2
    });
    if (helpersHidden)  triggerButton({
                            clientX: canvas.width / 2,
                            clientY: canvas.height / 2
                        });
});


let counter = 1;
let dt = 0.033;
setInterval(() => {
    counter++;

    if (counter % 1 === 0) swarm.forEach(marbleBot => marbleBot.senseSwarmUWB(swarm));
    if (counter % 1 === 0) swarm.forEach(marbleBot => marbleBot.senseSwarmIR(swarm));

    swarm.forEach(marbleBot => marbleBot.applyRules(rules));
    // swarm[1].applyRules(rules);

    swarm.forEach(marbleBot => marbleBot.update(dt));
    swarm.forEach(marbleBot => marbleBot.applyPhysics(swarm));
}, dt * 1000);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('pointerdown', event => triggerButton(event));
let triggerButton = (event) => {
    const rect = container.getBoundingClientRect();

    mouse.x = ((event.clientX - parseFloat(rect.left)) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - parseFloat(rect.top)) / container.clientHeight) * 2 + 1;

    swarm.forEach(marbleBot => {
        marbleBot.hideHelpers();
    });

    raycaster.setFromCamera(mouse, camera);
    let intersects = raycaster.intersectObjects(scene.children, true);
    intersects = intersects.filter(intersect => intersect.object.parent.isMarbleBot);
    if (intersects.length > 0) {
        console.log(intersects[0].object.parent.ref);
        const marbleBot = intersects[0].object.parent.ref;
        marbleBot.showHelpers();
        helpersHidden = false;
        if (marbleBot.i === 0) marbleBot.selectedAsAnchor = true;
    } else {
        if (!helpersHidden) helpersHidden = true;
        else {
            swarm.forEach(marbleBot => {
                marbleBot.showHelpers();
            });
            helpersHidden = false;
        }
    }
};

// Add formation selection handler
const formationSelect = document.getElementById('formation-select');
const polygonSidesContainer = document.getElementById('polygon-sides-container');
const polygonSidesInput = document.getElementById('polygon-sides');
const polygonSidesValue = document.getElementById('polygon-sides-value');

formationSelect.addEventListener('change', (event) => {
    const formationType = event.target.value;
    setFormationType(formationType);

    // Show/hide polygon sides control
    polygonSidesContainer.style.display = formationType === 'polygon' ? 'block' : 'none';

    // Update rules
    rules.length = 0;
    rules.push(...getActiveRules());
});

// Add polygon sides handler
polygonSidesInput.addEventListener('input', (event) => {
    const sides = parseInt(event.target.value);
    polygonSidesValue.textContent = sides;
    setPolygonSides(sides);

    // Update rules to reflect new polygon configuration
    rules.length = 0;
    rules.push(...getActiveRules());
});

// Add minimum radius threshold handler
const minRadiusInput = document.getElementById('min-radius');
const minRadiusValue = document.getElementById('min-radius-value');

minRadiusInput.addEventListener('input', (event) => {
    const threshold = parseFloat(event.target.value);
    minRadiusValue.textContent = threshold.toFixed(2);
    setMinRadiusThreshold(threshold);

    // Update rules to reflect new threshold
    rules.length = 0;
    rules.push(...getActiveRules());
});

canvas.addEventListener('pointerup', event => swarm[0].selectedAsAnchor = false);

canvas.addEventListener('pointermove', event => {
    if (swarm[0].selectedAsAnchor) {
        // let scale = wrapper.height / (2*ZOOM);

        // let scale = container.clientHeight / (2*ZOOM);
        let dx = (event.clientX - parseFloat(container.getBoundingClientRect().left) - container.clientWidth / 2) / container.clientHeight;
        let dy = (parseFloat(container.getBoundingClientRect().top) - event.clientY + container.clientHeight / 2) / container.clientHeight;
        let x = dx * (2*ZOOM);
        let y = dy * (2*ZOOM);
        swarm[0].x = x;
        swarm[0].y = y;
    }
});

triggerButton({
    clientX: canvas.width / 2,
    clientY: canvas.height / 2
});
triggerButton({
    clientX: canvas.width / 2,
    clientY: canvas.height / 2
});

function initializePrecisionControls() {
    const sliders = {
        'uwb-angular': { setter: setUWBAngularPrecision, valueSpan: 'uwb-angular-value' },
        'uwb-radial': { setter: setUWBRadialPrecision, valueSpan: 'uwb-radial-value' },
        'ir-angular': { setter: setIRAngularPrecision, valueSpan: 'ir-angular-value' },
        'ir-radial': { setter: setIRRadialPrecision, valueSpan: 'ir-radial-value' }
    };

    Object.entries(sliders).forEach(([id, { setter, valueSpan }]) => {
        const slider = document.getElementById(id);
        const span = document.getElementById(valueSpan);

        // Set initial value
        span.textContent = slider.value;
        setter(parseFloat(slider.value));

        // Update on change
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            span.textContent = value;
            setter(value);
        });
    });
}

// Error visualization controls
const noiseScaleSlider = document.getElementById('noise-scale');
const noiseScaleValue = document.getElementById('noise-scale-value');
const noiseSpeedSlider = document.getElementById('noise-speed');
const noiseSpeedValue = document.getElementById('noise-speed-value');
const showIRRadialToggle = document.getElementById('show-ir-radial');
const showIRAngularToggle = document.getElementById('show-ir-angular');
const showUWBRadialToggle = document.getElementById('show-uwb-radial');
const showUWBAngularToggle = document.getElementById('show-uwb-angular');

// Update noise scale value display
noiseScaleSlider.addEventListener('input', () => {
    const value = noiseScaleSlider.value;
    noiseScaleValue.textContent = value;
    setNoiseScale(parseFloat(value));
});

// Update noise speed value display
noiseSpeedSlider.addEventListener('input', () => {
    const value = noiseSpeedSlider.value;
    noiseSpeedValue.textContent = value;
    setNoiseSpeed(parseFloat(value));
});

// Initialize noise control value displays
noiseScaleValue.textContent = noiseScaleSlider.value;
noiseSpeedValue.textContent = noiseSpeedSlider.value;

// Error visualization toggles
showIRRadialToggle.addEventListener('change', () => toggleIRRadialError());
showIRAngularToggle.addEventListener('change', () => toggleIRAngularError());
showUWBRadialToggle.addEventListener('change', () => toggleUWBRadialError());
showUWBAngularToggle.addEventListener('change', () => toggleUWBAngularError());

document.addEventListener('DOMContentLoaded', () => {
    initializePrecisionControls();
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        swarm[0].targeted_delta_angle = 0.2;
    } else if (event.key === 'ArrowRight') {
        swarm[0].targeted_delta_angle = -0.2;
    } else if (event.key === 'ArrowUp') {
        swarm[0].targeted_delta_position = 0.05;
    }
    else if (event.key === 'ArrowDown') {
        swarm[0].targeted_delta_position = -0.05;
    }
});

const animate = () => {
    requestAnimationFrame(animate);

    swarm.forEach(marbleBot => {
        marbleBot.mesh.rotation.z = marbleBot.theta;
    });

    renderer.render(scene, camera);
}

animate();
