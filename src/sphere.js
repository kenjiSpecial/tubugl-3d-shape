import { Shape3D } from './shape3D';
import { vec3 } from 'gl-matrix';

import { generateWireframeIndices } from 'tubugl-utils';
import {
	CULL_FACE,
	FRONT,
	BACK,
	TRIANGLES,
	UNSIGNED_SHORT,
	DEPTH_TEST,
	SRC_ALPHA,
	ONE,
	ZERO,
	BLEND,
	LINES,
	ONE_MINUS_SRC_ALPHA
} from 'tubugl-constants';

import {
	baseShaderVertSrc,
	baseUVShaderFragSrc,
	baseUVShaderVertSrc,
	base2ShaderVertSrc,
	base2ShaderFragSrc,
	wireFrameFragSrc
} from './shaders/base.shader';

import { Program, ArrayBuffer, IndexArrayBuffer, VAO } from 'tubugl-core';

export class Sphere extends Shape3D {
	/**
	 *
	 * @param {webglContext} gl
	 * @param {object} params
	 * @param {number} radius
	 * @param {number} widthSegments
	 * @param {number} heightSegments
	 * @param {number} phiStart
	 * @param {number} phiLength
	 * @param {number} thetaStart
	 * @param {number} thetaEnd
	 */
	constructor(
		gl,
		params = {},
		radius = 100,
		widthSegments = 10,
		heightSegments = 10,
		phiStart = 0,
		phiLength = 2 * Math.PI,
		thetaStart = 0,
		thetaLength = Math.PI
	) {
		super(gl, params);

		this._radius = radius;
		this._widthSegments = widthSegments;
		this._heightSegments = heightSegments;
		this._phiStart = phiStart;
		this._phiLength = phiLength;
		this._thetaStart = thetaStart;
		this._thetaLength = thetaLength;

		this._makeProgram(params);
		this._makeBuffers();

		if (this._isWire) {
			this._makeWireframe();
			this._makeWireframeBuffer();
		}
	}

	getModelMatrix() {
		return this.modelMatrix;
	}

	getVertice() {
		return this._positionBuffer.dataArray;
	}

	getNormals() {
		return this._normalBuffer.dataArray;
	}

	render(camera) {
		this.update(camera).draw();
		if (this._isWire) this.updateWire(camera).drawWireframe();
	}

	updateWire(camera) {
		let prg = this._wireframeProgram;

		prg.bind();
		this._positionBuffer.bind().attribPointer(prg);
		this._wireframeIndexBuffer.bind();

		this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this.modelMatrix);
		this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
		this._gl.uniformMatrix4fv(
			prg.getUniforms('projectionMatrix').location,
			false,
			camera.projectionMatrix
		);

