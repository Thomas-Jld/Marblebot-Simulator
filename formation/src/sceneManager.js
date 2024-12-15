import * as THREE from 'three';
import { ZOOM } from './constants.js';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.container = document.getElementById('simulation-container');
        this.canvas = document.getElementById('canvas');
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });

        this.camera = new THREE.OrthographicCamera(
            ZOOM * -1 * this.container.clientWidth / this.container.clientHeight,
            ZOOM * this.container.clientWidth / this.container.clientHeight,
            ZOOM,
            -ZOOM,
            0.1,
            1000
        );
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.helpersHidden = false;
        
        this.initScene();
        this.setupEventListeners();
    }

    initScene() {
        this.camera.position.z = 1.2;
        this.camera.lookAt(0, 0, 0);

        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    setupEventListeners() {
        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    }

    handlePointerDown(event) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - parseFloat(rect.left)) / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - parseFloat(rect.top)) / this.container.clientHeight) * 2 + 1;
    }

    handleResize() {
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        
        this.camera.bottom = -ZOOM;
        this.camera.top = ZOOM;
        this.camera.right = ZOOM * this.container.clientWidth / this.container.clientHeight;
        this.camera.left = ZOOM * -1 * this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    animate(callback) {
        requestAnimationFrame(() => this.animate(callback));
        if (callback) callback();
        this.renderer.render(this.scene, this.camera);
    }
}

export const sceneManager = new SceneManager();
