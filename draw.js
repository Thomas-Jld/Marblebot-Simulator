// Global wrapper for p5.js drawings
window.wrapper = {
    drawings: {},
    drawn: [],
    canvases: {},
    width: 0,
    height: 0
};

// p5.js setup function
function setup() {
    const canvas = document.getElementById('p5Canvas');
    window.wrapper.width = canvas.clientWidth;
    window.wrapper.height = canvas.clientHeight;

    createCanvas(canvas.clientWidth, canvas.clientHeight, canvas);
    background(255);
}

// p5.js window resize handler
function windowResized() {
    const container = document.getElementById('simulation-container');
    resizeCanvas(container.clientWidth, container.clientHeight);

    window.wrapper.width = container.clientWidth;
    window.wrapper.height = container.clientHeight;
}

// p5.js draw function
function draw() {
    background(255);

    for (let key in wrapper.drawings) {
        wrapper.drawings[key]();
        wrapper.drawn.push(key);
    }
}
