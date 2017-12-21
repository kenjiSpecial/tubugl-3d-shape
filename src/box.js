// http://catlikecoding.com/unity/tutorials/rounded-cube/

const EventEmitter = require('wolfy87-eventemitter');
import { mat4 } from 'gl-matrix/src/gl-matrix';
import {
	baseShaderFragSrc,
	baseShaderVertSrc,
	base2ShaderVertSrc,
	base2ShaderFragSrc
} from './shaders/base.shader';
import { Program, ArrayBuffer, IndexArrayBuffer, VAO } from 'tubugl-core';
import {
	CULL_FACE,
	FRONT,
	BACK,
	POINTS,
	TRIANGLES,
	UNSIGNED_SHORT,
	DEPTH_TEST,
	SRC_ALPHA,
	ONE,
	ZERO,
	BLEND
} from 'tubugl-constants';

export class Box extends EventEmitter {
	constructor(
		gl,
		width = 100,
		height = 100,
		depth = 100,
		widthSegments = 1,
		heightSegments = 1,
		depthSegments = 1,
		params = {}
	) {
		super();

		this._isNeedUpdate = true;
		this._isWire = !!params.isWire;
		this._isDepthTest = !!params.isDepthTest;
		this._isTransparent = !!params.isTransparent;
		this._isGl2 = params.isGl2;
		this._modelMatrix = mat4.create();

		this._gl = gl;
		this._side = params.side ? params.side : 'double'; // 'front', 'back', 'double'
		this._width = width;
		this._height = height;
		this._depth = depth;
		this._widthSegments = widthSegments;
		this._heightSegments = heightSegments;
		this._depthSegments = depthSegments;

		this._position = new Float32Array([0, 0, 0]);
		this._rotation = new Float32Array([0, 0, 0]);
		this._scale = new Float32Array([1, 1, 1]);

		this._makeProgram(params);
		this._makBuffer();
	}

	setPosition(x, y, z) {
		this._isNeedUpdate = true;

		if (x !== undefined) this._position[0] = x;
		if (y !== undefined) this._position[1] = y;
		if (z !== undefined) this._position[2] = z;

		return this;
	}

	setRotation(x, y, z) {
		this._isNeedUpdate = true;

		if (x !== undefined) this._rotation[0] = x;
		if (y !== undefined) this._rotation[1] = y;
		if (z !== undefined) this._rotation[2] = z;

		return this;
	}

	_makeProgram(params) {
		const fragmentShaderSrc = params.fragmentShaderSrc
			? params.fragmentShaderSrc
			: this._isGl2 ? base2ShaderFragSrc : baseShaderFragSrc;
		const vertexShaderSrc = params.vertexShaderSrc
			? params.vertexShaderSrc
			: this._isGl2 ? base2ShaderVertSrc : baseShaderVertSrc;

		this._program = new Program(
			this._gl,
			vertexShaderSrc,
			fragmentShaderSrc
		);
	}

	_makBuffer() {
		if (this._isGl2) {
			this._vao = new VAO(this._gl);
			this._vao.bind();
		}

		let cornerVertices = 8;
		let edgeVertices =
			(this._widthSegments +
				this._heightSegments +
				this._depthSegments -
				3) *
			4;
		let faceVertices =
			((this._widthSegments - 1) * (this._heightSegments - 1) +
				(this._widthSegments - 1) * (this._depthSegments - 1) +
				(this._heightSegments - 1) * (this._depthSegments - 1)) *
			2;
		this._verticeNum = cornerVertices + edgeVertices + faceVertices;

		this._positionBuffer = new ArrayBuffer(
			this._gl,
			Box.getVertices(
				this._width,
				this._height,
				this._depth,
				this._widthSegments,
				this._heightSegments,
				this._depthSegments
			)
		);
		this._positionBuffer.setAttribs('position', 3);

		/**
		this._barycentricPositionBuffer = new ArrayBuffer(
			this._gl,
			Plane._getBarycentricVertices(this._segmentW, this._segmentH)
		);
		this._barycentricPositionBuffer.setAttribs('barycentricPosition', 3);
		*/

		if (this._vao) {
			this._positionBuffer.bind().attribPointer(this._program);
			//this._barycentricPositionBuffer.bind().attribPointer(this._program);
		}

		// let indices = Plane._getIndices(this._segmentW, this._segmentH);
		// this._indexBuffer = new IndexArrayBuffer(this._gl, indices);

		// this._cnt = indices.length;

		// if (this._isWire) {
		// 	Plane._getWireframeIndices(this._indexBuffer);
		// }
	}

