import { Program, ArrayBuffer } from 'tubugl-core';
import { Object3D } from './object3D';
import { IndexArrayBuffer } from 'tubugl-core/src/indexArrayBuffer';
export class Shape3D extends Object3D {
	/**
	 *
	 * @param {webglContext} gl
	 * @param {*} params
	 */
	constructor(gl, params = {}) {
		super(gl, params);
		this.disableUpdateModelMatrix = !!params.disableUpdateModelMatrix;
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
			this._gl.disable(this._gl.CULL_FACE);
		} else if (this._side === 'front') {
			this._gl.enable(this._gl.CULL_FACE);
			this._gl.cullFace(this._gl.BACK);
		} else {
			this._gl.enable(this._gl.CULL_FACE);
			this._gl.cullFace(this._gl.FRONT);
		}

		if (this._isDepthTest) this._gl.enable(this._gl.DEPTH_TEST);
		else this._gl.disable(this._gl.DEPTH_TEST);

		if (this._isTransparent) {
			this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);
			this._gl.enable(this._gl.BLEND);
		} else {
			this._gl.blendFunc(this._gl.ONE, this._gl.ZERO);
			this._gl.disable(this._gl.BLEND);
		}
	}

	_drawShape() {
		return this;
	}

	render(camera) {
		this.update(camera).draw();
	}

	update(camera) {
		if (!this.disableUpdateModelMatrix) this._updateModelMatrix(); // method which inherit from Object3D
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
