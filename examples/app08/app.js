/**
 * make demo with rendering of plane(webgl)
 */

const dat = require('../vendor/dat.gui.min');
const TweenLite = require('gsap/TweenLite');
const Stats = require('stats.js');

import { DEPTH_TEST } from 'tubugl-constants';
import { Cylinder } from '../../index';
import { GridHelper } from 'tubugl-helper';
import { PerspectiveCamera, CameraController } from 'tubugl-camera';
import { mat4, vec3 } from 'gl-matrix/src/gl-matrix';
import { mathUtils } from 'tubugl-utils';

export default class App {
	constructor(params = {}) {
		this._isMouseDown = false;
		this._isPlaneAnimation = false;
		this._width = params.width ? params.width : window.innerWidth;
		this._height = params.height ? params.height : window.innerHeight;

		this.canvas = document.createElement('canvas');
		this.gl = this.canvas.getContext('webgl');

		this._setClear();
		this._makeObject();
		this._makeHelper();
		this._makeCamera();
		this._makeCameraController();

		this.resize(this._width, this._height);

		if (params.isDebug) {
			this.stats = new Stats();
			document.body.appendChild(this.stats.dom);
			this._addGui();
		}
	}

	animateIn() {
		this.isLoop = true;
		TweenLite.ticker.addEventListener('tick', this.loop, this);
		// this.loop();
	}

	loop() {
		if (this.stats) this.stats.update();

		let gl = this.gl;
		gl.viewport(0, 0, this._width, this._height);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		// this._cylinder.render(this._camera);
		this.shapes.forEach(shape => {
			shape.render(this._camera);
		});
		if (this._isNormal) this._normalHelper.render(this._camera);
		this._gridHelper.render(this._camera);
	}

	animateOut() {
		TweenLite.ticker.removeEventListener('tick', this.loop, this);
	}

	onKeyDown(ev) {
		switch (ev.which) {
			case 27:
				this._playAndStop();
				break;
		}
	}

	_playAndStop() {
		this.isLoop = !this.isLoop;
		if (this.isLoop) {
			TweenLite.ticker.addEventListener('tick', this.loop, this);
			this.playAndStopGui.name('pause');
		} else {
			TweenLite.ticker.removeEventListener('tick', this.loop, this);
			this.playAndStopGui.name('play');
		}
	}

	resize(width, height) {
		this._width = width;
		this._height = height;

		this.canvas.width = this._width;
		this.canvas.height = this._height;
		this.gl.viewport(0, 0, this._width, this._height);

		this.shapes.forEach(shape => {
			shape.resize(this._width, this._height);
		});
		this._camera.updateSize(this._width, this._height);
	}

	destroy() {}

	_setClear() {
		this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
		this.gl.enable(DEPTH_TEST);
	}

	_makeObject() {
		this.shapes = [];
		let matrix = mat4.create();

		let position = vec3.create();
		let segmentTheta = 20;
		let segmentPhi = 10;
		let rad = 200;

		for (let jj = 1; jj < segmentPhi - 1; jj++) {
			let phi = jj / segmentPhi * Math.PI;
			for (let ii = 0; ii < segmentTheta; ii++) {
				let theta = ii / segmentTheta * 2 * Math.PI;
				let sinPhi = Math.sin(phi);
				position[0] = rad * Math.cos(theta) * sinPhi;
				position[1] = rad * Math.cos(phi) + rad;
				position[2] = rad * Math.sin(theta) * sinPhi;

				let cylinder = new Cylinder(
					this.gl,
					{ isWire: false, disableUpdateModelMatrix: true },
					8,
					8,
					5,
					12,
					1
				);

				let rotMatrix = mat4.create();
				mat4.fromXRotation(rotMatrix, Math.PI / 2);

				mathUtils.lookAtCustom(matrix, position, [0, rad, 0], [0, 1, 0]);
				mat4.invert(matrix, matrix);
				mat4.multiply(matrix, matrix, rotMatrix);

				cylinder.updateModelMatrix(matrix);

				this.shapes.push(cylinder);
			}
		}

		for (let kk = 0; kk < 2; kk++) {
			let edgeCylinder = new Cylinder(
				this.gl,
				{ isWire: false, disableUpdateModelMatrix: true },
				8,
				8,
				5,
				12,
				1
			);

			position[0] = position[1] = position[2] = 0;
			if (kk % 2 == 0) position[1] = rad + rad;
			else position[1] = -1 * rad + rad;

			let rotMatrix = mat4.create();
			mat4.fromXRotation(rotMatrix, Math.PI / 2);
			mathUtils.lookAtCustom(matrix, position, [0, rad, 0], [0, 1, 0]);
			mat4.invert(matrix, matrix);
			mat4.multiply(matrix, matrix, rotMatrix);

			edgeCylinder.updateModelMatrix(matrix);

			this.shapes.push(edgeCylinder);
		}

		// this._cylinder.position.y = 50;
	}

	_makeHelper() {
		// this._normalHelper = new NormalHelper(this.gl, this._cylinder);
		this._gridHelper = new GridHelper(this.gl, 1000, 1000, 20, 20);
		// this._gridHelper.position.y = -200;
	}

	_makeCamera() {
		this._camera = new PerspectiveCamera(window.innerWidth, window.innerHeight, 60, 1, 2000);
		this._camera.position.z = 800;
		this._camera.position.x = 50;
		this._camera.position.y = 600;
		this._camera.lookAt([0, 0, 0]);
	}

	_makeCameraController() {
		this._cameraController = new CameraController(this._camera, this.canvas);
		this._cameraController.minDistance = 300;
		this._cameraController.maxDistance = 1000;
	}

	_addGui() {
		this._isNormal = false;
		this.gui = new dat.GUI();
		this.playAndStopGui = this.gui.add(this, '_playAndStop').name('pause');
		// this._cylinderGUIFolder = this.gui.addFolder('cylinder');
		// this._cylinderGUIFolder.add(this, '_isNormal').name('isNormal');
		// this._cylinder.addGui(this._cylinderGUIFolder);
		// this._cylinderGUIFolder.open();
	}
}
