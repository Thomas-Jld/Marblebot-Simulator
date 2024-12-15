import { createRandomSwarm } from './marblebots.js';
import { getActiveRules } from './rules.js';
import { sceneManager } from './sceneManager.js';
import { drawErrorMap } from './noise.js';

export class SwarmManager {
    constructor(size = 16) {
        this.swarmSize = size;
        this.swarm = createRandomSwarm(this.swarmSize);
        this.helpersHidden = false;
        this.dt = 0.033;
        this.counter = 1;

        this.initializeSwarm();
        this.setupRegenButton();

        this.leftPressed = false;
        this.rightPressed = false;
        this.upPressed = false;
        this.downPressed = false;
    }

    initializeSwarm() {
        this.swarm.forEach(marbleBot => {
            sceneManager.scene.add(marbleBot.mesh);
            marbleBot.createHelpers(this.swarm.length);
        });
        window.swarm = this.swarm;
    }

    setupRegenButton() {
        const regenButton = document.getElementById('regen-button');
        regenButton.addEventListener('click', () => this.regenerateSwarm());
    }

    regenerateSwarm() {
        window.wrapper.drawings = {};
        window.wrapper.drawings.errorMap = drawErrorMap;

        this.swarm.forEach(marbleBot => {
            sceneManager.scene.remove(marbleBot.mesh);
        });

        this.swarm.length = 0;
        const newSwarm = createRandomSwarm(this.swarmSize);

        newSwarm.forEach(marbleBot => {
            this.swarm.push(marbleBot);
            sceneManager.scene.add(marbleBot.mesh);
            marbleBot.createHelpers(newSwarm.length);
        });

        if (this.helpersHidden) {
            this.swarm.forEach(marbleBot => {
                marbleBot.hideHelpers();
            });
        }
    }

    update() {
        this.counter++;

        if (this.counter % 30 === 0) this.swarm.forEach(marbleBot => marbleBot.senseSwarmUWB(this.swarm, this.counter));
        if (this.counter % 1 === 0) this.swarm.forEach(marbleBot => marbleBot.senseSwarmIR(this.swarm, this.counter));

        this.swarm.forEach(marbleBot => {
            marbleBot.applyRules(getActiveRules());
            marbleBot.update(this.dt);
            marbleBot.applyPhysics(this.swarm);
        });

        if (this.leftPressed) this.swarm[0].targeted_delta_angle = 0.2;
        if (this.rightPressed) this.swarm[0].targeted_delta_angle = -0.2;
        if (this.upPressed) this.swarm[0].targeted_delta_position = 0.05;
        if (this.downPressed) this.swarm[0].targeted_delta_position = -0.05;
    }

    handleRobotClick(intersects) {
        this.swarm.forEach(marbleBot => {
            marbleBot.hideHelpers();
        });

        if (intersects.length > 0) {
            const marbleBot = intersects[0].object.parent.ref;
            marbleBot.showHelpers();
            this.helpersHidden = false;
            if (marbleBot.i === 0) marbleBot.selectedAsAnchor = true;
        } else {
            if (!this.helpersHidden) {
                this.helpersHidden = true;
            } else {
                this.swarm.forEach(marbleBot => {
                    marbleBot.showHelpers();
                });
                this.helpersHidden = false;
            }
        }
    }

    handleKeyPress(event) {
        if (event.key === 'ArrowLeft') {
            this.leftPressed = true;
        } else if (event.key === 'ArrowRight') {
            this.rightPressed = true;
        } else if (event.key === 'ArrowUp') {
            this.upPressed = true;
        } else if (event.key === 'ArrowDown') {
            this.downPressed = true;
        }
    }

    handleKeyRelease(event) {
        if (event.key === 'ArrowLeft') {
            this.leftPressed = false;
        } else if (event.key === 'ArrowRight') {
            this.rightPressed = false;
        } else if (event.key === 'ArrowUp') {
            this.upPressed = false;
        } else if (event.key === 'ArrowDown') {
            this.downPressed = false;
        }
    }
}

export const swarmManager = new SwarmManager();
