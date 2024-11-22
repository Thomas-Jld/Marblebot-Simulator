import { sceneManager } from './src/sceneManager.js';
import { controls } from './src/controls.js';
import { swarmManager } from './src/swarmManager.js';

// Set up click handling
sceneManager.canvas.addEventListener('pointerdown', event => {
    sceneManager.handlePointerDown(event);
    sceneManager.raycaster.setFromCamera(sceneManager.mouse, sceneManager.camera);
    const intersects = sceneManager.raycaster.intersectObjects(sceneManager.scene.children, true)
        .filter(intersect => intersect.object.parent.isMarbleBot);
    swarmManager.handleRobotClick(intersects);
});

// Set up keyboard controls
window.addEventListener('keydown', event => swarmManager.handleKeyPress(event));
window.addEventListener('keyup', event => swarmManager.handleKeyRelease(event));

// Set up window resize handling
window.addEventListener('resize', () => sceneManager.handleResize());

setInterval(() => swarmManager.update(), 33);

// Start animation loop
sceneManager.animate(() => {});
