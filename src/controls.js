import {
    setUWBAngularPrecision,
    setUWBRadialPrecision,
    setIRAngularPrecision,
    setIRRadialPrecision,
    setNoiseScale,
    setNoiseSpeed
} from './constants.js';

import {
    toggleUWBAngularError,
    toggleUWBRadialError,
    toggleIRAngularError,
    toggleIRRadialError,
} from './noise.js';

import {
    setFormationType,
    setPolygonSides,
    setMinRadiusThreshold,
    setSegmentSize
} from './rules.js';

class Controls {
    constructor() {
        this.initializeControls();
    }

    initializeControls() {
        this.initializeFormationControls();
        this.initializePrecisionControls();
        this.initializeNoiseControls();
        this.initializeErrorVisualization();
    }

    initializeFormationControls() {
        const formationSelect = document.getElementById('formation-select');
        const polygonSidesContainer = document.getElementById('polygon-sides-container');
        const polygonSidesInput = document.getElementById('polygon-sides');
        const minRadiusInput = document.getElementById('min-radius');
        const segmentSizeInput = document.getElementById('segment-size');
        const polygonSidesValue = document.getElementById('polygon-sides-value');
        const minRadiusValue = document.getElementById('min-radius-value');
        const segmentSizeValue = document.getElementById('segment-size-value');

        formationSelect.addEventListener('change', (e) => {
            const selectedFormation = e.target.value;
            setFormationType(selectedFormation);
            polygonSidesContainer.style.display = selectedFormation === 'polygon' ? 'block' : 'none';
        });

        polygonSidesInput.addEventListener('input', (e) => {
            const sides = parseInt(e.target.value);
            polygonSidesValue.textContent = sides;
            setPolygonSides(sides);
        });

        minRadiusInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            minRadiusValue.textContent = value;
            setMinRadiusThreshold(value);
        });

        segmentSizeInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            segmentSizeValue.textContent = value;
            setSegmentSize(value);
        });
    }

    initializePrecisionControls() {
        const precisionControls = [
            {
                sliderId: 'uwb-angular',
                valueId: 'uwb-angular-value',
                setter: setUWBAngularPrecision
            },
            {
                sliderId: 'uwb-radial',
                valueId: 'uwb-radial-value',
                setter: setUWBRadialPrecision
            },
            {
                sliderId: 'ir-angular',
                valueId: 'ir-angular-value',
                setter: setIRAngularPrecision
            },
            {
                sliderId: 'ir-radial',
                valueId: 'ir-radial-value',
                setter: setIRRadialPrecision
            }
        ];

        precisionControls.forEach(control => {
            const slider = document.getElementById(control.sliderId);
            const span = document.getElementById(control.valueId);
            span.textContent = slider.value;

            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                span.textContent = value;
                control.setter(value);
            });
        });
    }

    initializeNoiseControls() {
        const noiseScaleSlider = document.getElementById('noise-scale');
        const noiseScaleValue = document.getElementById('noise-scale-value');
        const noiseSpeedSlider = document.getElementById('noise-speed');
        const noiseSpeedValue = document.getElementById('noise-speed-value');

        noiseScaleSlider.addEventListener('input', () => {
            const value = noiseScaleSlider.value;
            noiseScaleValue.textContent = value;
            setNoiseScale(parseFloat(value));
        });

        noiseSpeedSlider.addEventListener('input', () => {
            const value = noiseSpeedSlider.value;
            noiseSpeedValue.textContent = value;
            setNoiseSpeed(parseFloat(value));
        });

        // Initialize displays
        noiseScaleValue.textContent = noiseScaleSlider.value;
        noiseSpeedValue.textContent = noiseSpeedSlider.value;
    }

    initializeErrorVisualization() {
        const showIRRadialToggle = document.getElementById('show-ir-radial');
        const showIRAngularToggle = document.getElementById('show-ir-angular');
        const showUWBRadialToggle = document.getElementById('show-uwb-radial');
        const showUWBAngularToggle = document.getElementById('show-uwb-angular');

        const handleErrorMapToggle = (activeToggle, toggleFunction) => {
            const allToggles = [showIRRadialToggle, showIRAngularToggle, showUWBRadialToggle, showUWBAngularToggle];

            if (!activeToggle.checked) {
                toggleFunction();
                return;
            }

            allToggles.forEach(toggle => {
                if (toggle !== activeToggle && toggle.checked) {
                    toggle.checked = false;
                    switch(toggle) {
                        case showIRRadialToggle:
                            toggleIRRadialError();
                            break;
                        case showIRAngularToggle:
                            toggleIRAngularError();
                            break;
                        case showUWBRadialToggle:
                            toggleUWBRadialError();
                            break;
                        case showUWBAngularToggle:
                            toggleUWBAngularError();
                            break;
                    }
                }
            });

            toggleFunction();
        };

        showIRRadialToggle.addEventListener('change', () => handleErrorMapToggle(showIRRadialToggle, toggleIRRadialError));
        showIRAngularToggle.addEventListener('change', () => handleErrorMapToggle(showIRAngularToggle, toggleIRAngularError));
        showUWBRadialToggle.addEventListener('change', () => handleErrorMapToggle(showUWBRadialToggle, toggleUWBRadialError));
        showUWBAngularToggle.addEventListener('change', () => handleErrorMapToggle(showUWBAngularToggle, toggleUWBAngularError));
    }
}

export const controls = new Controls();
