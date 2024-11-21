import * as THREE from 'three';
import { unsignedMin, unsignedMax, mod, signedAngleDiff } from './utils.js';
import { ROBOT_RADIUS, UWB_MIN_SENSING_RADIUS, UWB_MAX_SENSING_RADIUS, UWB_PRECISION,
        IR_MIN_SENSING_RADIUS, IR_MAX_SENSING_RADIUS, IR_PRECISION, MAX_SPEED_M_S,
        MIN_SPEED_M_S, MAX_ROT_SPEED_RAD_S, ZOOM, COL_MIN, COL_MAX, ARENA_SIZE,
        getUWBAngularPrecision, getUWBRadialPrecision,
        getIRAngularPrecision, getIRRadialPrecision } from './constants.js';

class MarbleBot {
    constructor(i, color, x, y, theta) {
        this.i = i;

        this.name = `MarbleBot${i}`;
        this.color = color;
        this.x = x;
        this.y = y;
        this.r = ROBOT_RADIUS;

        this.theta = theta;

        const robot = new THREE.Group();

        const bodyGeometry = new THREE.SphereGeometry(ROBOT_RADIUS, 32, 32);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: this.color });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);

        const headGeometry = new THREE.SphereGeometry(ROBOT_RADIUS / 2, 32, 32);
        const headMaterial = new THREE.MeshBasicMaterial({ color: this.color });
        const headMesh = new THREE.Mesh(headGeometry, headMaterial);
        headMesh.position.set(ROBOT_RADIUS, 0, 0);

        robot.add(bodyMesh);
        robot.add(headMesh);
        robot.isMarbleBot = true;
        robot.ref = this;

        this.mesh = new THREE.Group();
        this.mesh.position.set(this.x, this.y, 0.05);
        this.mesh.rotation.z = this.theta;

        this.mesh.add(robot);
        this.mesh.ref = this;

        this.swarmMap = {}
        this.swarmMap[this.i] = {
            'uwb_distance': 0,
            'uwb_angle': 0,
            'uwb_ref_theta': 0,
            'uwb_other_theta': 0,
            'ir_distance': 0,
            'ir_angle': 0,
            'ir_ref_theta': 0,
            'ir_other_theta': 0,
            'is_moving': false
        };

        this.useHelper = false;
        this.currentRule = null;

        this.delta_angle = 0;
        this.delta_position = 0;

        this.targeted_delta_angle = undefined;
        this.targeted_delta_position = undefined;

        this.is_moving = false;
        this.selectedAsAnchor = false;
    }

    createHelpers(swarmCount) {


        const uwbLineMaterial = new THREE.LineBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.15,
        });

        for (let i = 0; i < swarmCount; i++) {
            let points = [];
            points.push( new THREE.Vector3( 0, 0, 0 ) );
            points.push( new THREE.Vector3( 0, 0, 0 ) );
            const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
            let line = new THREE.Line(lineGeometry, uwbLineMaterial);
            this.mesh.add(line);
        }


        const irLineMaterial = new THREE.LineBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.7,
        });

        for (let i = 0; i < swarmCount; i++) {
            let points = [];
            points.push( new THREE.Vector3( 0, 0, 0 ) );
            points.push( new THREE.Vector3( 0, 0, 0 ) );
            const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
            let line = new THREE.Line(lineGeometry, irLineMaterial);
            this.mesh.add(line);
        }

        const circleGeometry = new THREE.CircleGeometry(IR_MAX_SENSING_RADIUS, 32);
        const circleEdges = new THREE.EdgesGeometry( circleGeometry );
        const circleMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.2,
        });
        const circle = new THREE.LineLoop(circleEdges, circleMaterial);
        this.mesh.add(circle);

        // this.useHelper = true;
        this.swarmCount = swarmCount;
    }

    showHelpers() {
        this.mesh.children.slice(1).forEach(helper => {
            helper.visible = true;
        });
        this.useHelper = true;
    }

    hideHelpers() {
        this.mesh.children.slice(1).forEach(helper => {
            helper.visible = false;
        });
        this.useHelper = false;
    }

    senseSwarmIR(swarm) {
        swarm.forEach((marbleBot, i) => {
            if (marbleBot.name === this.name) return;

            let e_r_ir = ( 2 * Math.random() - 1 ) * getIRRadialPrecision();
            let e_theta_ir = ( 2 * Math.random() - 1 ) * getIRAngularPrecision();

            let ir_distance = Math.sqrt((this.x - marbleBot.x) ** 2 + (this.y - marbleBot.y) ** 2) + e_r_ir;
            let ir_angle = signedAngleDiff(Math.atan2(marbleBot.y - this.y, marbleBot.x - this.x) + e_theta_ir, this.theta);


            if (ir_distance < IR_MAX_SENSING_RADIUS && ir_distance > IR_MIN_SENSING_RADIUS) {
                if(!(marbleBot.i in this.swarmMap)) this.swarmMap[marbleBot.i] = {};
                let t = 0.3;

                // ir_distance = this.swarmMap[marbleBot.i]["ir_distance"] ? this.swarmMap[marbleBot.i]["ir_distance"] * (1 - t) + ir_distance * t : ir_distance;
                // ir_angle = this.swarmMap[marbleBot.i]["ir_angle"] ? this.swarmMap[marbleBot.i]["ir_angle"] * (1 - t) + ir_angle * t : ir_angle;

                this.swarmMap[marbleBot.i]["ir_distance"] = ir_distance;
                this.swarmMap[marbleBot.i]["ir_angle"] = ir_angle;
                this.swarmMap[marbleBot.i]["ir_ref_theta"] = this.theta;
                this.swarmMap[marbleBot.i]["ir_other_theta"] = marbleBot.theta;
                this.swarmMap[marbleBot.i]["is_moving"] = marbleBot.is_moving;

                if (this.useHelper) {
                    let line = this.mesh.children[1 + this.swarmCount + i];
                    let points = line.geometry.attributes.position.array;
                    points[3] = ir_distance * Math.cos(ir_angle);
                    points[4] = ir_distance * Math.sin(ir_angle);
                    line.geometry.attributes.position.needsUpdate = true;
                }
            } else {
                if (marbleBot.i in this.swarmMap) {
                    this.swarmMap[marbleBot.i]["ir_distance"] = 2 * IR_MAX_SENSING_RADIUS;
                }


                if (this.useHelper) {
                    let line = this.mesh.children[1 + this.swarmCount + i];
                    let points = line.geometry.attributes.position.array;
                    points[3] = 0;
                    points[4] = 0;
                    line.geometry.attributes.position.needsUpdate = true;
                }
            }
        });
    }

    senseSwarmUWB(swarm) {
        swarm.forEach((marbleBot, i) => {
            if (marbleBot.name === this.name) return;

            let e_r_uwb = ( 2 * Math.random() - 1 ) * getUWBRadialPrecision();
            let e_theta_uwb = ( 2 * Math.random() - 1 ) * getUWBAngularPrecision();

            let uwb_distance = Math.sqrt((this.x - marbleBot.x) ** 2 + (this.y - marbleBot.y) ** 2) + e_r_uwb;
            let uwb_angle = signedAngleDiff(Math.atan2(marbleBot.y - this.y, marbleBot.x - this.x) + e_theta_uwb, this.theta);

            if (uwb_distance < UWB_MAX_SENSING_RADIUS && uwb_distance > UWB_MIN_SENSING_RADIUS) {
                if(!(marbleBot.i in this.swarmMap)) this.swarmMap[marbleBot.i] = {};

                this.swarmMap[marbleBot.i]["uwb_distance"] = uwb_distance;
                this.swarmMap[marbleBot.i]["uwb_angle"] = uwb_angle;
                this.swarmMap[marbleBot.i]["uwb_ref_theta"] = this.theta;
                this.swarmMap[marbleBot.i]["uwb_other_theta"] = marbleBot.theta;
                this.swarmMap[marbleBot.i]["is_moving"] = marbleBot.is_moving;

                if (this.useHelper) {
                    let line = this.mesh.children[1 + i];
                    let points = line.geometry.attributes.position.array;
                    points[3] = uwb_distance * Math.cos(uwb_angle);
                    points[4] = uwb_distance * Math.sin(uwb_angle);
                    line.geometry.attributes.position.needsUpdate = true;
                }
            }

            else {
                if (marbleBot.i in this.swarmMap) {
                    this.swarmMap[marbleBot.i]["uwb_distance"] = 2 * UWB_MAX_SENSING_RADIUS;
                }

                if (this.useHelper) {
                    let line = this.mesh.children[1 + i];
                    let points = line.geometry.attributes.position.array;
                    points[3] = 0;
                    points[4] = 0;
                    line.geometry.attributes.position.needsUpdate = true;
                }
            }
        });
    }


    indexOfRule(rule, othersId) {
        if (rule.applies_to == this.i.toString() && rule.includeSelf) return this.i;
        if (rule.applies_to == "i-1") {
            let candidateI = this.i;
            while (candidateI > 0) {
                candidateI--;
                if (othersId.includes(candidateI.toString())) return candidateI;
            }
            return -1;
        }
        if (!isNaN(rule.applies_to)) {
            if (othersId.includes(rule.applies_to)) return parseInt(rule.applies_to);
        }
        return -1;
    }

    idDistance(i1, i2, othersId) {
        return Math.abs(othersId.indexOf(i1.toString()) - othersId.indexOf(i2.toString()));
    }

    applyRules(rules) {
        this.hideRule();
        // this.delta_position = 0;
        // this.delta_angle = 0;

        const othersId = Object.keys(this.swarmMap);//.sort();
        for (const rule of rules) {
            if ( !eval(rule.apply_if) ) continue;

            let candidateI = this.indexOfRule(rule, othersId);
            if (candidateI == -1) continue;
            const idDist = this.idDistance(this.i, candidateI, othersId);

            const otherMarbleBot = this.swarmMap[candidateI.toString()];

            const swarm_length = Math.max(1, Object.keys(this.swarmMap).length);

            const ir_distance = otherMarbleBot["ir_distance"];
            const ir_angle = otherMarbleBot["ir_angle"];
            const ir_ref_theta = otherMarbleBot["ir_ref_theta"];
            const ir_other_theta = otherMarbleBot["ir_other_theta"];

            if (ir_distance == undefined || (ir_distance > IR_MAX_SENSING_RADIUS && rule.measurement_type == "ir")) continue;

            const uwb_distance = otherMarbleBot["uwb_distance"];
            const uwb_angle = otherMarbleBot["uwb_angle"];
            const uwb_ref_theta = otherMarbleBot["uwb_ref_theta"];
            const uwb_other_theta = otherMarbleBot["uwb_other_theta"];

            if (uwb_distance == undefined || (uwb_distance > UWB_MAX_SENSING_RADIUS && rule.measurement_type == "uwb")) continue;

            if (rule.measurement_type == "ir" && !rule.isWithinDistanceRange(ir_distance)) continue;
            if (rule.measurement_type == "uwb" && !rule.isWithinDistanceRange(uwb_distance)) continue;

            if (rule.measurement_type == "ir" && !rule.isWithinAngleRange(signedAngleDiff(ir_angle + ir_ref_theta, this.theta))) continue;
            if (rule.measurement_type == "uwb" && !rule.isWithinAngleRange(signedAngleDiff(uwb_angle + uwb_ref_theta, this.theta))) continue;

            const other_is_moving = otherMarbleBot["is_moving"];

            const params = {
                i: this.i,
                other_i: candidateI,
                id_offset: idDist,
                theta: this.theta,
                ir_distance: ir_distance,
                ir_angle: ir_angle,
                ir_ref_theta: ir_ref_theta,
                ir_other_theta: ir_other_theta,
                uwb_distance: uwb_distance,
                uwb_angle: uwb_angle,
                uwb_ref_theta: uwb_ref_theta,
                uwb_other_theta: uwb_other_theta,
                other_is_moving: other_is_moving,
                swarm_length: swarm_length
            };

            const { delta_position, delta_angle, applies } = rule.apply({ ...params });
            if (!applies) continue;
            this.currentRule = rule;

            this.delta_position = delta_position;
            this.delta_angle = delta_angle; //mod(delta_angle + Math.PI, 2 * Math.PI) - Math.PI;
            this.targetId = candidateI;
            this.id_offset = idDist;
            this.showRule();
            return;
        }

    }

    showRule() {
        const rule = this.currentRule;
        if (! rule ) return;
        if (! this.useHelper ) return;

        // console.log(`Showing rule ${rule.name} for robot ${this.i}`);

        wrapper.drawings[rule.name + this.i] = () => {
            let scale = wrapper.height / (2*ZOOM);
            let d_out = 2 * rule.end_distance * scale;
            let d_in = 2 * rule.start_distance * scale;
            let x = wrapper.width / 2 + this.x * scale;
            let y = wrapper.height / 2 - this.y * scale;

            push();
            stroke(0, 0, 0, 255);
            strokeWeight(0.5);

            translate(x, y);
            text("i: " + this.i, 10, 10);
            text("Rule: " + rule.name, 10, 20);
            text("Delta Position: " + this.delta_position, 10, 30);
            text("Delta Angle: " + this.delta_angle, 10, 40);
            text("Theta: " + this.theta, 10, 50);
            text("IsMoving: " + this.is_moving, 10, 70);
            text("ID Offset: " + this.id_offset, 10, 80);
            if(this.targetId != undefined) text("Target: " + this.targetId, 10, 60);
            rotate(-this.theta);

            line(0, 0, this.delta_position * scale * Math.cos(this.delta_angle), this.delta_position * scale * Math.sin(this.delta_angle))

            // fill(255, 0, 0, 20);otherMarbleBot.i
            noFill();
            if(rule.measurement_type == "ir") arc(0, 0, d_out, d_out, rule.start_angle, rule.end_angle, PIE);
            pop();
        }
    }

    hideRule() {
        if (!this.currentRule) return;
        delete wrapper.drawings[this.currentRule.name + this.i];
    }

    applyPhysics(swarm) {
        for (let marbleBotId = 0; marbleBotId < swarm.length; marbleBotId++) {
            if (swarm[marbleBotId].i === this.i) continue;

            let dist = Math.sqrt((this.x - swarm[marbleBotId].x) ** 2 + (this.y - swarm[marbleBotId].y) ** 2);
            if (dist > 2 * ROBOT_RADIUS) continue;

            let angle = Math.atan2(this.y - swarm[marbleBotId].y, this.x - swarm[marbleBotId].x);
            let mid_x = (this.x + swarm[marbleBotId].x) / 2;
            let mid_y = (this.y + swarm[marbleBotId].y) / 2;
            this.x = mid_x + ROBOT_RADIUS * Math.cos(angle);
            this.y = mid_y + ROBOT_RADIUS * Math.sin(angle);
            swarm[marbleBotId].x = mid_x - ROBOT_RADIUS * Math.cos(angle);
            swarm[marbleBotId].y = mid_y - ROBOT_RADIUS * Math.sin(angle);
        }
    };

    update(dt) {
        this.is_moving = true;
        this.theta = mod(this.theta, 2 * Math.PI);
        const thetaMin = 0.01;


        if (this.targeted_delta_angle == undefined) this.targeted_delta_angle = this.delta_angle;
        if (this.targeted_delta_position == undefined) this.targeted_delta_position = this.delta_position;

        if (this.i == 0) console.log(this.targeted_delta_angle, this.targeted_delta_position, this.delta_angle, this.delta_position);
        // if (Math.abs(this.targeted_delta_angle) < Math.PI / 2 || (this.currentRule && !this.currentRule.is_moving)) {

        if (Math.abs(this.targeted_delta_angle) > thetaMin) {
            let angle_step = unsignedMin(this.targeted_delta_angle, MAX_ROT_SPEED_RAD_S * dt);
            this.targeted_delta_angle -= angle_step;
            this.theta += angle_step;
        } else if (Math.abs(this.targeted_delta_position) > thetaMin) {
            let position_step = unsignedMax(unsignedMin(this.targeted_delta_position, MAX_SPEED_M_S * dt), MIN_SPEED_M_S * dt);
            this.targeted_delta_position -= position_step;
            this.x += position_step * Math.cos(this.theta);
            this.y += position_step * Math.sin(this.theta);
        } else {
            this.targeted_delta_angle = undefined;
            this.targeted_delta_position = undefined;
            this.is_moving = false;
        }
        // } else {
        //     let alt_delta_angle = signedAngleDiff(Math.PI, this.delta_angle);
        //     if (Math.abs(alt_delta_angle) > thetaMin) {
        //         let angle_step = unsignedMin(alt_delta_angle, MAX_ROT_SPEED_RAD_S * dt);
        //         this.theta -= angle_step;
        //         this.is_moving = true;
        //     } else if (Math.abs(this.delta_position) > thetaMin) {
        //         let position_step = Math.max(Math.min(this.delta_position, MAX_SPEED_M_S * dt), MIN_SPEED_M_S * dt);
        //         this.x -= position_step * Math.cos(this.theta);
        //         this.y -= position_step * Math.sin(this.theta);
        //         this.is_moving = true;
        //     }
        // }
        //     if (unsignedAngleDiff(Math.PI, this.delta_angle) > 0.01) {
        //         let angle_step = unsignedMin(unsignedMin(signedAngleDiff(-Math.PI, this.delta_angle), signedAngleDiff(Math.PI, this.delta_angle)), MAX_ROT_SPEED_RAD_S * dt);
        //         this.theta -= angle_step;
        //     } else if (Math.abs(this.delta_position) > 0.03) {
        //         let position_step = Math.min(this.delta_position, MAX_SPEED_M_S * dt);
        //         this.x -= position_step * Math.cos(this.theta);
        //         this.y -= position_step * Math.sin(this.theta);
        //     }
        // }

        this.mesh.position.set(this.x, this.y, 0.05);
        this.mesh.rotation.z = this.theta;
    }

    applyRuleFormation() {
    }
}


