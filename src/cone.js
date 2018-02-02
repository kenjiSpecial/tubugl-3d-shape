import {
	Shape3D
} from './shape3D';
import {
	ArrayBuffer,
	IndexArrayBuffer,
	Program
} from 'tubugl-core';
import {
	normalShaderFragSrc,
	normalShaderVertSrc,
	base2ShaderVertSrc,
	base2ShaderFragSrc,
	wireFrameFragSrc,
	baseShaderVertSrc
} from './shaders/base.shader';

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
	generateWireframeIndices
} from 'tubugl-utils';
import {
	vec3
} from 'gl-matrix';

export class Cone extends Shape3D {
	constructor(gl, params, radius, height, radialSegments = 3) {
		super(gl, params);

		this._radius = radius;
		this._height = height;
		this._radialSegments = radialSegments;
		if (this._radialSegments < 3) {
			console.warn('make sure radialsegment more than 3');
			return;
		}

		this._makeProgram(params);
		this._makeBuffers(params, radialSegments);

		if (this._isWire) {
			this._makeWireframe();
			this._makeWireframeBuffer();
		}
	}

	getVertice() {
		return this._positionBuffer.dataArray;
	}

	getNormals() {
		return this._normalBuffer.dataArray;
	}

	render(camera) {
		this.update(camera).draw();
		// if(this._isWire) this.update
	}

	addGui(gui) {
		let positionFolder = gui.addFolder('position');
		positionFolder.add(this.position, 'x', -200, 200);
		positionFolder.add(this.position, 'y', -200, 200);
		positionFolder.add(this.position, 'z', -200, 200);

		let scaleFolder = gui.addFolder('scale');
		scaleFolder.add(this.scale, 'x', 0.05, 2).step(0.01);
		scaleFolder.add(this.scale, 'y', 0.05, 2).step(0.01);
		scaleFolder.add(this.scale, 'z', 0.05, 2).step(0.01);

		let rotationFolder = gui.addFolder('rotation');
		rotationFolder.add(this.rotation, 'x', -Math.PI, Math.PI).step(0.01);
		rotationFolder.add(this.rotation, 'y', -Math.PI, Math.PI).step(0.01);
		rotationFolder.add(this.rotation, 'z', -Math.PI, Math.PI).step(0.01);

		gui
			.add(this, '_isWire')
			.name('isWire')
			.onChange(() => {
				if (this._isWire && !this._wireframeProgram) {
					this._makeWireframe();
					this._makeWireframeBuffer();
				}
			});
	}

	// ========================
	//        private
	// ========================

	_makeProgram(params) {
		const vertexShaderSrc = params.vertexShaderSrc ?
			params.vertexShaderSrc :
			this._isGl2 ? base2ShaderVertSrc : normalShaderVertSrc;
		const fragmentShaderSrc = params.fragmentShaderSrc ?
			params.fragmentShaderSrc :
			this._isGl2 ? base2ShaderFragSrc : normalShaderFragSrc;

		this._program = new Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
	}
	_makeWireframe() {
		this._wireframeProgram = new Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
	}
	_makeBuffers() {
		let vertices = [];
		let rawVertices = [];
		let indices = [];
		let normals = [];

		let zPos = -this._height / 2;

		// make bottom part of shape
		rawVertices.push(0, 0, -this._height / 2);

		for (let ii = 0; ii < this._radialSegments; ii++) {
			let theta = ii / this._radialSegments * 2 * Math.PI;
			let xPos = Math.cos(theta) * this._radius;
			let yPos = Math.sin(theta) * this._radius;

			rawVertices.push(xPos, yPos, zPos);
		}

		// make side part of shape
		rawVertices.push(0, 0, this._height / 2);

		for (let ii = 0; ii < this._radialSegments; ii++) {
			let theta = ii / this._radialSegments * 2 * Math.PI;
			let xPos = Math.cos(theta) * this._radius;
			let yPos = Math.sin(theta) * this._radius;

			rawVertices.push(xPos, yPos, zPos);
		}

		// ----------------------
		// ----------------------

		for (let ii = 0; ii < this._radialSegments; ii++) {
			let curIndex = ii + 1;
			let nextIndex = (ii + 1) % this._radialSegments + 1;
			let center = 0;
			indices.push(curIndex, nextIndex, center);
		}

		for (let ii = 0; ii < this._radialSegments; ii++) {
			let curIndex = ii + this._radialSegments + 2;
			let nextIndex = (ii + 1) % this._radialSegments + this._radialSegments + 2;
			let center = this._radialSegments + 1;
			indices.push(curIndex, nextIndex, center);
		}

		// ----------------------
		// ----------------------

		indices.forEach(index => {
			let xPos = rawVertices[3 * index + 0];
			let yPos = rawVertices[3 * index + 1];
			let zPos = rawVertices[3 * index + 2];

			vertices.push(xPos, yPos, zPos);
		});

		// calculate normals
		let vec3A = vec3.create();
		let vec3B = vec3.create();
		let normalVec3 = vec3.create();

		for (let ii = 0; ii < vertices.length / 9; ii++) {
			for (let jj = 0; jj < 3; jj++) {
				let curPosX = vertices[9 * ii + 3 * jj];
				let curPosY = vertices[9 * ii + 3 * jj + 1];
				let curPosZ = vertices[9 * ii + 3 * jj + 2];

				let nextRPosX = vertices[9 * ii + 3 * ((jj + 1) % 3)];
				let nextRPosY = vertices[9 * ii + 3 * ((jj + 1) % 3) + 1];
				let nextRPosZ = vertices[9 * ii + 3 * ((jj + 1) % 3) + 2];

				let nextLPosX = vertices[9 * ii + 3 * ((jj + 2) % 3)];
				let nextLPosY = vertices[9 * ii + 3 * ((jj + 2) % 3) + 1];
				let nextLPosZ = vertices[9 * ii + 3 * ((jj + 2) % 3) + 2];

				vec3A[0] = nextRPosX - curPosX;
				vec3A[1] = nextRPosY - curPosY;
				vec3A[2] = nextRPosZ - curPosZ;

				vec3B[0] = nextLPosX - curPosX;
				vec3B[1] = nextLPosY - curPosY;
				vec3B[2] = nextLPosZ - curPosZ;

				vec3.cross(normalVec3, vec3A, vec3B);
				vec3.normalize(normalVec3, normalVec3);

				normals.push(normalVec3[0], normalVec3[1], normalVec3[2]);
			}
		}

	}
}