	update(camera) {
		this._updateModelMatrix();

		this._program.bind();

		if (this._vao) {
			this._vao.bind();
		} else {
			this._positionBuffer.bind().attribPointer(this._program);
			// this._barycentricPositionBuffer.bind().attribPointer(this._program);
			// this._indexBuffer.bind();
		}

		// this._gl.uniform1f(
		// 	this._program.getUniforms('uWireframe').location,
		// 	this._isWire
		// );
		this._gl.uniformMatrix4fv(
			this._program.getUniforms('modelMatrix').location,
			false,
			this._modelMatrix
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
			this._gl.blendFunc(SRC_ALPHA, ONE);
			this._gl.enable(BLEND);
		} else {
			this._gl.blendFunc(SRC_ALPHA, ZERO);
			this._gl.disable(BLEND);
		}

		// this._gl.drawElements(TRIANGLES, this._cnt, UNSIGNED_SHORT, 0);
		this._gl.drawArrays(
			POINTS,
			0,
			this._positionBuffer.dataArray.length / 3
		);
		// console.log(this._positionBuffer.dataArray.length / 3);

		// console.log(this._positionBuffer);

		return this;
	}

	resize() {}

	addGui(gui) {
		gui.add(this, '_isWire').name('isWire');
	}

	_updateModelMatrix() {
		if (!this._isNeedUpdate) return;

		mat4.fromTranslation(this._modelMatrix, this._position);
		mat4.scale(this._modelMatrix, this._modelMatrix, this._scale);

		mat4.rotateX(this._modelMatrix, this._modelMatrix, this._rotation[0]);
		mat4.rotateY(this._modelMatrix, this._modelMatrix, this._rotation[1]);
		mat4.rotateZ(this._modelMatrix, this._modelMatrix, this._rotation[2]);

		this._isNeedUpdate = false;

		return this;
	}

	static getVertices(
		width,
		height,
		depth,
		widthSegments,
		heightSegments,
		depthSegments
	) {
		let xx, yy, zz;
		let vertices = [];
		let verticeNum = 0;
		const widthRate = 1 / widthSegments;
		const heightRate = 1 / heightSegments;
		const depthRate = 1 / depthSegments;
		const halfWidth = width / 2;
		const halfHeight = height / 2;
		const halfDepth = depth / 2;

		for (yy = 0; yy <= heightSegments; yy++) {
			let yPos = -halfHeight + height * heightRate * yy;

			for (xx = 0; xx <= widthSegments; xx++) {
				vertices[verticeNum++] = width * widthRate * xx - halfWidth;
				vertices[verticeNum++] = yPos;
				vertices[verticeNum++] = -halfDepth;
			}
			for (zz = 1; zz <= depthSegments; zz++) {
				vertices[verticeNum++] = halfWidth;
				vertices[verticeNum++] = yPos;
				vertices[verticeNum++] = -halfDepth + zz * depthRate * depth;
			}
			for (xx = widthSegments - 1; xx >= 0; xx--) {
				vertices[verticeNum++] = width * widthRate * xx - halfWidth;
				vertices[verticeNum++] = yPos;
				vertices[verticeNum++] = halfDepth;
			}

			for (zz = depthSegments - 1; zz > 0; zz--) {
				vertices[verticeNum++] = -halfWidth;
				vertices[verticeNum++] = yPos;
				vertices[verticeNum++] = -halfDepth + zz * depthRate * depth;
			}
		}

		// bottom
		for (yy = 0; yy < 2; yy++) {
			let yPos = yy === 0 ? -halfHeight : halfHeight;
			for (zz = 1; zz < depthSegments; zz++) {
				let zPos = -halfDepth + zz * depthRate * depth;
				for (xx = 1; xx < widthSegments; xx++) {
					let xPos = -halfWidth + xx * widthRate * width;

					vertices[verticeNum++] = xPos;
					vertices[verticeNum++] = yPos;
					vertices[verticeNum++] = zPos;
				}
			}
		}

		vertices = new Float32Array(vertices);

		return vertices;
	}

	static _getBarycentricVertices(segmentW, segmentH) {
		let barycentricVertices = [];
		let barycentricId;

		for (let yy = 0; yy <= segmentH; yy++) {
			for (let xx = 0; xx <= segmentW; xx++) {
				barycentricId = 2 * yy + xx;
				switch (barycentricId % 3) {
					case 0:
						barycentricVertices.push(1);
						barycentricVertices.push(0);
						barycentricVertices.push(0);
						break;
					case 1:
						barycentricVertices.push(0);
						barycentricVertices.push(1);
						barycentricVertices.push(0);
						break;
					case 2:
						barycentricVertices.push(0);
						barycentricVertices.push(0);
						barycentricVertices.push(1);
						break;
				}
			}
		}

		barycentricVertices = new Float32Array(barycentricVertices);

		return barycentricVertices;
	}

	static getIndices(widthSegments, heightSegments, depthSegments) {
		let indices = [];

		/**
		for (let yy = 0; yy < segmentH; yy++) {
			for (let xx = 0; xx < segmentW; xx++) {
				let rowStartNum = yy * (segmentW + 1);
				let nextRowStartNum = (yy + 1) * (segmentW + 1);

				indices.push(rowStartNum + xx);
				indices.push(rowStartNum + xx + 1);
				indices.push(nextRowStartNum + xx);

				indices.push(rowStartNum + xx + 1);
				indices.push(nextRowStartNum + xx + 1);
				indices.push(nextRowStartNum + xx);
			}
		}
         */

		// indices = new Uint16Array(indices);

		return indices;
	}

	static _getWireframeIndices(indexBuffer) {
		console.log(indexBuffer);
	}
}