export let createMarbleBot = (i, color, x, y, theta) => {
    return new MarbleBot(i, color, x, y, theta);
}

let distanceToClosest = (x, y, swarm) => {
    let distances = [];
    swarm.forEach(marbleBot => {
        let distance = Math.sqrt((x - marbleBot.x) ** 2 + (y - marbleBot.y) ** 2);
        distances.push(distance);
    });
    return Math.min(...distances);
}

/* Returns an array of MarbleBot objects
 * @param n: number of robots
 * @returns [MarbleBots]: array of MarbleBot objects
*/
export let createRandomSwarm = (n) => {
    let swarm = [];
    for (let i = 0; i < n; i++) {
        // if (i == 3) continue;

        let x = i == 0 ? -0.40 : Math.random() * ARENA_SIZE - ARENA_SIZE/2;
        let y = i == 0 ? 0 : Math.random() * ARENA_SIZE - ARENA_SIZE/2;
        let theta = i == 0 ? 0.5: Math.random() * 2 * Math.PI - Math.PI;

        // let r = Math.floor(COL_MIN + (COL_MAX - COL_MIN) * Math.random());
        // let g = Math.floor(COL_MIN + (COL_MAX - COL_MIN) * Math.random());
        // let b = Math.floor(COL_MIN + (COL_MAX - COL_MIN) * Math.random());
        let r = Math.floor(COL_MIN + (COL_MAX - COL_MIN) * i / n);
        let g = Math.floor(COL_MIN + (COL_MAX - COL_MIN) * (n - i) / n);Math.random()
        let b = Math.floor(200);
        let color = `rgb(${r},${g},${b})`;
        while (distanceToClosest(x, y, swarm) < 3*ROBOT_RADIUS) {
            x = Math.random() * ARENA_SIZE - ARENA_SIZE/2;
            y = Math.random() * ARENA_SIZE - ARENA_SIZE/2;
            console.log('repositioning');
        }
        let marbleBot = createMarbleBot(i, color, x, y, theta);
        swarm.push(marbleBot);
    }
    return swarm;
}
