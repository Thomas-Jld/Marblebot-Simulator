# Marblebots Simulator

This is a simulator for the Marblebots project. It is web-based and written in JavaScript. The graphics are rendered using the [Three.js](https://threejs.org/) library.

## Project Structure

The project is organized into several key components:

### Core Files
- `index.html` - Main entry point, contains the UI layout and sensor error controls
- `script.js` - Main application script, handles initialization and animation loop
- `style.css` - Stylesheet for the application

### Source Files (`src/`)
- `constants.js` - Configuration constants and dynamic sensor error parameters
- `marblebots.js` - MarbleBot class implementation and swarm creation
- `rules.js` - Movement and formation rules for the swarm
- `utils.js` - Utility functions for mathematical operations
- `scene.js` - Three.js scene setup and management

## Features

### Swarm Simulation
- Simulates a swarm of robotic marbles (Marblebots)
- Each MarbleBot has:
  - UWB (Ultra-Wideband) sensing capabilities
  - IR (Infrared) sensing capabilities
  - Movement and rotation controls

### Sensor Simulation
- UWB Sensor:
  - Range: 0.3m to 20.0m
  - Configurable angular and radial error
  - Used for long-range detection and formation
- IR Sensor:
  - Range: 0.01m to 0.32m
  - Configurable angular and radial error
  - Used for close-range detection and collision avoidance

### Interactive Controls
- Sensor Error Controls:
  - UWB Angular Error (0.017 to 0.51 rad)
  - UWB Radial Error (0.01 to 0.3 m)
  - IR Angular Error (0.017 to 0.57 rad)
  - IR Radial Error (0.01 to 0.3 m)
- Simulation Controls:
  - Regenerate button to reset the simulation
  - Formation selection buttons

### Formation Rules
The simulation implements several formation rules:
- Face North - Basic orientation rule
- IR Move Away from Anchor - Collision avoidance
- UWB Shape Circle - Circle formation using UWB sensors
- UWB Face Circle Center - Orientation towards circle center

## Technical Details

### MarbleBot Class
Each MarbleBot instance includes:
- Physical properties (position, orientation, radius)
- Sensor simulation (UWB and IR)
- Helper visualizations for debugging
- Movement and physics simulation

### Sensor Implementation
- Sensors use configurable error values to simulate real-world noise
- Error is applied using random distribution within the specified range
- Both angular and radial components can be adjusted independently

### Formation Control
- Rules-based approach for formation control
- Each rule can be enabled/disabled independently
- Rules consider sensor data and relative positions of other Marblebots

## Usage

1. Open `index.html` in a web browser
2. Use the control panel on the right to:
   - Adjust sensor error values using sliders
   - Select different formation rules
   - Regenerate the simulation
3. Observe the Marblebots forming patterns based on the active rules

## Dependencies
- Three.js - 3D graphics library
- p5.js - Creative coding library
