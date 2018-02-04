/**
 * make demo with rendering of plane(webgl)
 */

const dat = require('../vendor/dat.gui.min');
const TweenLite = require('gsap/TweenLite');
const Stats = require('stats.js');

import { DEPTH_TEST } from 'tubugl-constants';
import { Cylinder } from '../../index';
import { NormalHelper, GridHelper } from 'tubugl-helper';
import { PerspectiveCamera, CameraController } from 'tubugl-camera';
import { mat4, vec3, vec4, glMatrix } from 'gl-matrix/src/gl-matrix';

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
function lookAtCustom(out, eye, center, up) {
	let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
	let eyex = eye[0];
	let eyey = eye[1];
	let eyez = eye[2];
	let upx = up[0];
	let upy = up[1];
	let upz = up[2];
	let centerx = center[0];
	let centery = center[1];
	let centerz = center[2];

	if (
		Math.abs(eyex - centerx) < glMatrix.EPSILON &&
		Math.abs(eyey - centery) < glMatrix.EPSILON &&
		Math.abs(eyez - centerz) < glMatrix.EPSILON
	) {
		return mat4.identity(out);
	}

	z0 = eyex - centerx;
	z1 = eyey - centery;
	z2 = eyez - centerz;

	len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
	z0 *= len;
	z1 *= len;
	z2 *= len;

	x0 = upy * z2 - upz * z1;
	x1 = upz * z0 - upx * z2;
	x2 = upx * z1 - upy * z0;
	len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
	if (!len) {
		// fix for disappearing
		// this part is from https://github.com/mrdoob/three.js/blob/master/src/math/Matrix4.js

		if (Math.abs(upz) === 1.0) {
			z0 += 0.0001;
		} else {
			z2 += 0.0001;
		}

		// normalize
		len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + 2 * z2);
		z0 *= len;
		z1 *= len;
		z2 *= len;

		x0 = upy * z2 - upz * z1;
		x1 = upz * z0 - upx * z2;
		x2 = upx * z1 - upy * z0;
		len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);

		len = 1 / len;
		x0 *= len;
		x1 *= len;
		x2 *= len;
	} else {
		len = 1 / len;
		x0 *= len;
		x1 *= len;
		x2 *= len;
	}

	y0 = z1 * x2 - z2 * x1;
	y1 = z2 * x0 - z0 * x2;
	y2 = z0 * x1 - z1 * x0;

	len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
	if (!len) {
		y0 = 0;
		y1 = 0;
		y2 = 0;
	} else {
		len = 1 / len;
		y0 *= len;
		y1 *= len;
		y2 *= len;
	}

	out[0] = x0;
	out[1] = y0;
	out[2] = z0;
	out[3] = 0;
	out[4] = x1;
	out[5] = y1;
	out[6] = z1;
	out[7] = 0;
	out[8] = x2;
	out[9] = y2;
	out[10] = z2;
	out[11] = 0;
	out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
	out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
	out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
	out[15] = 1;

	return out;
}

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

				lookAtCustom(matrix, position, [0, rad, 0], [0, 1, 0]);
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
			lookAtCustom(matrix, position, [0, rad, 0], [0, 1, 0]);
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
