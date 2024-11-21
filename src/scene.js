import * as THREE from 'three';
import { ZOOM } from './constants.js'


export let createScene = () => {
    const scene = new THREE.Scene();

    const canvas = document.getElementById('canvas');
    const container = document.getElementById('simulation-container');
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });

    // const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const camera = new THREE.OrthographicCamera( ZOOM * -1 * container.clientWidth / container.clientHeight, ZOOM * container.clientWidth / container.clientHeight, ZOOM, -ZOOM, 0.1, 1000);
    camera.position.z = 1.2;
    camera.lookAt(0, 0, 0);

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    window.addEventListener('resize', () => {
        renderer.setSize(container.clientWidth, container.clientHeight);
        // camera.aspect = container.clientWidth / container.clientHeight;
        // camera.updateProjectionMatrix();

        camera.bottom = -ZOOM;
        camera.top = ZOOM;
        camera.right = ZOOM * container.clientWidth / container.clientHeight;
        camera.left = ZOOM * -1 * container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
    });

    return { scene, camera, renderer, container, canvas };
}
