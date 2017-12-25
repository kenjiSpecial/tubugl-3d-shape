import { ProceduralCube } from './proceduralCube';
import { ArrayBuffer, Program } from 'tubugl-core';
import { vec3 } from 'gl-matrix/src/gl-matrix';
import {
	base2ShaderVertSrc,
	base2ShaderFragSrc,
	normalShaderFragSrc,
	normalShaderVertSrc
} from './shaders/base.shader';

export class ProceduralRoundingCube extends ProceduralCube {
	constructor(
		gl,
		width = 100,
		height = 100,
		depth = 100,
		roundness = 2,
		widthSegments = 1,
		heightSegments = 1,
		depthSegments = 1,
		params = {}
	) {
		params.roundness = roundness;
		super(gl, width, height, depth, widthSegments, heightSegments, depthSegments, params);
	}

	getNormals() {
		return this._normalBuffer.dataArray;
	}

	_makeBuffers() {
		super._makeBuffers();

		let positionArray = this._positionBuffer.dataArray;
		let normals = [];

		let normal = vec3.create();
		let inner = vec3.create();
		let roundness = this._params.roundness;
		for (let ii = 0; ii < positionArray.length / 3; ii++) {
			let xx = positionArray[3 * ii];
			let yy = positionArray[3 * ii + 1];

			let zz = positionArray[3 * ii + 2];
			// vec3.set(normal, xx, yy, zz);
			vec3.set(inner, xx, yy, zz);

			if (xx < -this._width / 2 + roundness) {
				inner[0] = -this._width / 2 + roundness;
			} else if (xx > this._width / 2 - roundness) {
				inner[0] = this._width / 2 - roundness;
			}

			if (yy < -this._height / 2 + roundness) {
				inner[1] = -this._height / 2 + roundness;
			} else if (yy > this._height / 2 - roundness) {
				inner[1] = this._height / 2 - roundness;
			}

			if (zz < -this._depth / 2 + roundness) {
				inner[2] = -this._depth / 2 + roundness;
			} else if (zz > this._depth / 2 - roundness) {
				inner[2] = this._depth / 2 - roundness;
			}

			vec3.set(normal, xx - inner[0], yy - inner[1], zz - inner[2]);
			vec3.normalize(normal, normal);

			positionArray[3 * ii] = inner[0] + normal[0] * roundness;
			positionArray[3 * ii + 1] = inner[1] + normal[1] * roundness;
			positionArray[3 * ii + 2] = inner[2] + normal[2] * roundness;

			normals.push(normal[0]);
			normals.push(normal[1]);
			normals.push(normal[2]);
		}

		this._positionBuffer.bind().setData(positionArray);

		this._normalBuffer = new ArrayBuffer(this._gl, new Float32Array(normals));
		this._normalBuffer.setAttribs('normal', 3);
	}

	_updateAttributes(prg) {
		if (this._vao) {
			this._vao.bind();
		} else {
			this._positionBuffer.bind().attribPointer(prg);
			this._normalBuffer.bind().attribPointer(prg);
			this._indexBuffer.bind();
		}
	}

	_makeProgram(params) {
		const vertexShaderSrc = params.vertexShaderSrc
			? params.vertexShaderSrc
			: this._isGl2 ? base2ShaderVertSrc : normalShaderVertSrc;

		const fragmentShaderSrc = params.fragmentShaderSrc
			? params.fragmentShaderSrc
			: this._isGl2 ? base2ShaderFragSrc : normalShaderFragSrc;

		this._program = new Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
	}
}