		return this;
	}

	draw() {
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
			this._gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA);
			this._gl.enable(BLEND);
		} else {
			this._gl.blendFunc(ONE, ZERO);
			this._gl.disable(BLEND);
		}

		this._gl.drawElements(TRIANGLES, this._cnt, UNSIGNED_SHORT, 0);

		return this;
	}

	drawWireframe() {
		this._gl.drawElements(LINES, this._wireframeIndexCnt, UNSIGNED_SHORT, 0);

		return;
	}

	resize() {}

	addGui(gui) {
		gui
			.add(this, '_isWire')
			.name('isWire')
			.onChange(() => {
				if (this._isWire && !this._wireframeProgram) {
					this._makeWireframe();
					this._makeWireframeBuffer();
				}
			});

		let positionGui = gui.addFolder('position');
		positionGui.add(this.position, 'x', -100, 100);
		positionGui.add(this.position, 'y', -100, 100);
		positionGui.add(this.position, 'z', -100, 100);

		let rotationGui = gui.addFolder('rotation');
		rotationGui.add(this.rotation, 'x', -Math.PI, Math.PI).step(0.01);
		rotationGui.add(this.rotation, 'y', -Math.PI, Math.PI).step(0.01);
		rotationGui.add(this.rotation, 'z', -Math.PI, Math.PI).step(0.01);
	}

	_makeProgram(params) {
		const vertexShaderSrc = params.vertexShaderSrc
			? params.vertexShaderSrc
			: this._isGl2 ? base2ShaderVertSrc : baseUVShaderVertSrc;

		const fragmentShaderSrc = params.fragmentShaderSrc
			? params.fragmentShaderSrc
			: this._isGl2 ? base2ShaderFragSrc : baseUVShaderFragSrc;

		this._program = new Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
	}

	_makeWireframe() {
		this._wireframeProgram = new Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
	}
	_makeBuffers() {
		if (this._isGl2) {
			this._vao = new VAO(this._gl);
			this._vao.bind();
		}

		let { vertice, uvs, normals, indices } = Sphere.getData(
			this._radius,
			this._widthSegments,
			this._heightSegments,
			this._phiStart,
			this._phiLength,
			this._thetaStart,
			this._thetaLength
		);

		this._positionBuffer = new ArrayBuffer(this._gl, new Float32Array(vertice));
		this._positionBuffer.setAttribs('position', 3);
		this._normalBuffer = new ArrayBuffer(this._gl, new Float32Array(normals));
		this._normalBuffer.setAttribs('normal', 3);
		this._uvBuffer = new ArrayBuffer(this._gl, new Float32Array(uvs));
		this._uvBuffer.setAttribs('uv', 2);

		if (this._vao) {
			this._positionBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
			this._uvBuffer.bind().attribPointer(this._program);
		}

		this._indexBuffer = new IndexArrayBuffer(this._gl, new Uint16Array(indices));
		this._cnt = indices.length;
	}
	_makeWireframeBuffer() {
		this._wireframeIndexBuffer = new IndexArrayBuffer(
			this._gl,
			generateWireframeIndices(this._indexBuffer.dataArray)
		);
		this._wireframeIndexCnt = this._wireframeIndexBuffer.dataArray.length;
	}

	_updateAttributes() {
		if (this._vao) {
			this._vao.bind();
		} else {
			this._positionBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
			this._uvBuffer.bind().attribPointer(this._program);
			this._indexBuffer.bind();
		}
	}

	_updateUniforms(camera) {
		this._gl.uniformMatrix4fv(
			this._program.getUniforms('modelMatrix').location,
			false,
			this.modelMatrix
		);
		this._gl.uniformMatrix4fv(
			this._program.getUniforms('viewMatrix').location,
			false,
			camera.viewMatrix
		);
		this._gl.uniformMatrix4fv(
			this._program.getUniforms('projectionMatrix').location,
			false,
			camera.projectionMatrix
		);
	}

	static getData(
		radius,
		widthSegments,
		heightSegments,
		phiStart,
		phiLength,
		thetaStart,
		thetaLength
	) {
		let grid = [];
		let indices = [];
		let vertices = [];
		let normals = [];
		let uvs = [];
		let index = 0;
		let normalVec3 = vec3.create();

		for (let yy = 0; yy <= heightSegments; yy++) {
			let verticeRow = [];
			let vv = yy / heightSegments;
			for (let xx = 0; xx <= widthSegments; xx++) {
				var uu = xx / widthSegments;
				let phi = phiStart + phiLength * uu;
				let theta = thetaStart + thetaLength * vv;

				let vertex = [
					-radius * Math.cos(phi) * Math.sin(theta),
					radius * Math.cos(theta),
					radius * Math.sin(phi) * Math.sin(theta)
				];

				vertices.push(vertex[0], vertex[1], vertex[2]);

				vec3.normalize(normalVec3, vertex);
				normals.push(normalVec3[0], normalVec3[1], normalVec3[2]);

				uvs.push(uu, 1 - vv);

				verticeRow.push(index++);
			}

			grid.push(verticeRow);
		}

		let thetaEnd = thetaStart + thetaLength;
		for (let yy = 0; yy < heightSegments; yy++) {
			for (let xx = 0; xx < widthSegments; xx++) {
				var a = grid[yy][xx + 1];
				var b = grid[yy][xx];
				var c = grid[yy + 1][xx];
				var d = grid[yy + 1][xx + 1];

				if (yy !== 0 || thetaStart > 0) indices.push(a, b, d);
				if (yy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(b, c, d);
			}
		}

		return { vertice: vertices, uvs: uvs, normals: normals, indices: indices };
	}
}
