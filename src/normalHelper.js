const EventEmitter = require('wolfy87-eventemitter');
import { Program } from 'tubugl-core';
import { VAO } from 'tubugl-core/src/vao';
import { ArrayBuffer } from 'tubugl-core/src/arrayBuffer';
import {
	CULL_FACE,
	DEPTH_TEST,
	SRC_ALPHA,
	ZERO,
	BLEND,
	POINTS,
	ONE,
	LINES,
	UNSIGNED_SHORT
} from 'tubugl-constants';
import { mat4 } from 'gl-matrix/src/gl-matrix';
import { IndexArrayBuffer } from 'tubugl-core/src/indexArrayBuffer';

const vertSrc = `
attribute vec3 position;
attribute vec3 normal;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

varying vec3 vBarycentricPosition;

void main() {
	gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position + normal * 3., 1.0);
	gl_PointSize = 6.;
}
`;
const fragSrc = `
precision mediump float;

void main() {
	float alpha = clamp( 4.0 * (1.0 - distance(gl_PointCoord, vec2(0.5))/0.5 ), 0.0, 1.0);

	if(alpha < 0.001 ) discard;
    
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
}
`;

const lineVertSrc = `
attribute vec3 position;
attribute vec3 normal;
attribute float side;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

uniform float lineLength;

varying vec3 vBarycentricPosition;

void main() {
	gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position + normal * lineLength * side, 1.0);
}
`;

const lineFragSrc = `
precision mediump float;

void main() {
    gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
}
`;

export class NormalHelper extends EventEmitter {
	constructor(gl, shape, params = {}) {
		super();

		this._gl = gl;
		this._shape = shape;
		this._isGl2 = !!params.isGL2;

		this._modelMatrix = mat4.create();
		this._lineLength = 20;
		this._makeProgram();
		this._makeBuffer();
	}
	_makeProgram() {
		this._program = new Program(this._gl, vertSrc, fragSrc);
		this._lineProgram = new Program(this._gl, lineVertSrc, lineFragSrc);
	}
	_makeBuffer() {
		if (this._isGl2) {
			this._vao = new VAO(this._gl);
			this._vao.bind();
		}

		const vertices = this._shape.getVertice();
		this._positionBuffer = new ArrayBuffer(this._gl, vertices);
		this._positionBuffer.setAttribs('position', 3);

		const normals = this._shape.getNormals();
		this._normalBuffer = new ArrayBuffer(this._gl, normals);
		this._normalBuffer.setAttribs('normal', 3);

		if (this._vao) {
			this._positionBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
		}

		this._pointNum = this._positionBuffer.dataArray.length / 3;
		let lineVertices = new Float32Array(vertices.length * 2);
		let normalVertices = new Float32Array(normals.length * 2);
		let sides = new Float32Array(vertices.length / 3 * 2);
		let indices = [];

		for (let ii = 0; ii < this._pointNum; ii++) {
			lineVertices[6 * ii] = vertices[3 * ii];
			lineVertices[6 * ii + 1] = vertices[3 * ii + 1];
			lineVertices[6 * ii + 2] = vertices[3 * ii + 2];

			lineVertices[6 * ii + 3] = vertices[3 * ii];
			lineVertices[6 * ii + 4] = vertices[3 * ii + 1];
			lineVertices[6 * ii + 5] = vertices[3 * ii + 2];

			normalVertices[6 * ii] = normals[3 * ii];
			normalVertices[6 * ii + 1] = normals[3 * ii + 1];
			normalVertices[6 * ii + 2] = normals[3 * ii + 2];

			normalVertices[6 * ii + 3] = normals[3 * ii];
			normalVertices[6 * ii + 4] = normals[3 * ii + 1];
			normalVertices[6 * ii + 5] = normals[3 * ii + 2];

			sides[2 * ii] = 0;
			sides[2 * ii + 1] = 1;

			indices.push(2 * ii);
			indices.push(2 * ii + 1);
		}

		this._linePositionBuffer = new ArrayBuffer(this._gl, lineVertices);
		this._linePositionBuffer.setAttribs('position', 3);

		this._lineNormalBuffer = new ArrayBuffer(this._gl, normalVertices);
		this._lineNormalBuffer.setAttribs('normal', 3);

		this._lineSideBuffer = new ArrayBuffer(this._gl, sides);
		this._lineSideBuffer.setAttribs('side', 1);

		this._lineIndexBuffer = new IndexArrayBuffer(this._gl, new Uint16Array(indices));
		this._lineCnt = this._lineIndexBuffer.dataArray.length;
	}
	_updateModelMatrix() {
		mat4.copy(this._modelMatrix, this._shape.modelMatrix);
		return this;
	}
	render(camera) {
		this._updateModelMatrix();
		this.updateDot(camera).drawDot();
		this.updateLine(camera).drawLine();
	}

	updateDot(camera) {
		this._program.bind();

		if (this._vao) {
			this._vao.bind();
		} else {
			this._positionBuffer.bind().attribPointer(this._program);
			// this._indexBuffer.bind();
			this._normalBuffer.bind().attribPointer(this._program);
		}

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
	updateLine(camera) {
		this._lineProgram.bind();

		this._linePositionBuffer.bind().attribPointer(this._lineProgram);
		this._lineNormalBuffer.bind().attribPointer(this._lineProgram);
		this._lineSideBuffer.bind().attribPointer(this._lineProgram);
		this._lineIndexBuffer.bind();

		this._gl.uniform1f(this._lineProgram.getUniforms('lineLength').location, this._lineLength);

		this._gl.uniformMatrix4fv(
			this._lineProgram.getUniforms('modelMatrix').location,
			false,
			this._modelMatrix
		);
		this._gl.uniformMatrix4fv(
			this._lineProgram.getUniforms('viewMatrix').location,
			false,
			camera.viewMatrix
		);
		this._gl.uniformMatrix4fv(
			this._lineProgram.getUniforms('projectionMatrix').location,
			false,
			camera.projectionMatrix
		);

		return this;
	}
	drawDot() {
		this._gl.disable(CULL_FACE);
		this._gl.enable(DEPTH_TEST);

		this._gl.blendFunc(SRC_ALPHA, ONE);
		this._gl.enable(BLEND);

		this._gl.drawArrays(POINTS, 0, this._pointNum);
	}
	drawLine() {
		this._gl.disable(CULL_FACE);
		this._gl.enable(DEPTH_TEST);

		this._gl.blendFunc(SRC_ALPHA, ZERO);
		this._gl.disable(BLEND);

		this._gl.drawElements(LINES, this._lineCnt, UNSIGNED_SHORT, 0);
	}
}
