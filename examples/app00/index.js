/**
 * make demo with rendering of plane(webgl)
 */

const dat = require('../vendor/dat.gui.min');
const TweenLite = require('gsap/TweenLite');
const Stats = require('stats.js');

import { COLOR_BUFFER_BIT, DEPTH_BUFFER_BIT, DEPTH_TEST } from 'tubugl-constants';
import { ProceduralCube } from '../../src/index';
import { PerspectiveCamera } from 'tubugl-camera';

export default class App {
	constructor(params = {}) {
		this._isMouseDown = false;
		this._width = params.width ? params.width : window.innerWidth;
		this._height = params.height ? params.height : window.innerHeight;

		this.canvas = document.createElement('canvas');
		this.gl = this.canvas.getContext('webgl');

		this._setClear();
		this._makeBox();
		this._makeCamera();

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
	}

	loop() {
		if (this.stats) this.stats.update();

		let gl = this.gl;
		gl.viewport(0, 0, this._width, this._height);

		gl.clear(COLOR_BUFFER_BIT | DEPTH_BUFFER_BIT);
		this._camera
			.updatePosition(
				this._camera.rad1 * Math.sin(this._camera.theta) * Math.cos(this._camera.phi),
				this._camera.rad1 * Math.sin(this._camera.phi),
				this._camera.rad1 * Math.cos(this._camera.theta) * Math.cos(this._camera.phi)
			)
			.lookAt([0, 0, 0]);

		this._box.render(this._camera);
	}

	animateOut() {
		TweenLite.ticker.removeEventListener('tick', this.loop, this);
	}

	mouseMoveHandler(mouse) {
		if (!this._isMouseDown) return;
		this._camera.theta += (mouse.x - this._prevMouse.x) * Math.PI * 2;
		this._camera.phi += (mouse.y - this._prevMouse.y) * -Math.PI * 2;

		this._prevMouse = mouse;
	}

	mouseDownHandler(mouse) {
		this._isMouseDown = true;
		this._prevMouse = mouse;
	}

	mouseupHandler() {
		this._isMouseDown = false;
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

		this._box.resize(this._width, this._height);
		this._camera.updateSize(this._width, this._height);
	}

	destroy() {}
	_setClear() {
		this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
		this.gl.enable(DEPTH_TEST);
	}
	_makeBox() {
		this._box = new ProceduralCube(this.gl, 200, 200, 200, 4, 5, 6, {
			isWire: true
		});
		this._box.posTheta = 0;
		this._box.rotTheta = 0;
	}

	_makeCamera() {
		this._camera = new PerspectiveCamera(window.innerWidth, window.innerHeight, 60, 1, 2000);
		this._camera.theta = 0.2;
		this._camera.phi = 0.2;
		this._camera.rad1 = 800;
		this._camera.rad2 = 800;
	}

	_addGui() {
		this.gui = new dat.GUI();
		this.playAndStopGui = this.gui.add(this, '_playAndStop').name('pause');
		this._boxGUIFolder = this.gui.addFolder('plane');
		this._box.addGui(this._boxGUIFolder);
		this._boxGUIFolder.open();
	}
}
