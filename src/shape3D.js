import { Program, ArrayBuffer } from 'tubugl-core';
import { Object3D } from './object3D';
import { IndexArrayBuffer } from 'tubugl-core/src/indexArrayBuffer';
import {
	CULL_FACE,
	BACK,
	FRONT,
	DEPTH_TEST,
	SRC_ALPHA,
	ONE_MINUS_SRC_ALPHA,
	BLEND,
	ONE,
	ZERO
} from 'tubugl-constants';

export class Shape3D extends Object3D {
	/**
	 *
	 * @param {webglContext} gl
	 * @param {*} params
	 */
	constructor(gl, params = {}) {
		super(gl, params);
	}

	_makeProgram(vertexShaderSrc, fragmentShaderSrc) {
		this._program = new Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
	}
	_useProgram() {
		this._program.use();
	}

	_makeBuffers(params = { buffers: {}, index: [], count: 0 }) {
		this._buffers = [];

		let buffers = params.buffer;
		for (let key in buffers) {
			let buffer = buffers[key];

			let positionBuffer = new ArrayBuffer(this._gl, buffer.array);
			positionBuffer.setAttribs(buffer.name, buffer.size);
			this._buffers.push(positionBuffer);
		}

		if (params.index) {
			let index = params.index;
			this._indexBuffer = new IndexArrayBuffer(this._gl, index.array);
			this._cnt = index.array.length;
		} else {
			this._cnt = params.count;
		}
	}

	_updateAttributes() {
		this._buffers.forEach(buffer => {
			buffer.bind().attribPointer(this._program);
		});
		this._indexBuffer.bind();
	}

	_updateUniforms(camera) {}

	/**
	 * update status of drawing
	 *
	 */
	_updateDrawStatus() {
		if (this._side === 'double') {
			this._gl.disable(CULL_FACE);
		} else if (this._side === 'front') {
			this._gl.enable(CULL_FACE);
			this._gl.cullFace(BACK);
		} else {
			this._gl.enable(CULL_FACE);
			this._gl.cullFace(FRONT);
		}

		if (this._isDepthTest) this._gl.enable(DEPTH_TEST);
		else this._gl.disable(DEPTH_TEST);

		if (this._isTransparent) {
			this.gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA);
			this._gl.enable(BLEND);
		} else {
			this._gl.blendFunc(ONE, ZERO);
			this._gl.disable(BLEND);
		}
	}

	_drawShape() {
		return this;
	}

	render(camera) {
		this.update(camera).draw();
	}

	update(camera) {
		this._updateModelMatrix(); // method which inherit from Object3D
		this._useProgram();
		this._updateAttributes();
		this._updateUniforms(camera);

		return this;
	}

	draw() {
		this._updateDrawStatus();
		this._drawShape();

		return this;
	}

	resize() {}

	addGui(gui) {}
}
