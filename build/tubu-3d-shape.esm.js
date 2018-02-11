import { Vector3 } from 'tubugl-math/src/vector3';
import { Euler } from 'tubugl-math/src/euler';
import { mat4, vec3 } from 'gl-matrix';
import { Program, ArrayBuffer, IndexArrayBuffer, VAO } from 'tubugl-core';
import { IndexArrayBuffer as IndexArrayBuffer$1 } from 'tubugl-core/src/indexArrayBuffer';
import { CULL_FACE, BACK, FRONT, DEPTH_TEST, SRC_ALPHA, ONE_MINUS_SRC_ALPHA, BLEND, ONE, ZERO, TRIANGLES, UNSIGNED_SHORT, LINES } from 'tubugl-constants';
import { generateWireframeIndices } from 'tubugl-utils';
import { Program as Program$1 } from 'tubugl-core/src/program';
import { vec3 as vec3$1 } from 'gl-matrix/src/gl-matrix';

const baseShaderVertSrc = `
attribute vec4 position;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;


void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * position;
    gl_PointSize = 10.;
}`;

const baseShaderFragSrc = `
precision mediump float;

uniform bool uWireframe;

void main() {
    float colorR = gl_FrontFacing ? 1.0 : 0.0;
    float colorG = gl_FrontFacing ? 0.0 : 1.0;
    
    gl_FragColor = vec4(colorR, colorG, 0.0, 1.0);

}`;

const wireFrameFragSrc = `
precision mediump float;

void main(){
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

const base2ShaderVertSrc = `#version 300 es
in vec4 position;
in vec3 barycentricPosition;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

out vec3 vBarycentricPosition;

void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * position;
    
    vBarycentricPosition = barycentricPosition; 
}
`;

const base2ShaderFragSrc = `#version 300 es
precision mediump float;
in vec3 vBarycentricPosition;

uniform bool uWireframe;

out vec4 outColor;

void main() {

    if(uWireframe){
        float minBarycentricVal = min(min(vBarycentricPosition.x, vBarycentricPosition.y), vBarycentricPosition.z);
        if(minBarycentricVal > 0.01) discard;
    }
    
    outColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

const normalShaderVertSrc = `
attribute vec4 position;
attribute vec3 normal;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

varying vec3 vNormal;

void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * position;
    vNormal = normal;
}
`;

const normalShaderFragSrc = `
precision mediump float;

varying vec3 vNormal;

void main() {
    vec3 faceColor = (vNormal + vec3(0.5))/2.0;
    gl_FragColor = vec4(faceColor, 1.0);
}`;

const baseUVShaderVertSrc = `
attribute vec4 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

varying vec3 vNormal;
varying vec2 vUv;

void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * position;
    vNormal = normal;
    vUv = uv;
}`;

const baseUVShaderFragSrc = `
precision mediump float;

varying vec3 vNormal;
varying vec2 vUv;
void main() {
    vec3 outColor = (vNormal + vec3(1.0, 1.0, 1.0))/2.0;
    if(!gl_FrontFacing) outColor = vec3(1.0);
    
    // gl_FragColor = vec4( vec3(vUv, 0.0), 1.0);
    gl_FragColor = vec4(outColor, 1.0);

}`;

const baseTextureShaderFragSrc = `
precision mediump float;

varying vec3 vNormal;
varying vec2 vUv;

uniform sampler2D uTexture;

void main(){
    vec3 normal = vNormal;
    gl_FragColor = texture2D(uTexture, vUv);
}

`;

const EventEmitter = require('wolfy87-eventemitter');
/**
 * Object3d
 */
class Object3D extends EventEmitter {
	/**
	 * @param {webglContext} gl
	 * @param {{isGl2: boolean, side: string, isWirer: boolean, isDepthTest: boolean, isTransparent: boolean}} params
	 */
	constructor(gl, params = { isDepthTest: true }) {
		super();
		this._gl = gl;

		this.position = new Vector3();
		this.rotation = new Euler();
		this.scale = new Vector3(1, 1, 1);

		this.modelMatrix = mat4.create();

		this._isGl2 = params.isGl2;
		this._side = params.side ? params.side : 'double'; // 'front', 'back', 'double'
		this._isNeedUpdate = true;
		this._isWire = !!params.isWire;
		this._isDepthTest = params.isDepthTest === undefined ? true : params.isDepthTest;
		this._isTransparent = !!params.isTransparent;
	}

	updateModelMatrix(matrix) {
		mat4.copy(this.modelMatrix, matrix);
	}

	setPosition(x, y, z) {
		this._isNeedUpdate = true;

		if (x !== undefined) this.position.x = x;
		if (y !== undefined) this.position.y = y;
		if (z !== undefined) this.position.z = z;

		return this;
	}

	setRotation(x, y, z) {
		this._isNeedUpdate = true;

		if (x !== undefined) this.rotation.x = x;
		if (y !== undefined) this.rotation.y = y;
		if (z !== undefined) this.rotation.z = z;

		return this;
	}
	_updateModelMatrix() {
		if (
			!this._isNeedUpdate &&
			!this.position.needsUpdate &&
			!this.rotation.needsMatrixUpdate &&
			!this.scale.needsUpdate
		)
			return;

		mat4.fromTranslation(this.modelMatrix, this.position.array);
		mat4.scale(this.modelMatrix, this.modelMatrix, this.scale.array);

		this.rotation.updateMatrix();
		mat4.multiply(this.modelMatrix, this.modelMatrix, this.rotation.matrix);

		this._isNeedUpdate = false;
		this.position.needsUpdate = false;
		this.scale.needsUpdate = false;

		return this;
	}
}

class Shape3D extends Object3D {
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
			this._indexBuffer = new IndexArrayBuffer$1(this._gl, index.array);
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
			this._gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA);
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

class Cube extends Shape3D {
	constructor(
		gl,
		params = { isDepthTest: true },
		width = 100,
		height = 100,
		depth = 100,
		widthSegment = 1,
		heightSegment = 1,
		depthSegment = 1
	) {
		super(gl, params);

		this._width = width;
		this._height = height;
		this._depth = depth;
		this._widthSegment = widthSegment;
		this._heightSegment = heightSegment;
		this._depthSegment = depthSegment;

		this._makeProgram(params.vertexShaderSrc, params.fragmentShaderSrc);
		this._makeBuffer(params);

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
	_makeProgram(vertexShaderSrc, fragmentShaderSrc) {
		this._program = new Program(
			this._gl,
			vertexShaderSrc
				? vertexShaderSrc
				: this._isGl2 ? base2ShaderVertSrc : baseUVShaderVertSrc,
			fragmentShaderSrc
				? fragmentShaderSrc
				: this._isGl2 ? base2ShaderFragSrc : baseUVShaderFragSrc
		);
	}

	_makeWireframe() {
		this._wireframeProgram = new Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
	}

	_makeBuffer() {
		if (this._isGl2) {
			this._vao = new VAO(this._gl);
			this._vao.bind();
		}

		let cubeObj = Cube.getVertice(
			this._width,
			this._height,
			this._depth,
			this._widthSegment,
			this._heightSegment,
			this._depthSegment
		);

		let normals = Cube.getNormal(this._widthSegment, this._heightSegment, this._depthSegment);
		let indices = Cube.getIndices(this._widthSegment, this._heightSegment, this._depthSegment);
		this._positionBuffer = new ArrayBuffer(this._gl, new Float32Array(cubeObj.vertices));
		this._positionBuffer.setAttribs('position', 3);

		this._uvBuffer = new ArrayBuffer(this._gl, new Float32Array(cubeObj.uvs));
		this._uvBuffer.setAttribs('uv', 2);

		this._normalBuffer = new ArrayBuffer(this._gl, new Float32Array(normals));
		this._normalBuffer.setAttribs('normal', 3);

		if (this._vao) {
			this._positionBuffer.bind().attribPointer(this._program);
			this._uvBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
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
			this._uvBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
			this._indexBuffer.bind();
		}
	}

	render(camera) {
		this.update(camera).draw();
		if (this._isWire) this.updateWire(camera).drawWireframe();
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
		this._updateDrawStatus();
		this._gl.drawElements(TRIANGLES, this._cnt, UNSIGNED_SHORT, 0);

		return this;
	}

	drawWireframe() {
		this._gl.drawElements(LINES, this._wireframeIndexCnt, UNSIGNED_SHORT, 0);

		return;
	}

	resize() {}

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

	static getVertice(width, height, depth, widthSegment, heightSegment, depthSegment) {
		let vertices = [];
		let uvs = [];
		let xRate = 1 / widthSegment;
		let yRate = 1 / heightSegment;
		let zRate = 1 / depthSegment;

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii === 0 ? -1 : 1;
			for (let zz = 0; zz <= depthSegment; zz++) {
				let zPos = (-0.5 + zRate * zz) * depth;

				for (let xx = 0; xx <= widthSegment; xx++) {
					let xPos = (-0.5 + xRate * xx) * width;

					vertices.push(xPos);
					vertices.push(dir * height / 2);
					vertices.push(zPos);

					uvs.push(xx * xRate);

					if (ii == 1) uvs.push(zz * zRate);
					else uvs.push(1.0 - zz * zRate);
				}
			}
		}

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii === 0 ? -1 : 1;
			for (let yy = 0; yy <= heightSegment; yy++) {
				let yPos = (-0.5 + yRate * yy) * height;

				for (let xx = 0; xx <= widthSegment; xx++) {
					let xPos = (-0.5 + xRate * xx) * width;

					vertices.push(xPos);
					vertices.push(yPos);
					vertices.push(dir * depth / 2);

					if (ii == 1) uvs.push(xx * xRate);
					else uvs.push(1.0 - xx * xRate);

					uvs.push(1.0 - yy * yRate);
				}
			}
		}

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii === 0 ? -1 : 1;
			for (let yy = 0; yy <= heightSegment; yy++) {
				let yPos = (-0.5 + yRate * yy) * height;
				for (let zz = 0; zz <= depthSegment; zz++) {
					let zPos = (-0.5 + zRate * zz) * depth;

					vertices.push(dir * width / 2);
					vertices.push(yPos);
					vertices.push(zPos);

					if (ii === 0) uvs.push(zz * zRate);
					else uvs.push(1.0 - zz * zRate);
					uvs.push(1.0 - yy * yRate);
				}
			}
		}

		return { vertices: vertices, uvs: uvs };
	}

	static getIndices(widthSegment, heightSegment, depthSegment) {
		let indices = [];

		let num = 0;
		for (let ii = 0; ii < 2; ii++) {
			for (let yy = 0; yy < depthSegment; yy++) {
				for (let xx = 0; xx < widthSegment; xx++) {
					let rowStartNum = yy * (widthSegment + 1);
					let nextRowStartNum = (yy + 1) * (widthSegment + 1);

					if (ii == 0) {
						indices.push(rowStartNum + xx + num);
						indices.push(rowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + 1 + num);

						indices.push(rowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + num);
					} else {
						indices.push(rowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + num);
						indices.push(rowStartNum + xx + 1 + num);

						indices.push(rowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + 1 + num);
					}
				}
			}

			num += (widthSegment + 1) * (depthSegment + 1);
		}

		for (let ii = 0; ii < 2; ii++) {
			for (let yy = 0; yy < heightSegment; yy++) {
				for (let xx = 0; xx < widthSegment; xx++) {
					let rowStartNum = yy * (widthSegment + 1);
					let nextRowStartNum = (yy + 1) * (widthSegment + 1);

					if (ii == 0) {
						indices.push(rowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + num);
						indices.push(rowStartNum + xx + 1 + num);

						indices.push(rowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + 1 + num);
					} else {
						indices.push(rowStartNum + xx + num);
						indices.push(rowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + num + 1);

						indices.push(rowStartNum + xx + num);
						indices.push(nextRowStartNum + xx + 1 + num);
						indices.push(nextRowStartNum + xx + num);
					}
				}
			}

			num += (widthSegment + 1) * (heightSegment + 1);
		}

		for (let ii = 0; ii < 2; ii++) {
			for (let yy = 0; yy < heightSegment; yy++) {
				for (let zz = 0; zz < depthSegment; zz++) {
					let rowStartNum = yy * (depthSegment + 1);
					let nextRowStartNum = (yy + 1) * (depthSegment + 1);

					if (ii == 0) {
						indices.push(rowStartNum + zz + num);
						indices.push(rowStartNum + zz + 1 + num);
						indices.push(nextRowStartNum + zz + 1 + num);

						indices.push(rowStartNum + zz + num);
						indices.push(nextRowStartNum + zz + 1 + num);
						indices.push(nextRowStartNum + zz + num);
					} else {
						indices.push(rowStartNum + zz + num);
						indices.push(nextRowStartNum + zz + num);
						indices.push(rowStartNum + zz + 1 + num);

						indices.push(rowStartNum + zz + 1 + num);
						indices.push(nextRowStartNum + zz + num);
						indices.push(nextRowStartNum + zz + num + 1);
					}
				}
			}

			num += (depthSegment + 1) * (heightSegment + 1);
		}

		return indices;
	}
	static getNormal(widthSegment, heightSegment, depthSegment) {
		let normals = [];

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii == 0 ? -1 : 1;
			for (let yy = 0; yy <= depthSegment; yy++) {
				for (let xx = 0; xx <= widthSegment; xx++) {
					normals.push(0);
					normals.push(dir);
					normals.push(0);
				}
			}
		}

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii == 0 ? -1 : 1;
			for (let yy = 0; yy <= heightSegment; yy++) {
				for (let xx = 0; xx <= widthSegment; xx++) {
					normals.push(0);
					normals.push(0);
					normals.push(dir);
				}
			}
		}

		for (let ii = 0; ii < 2; ii++) {
			let dir = ii == 0 ? -1 : 1;
			for (let yy = 0; yy <= heightSegment; yy++) {
				for (let xx = 0; xx <= depthSegment; xx++) {
					normals.push(dir);
					normals.push(0);
					normals.push(0);
				}
			}
		}

		return normals;
	}
}

class TextureCube extends Cube {
	constructor(
		gl,
		width = 100,
		height = 100,
		depth = 100,
		widthSegment = 1,
		heightSegment = 1,
		depthSegment = 1,
		params = {}
	) {
		super(gl, params, width, height, depth, widthSegment, heightSegment, depthSegment);

		this._texture = params.texture;
	}
	_makeProgram() {
		this._program = new Program$1(this._gl, baseUVShaderVertSrc, baseTextureShaderFragSrc);
	}
	update(camera) {
		super.update(camera);

		if (this._texture) {
			this._program.setUniformTexture(this._texture.value, this._texture.name);
			this._texture.value.activeTexture().bind();
		}

		return this;
	}
}

// http://catlikecoding.com/unity/tutorials/rounded-cube/
class ProceduralCube extends Shape3D {
	constructor(
		gl,
		params = {},
		width = 100,
		height = 100,
		depth = 100,
		widthSegments = 1,
		heightSegments = 1,
		depthSegments = 1
	) {
		super(gl, params);

		this._width = width;
		this._height = height;
		this._depth = depth;
		this._widthSegments = widthSegments;
		this._heightSegments = heightSegments;
		this._depthSegments = depthSegments;

		this._makeProgram(params);
		this._makeBuffers(params);

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
			this.gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA);
			this._gl.enable(BLEND);
		} else {
			this._gl.blendFunc(ONE, ZERO); // default value https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc
			this._gl.disable(BLEND);
		}

		this._gl.drawElements(TRIANGLES, this._cnt, UNSIGNED_SHORT, 0);

		return this;
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

	drawWireframe() {
		this._gl.drawElements(LINES, this._wireframeIndexCnt, UNSIGNED_SHORT, 0);

		return;
	}

	_makeProgram(params) {
		const fragmentShaderSrc = params.fragmentShaderSrc
			? params.fragmentShaderSrc
			: this._isGl2 ? base2ShaderFragSrc : baseShaderFragSrc;
		const vertexShaderSrc = params.vertexShaderSrc
			? params.vertexShaderSrc
			: this._isGl2 ? base2ShaderVertSrc : baseShaderVertSrc;

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

		let cornerVertices = 8;
		let edgeVertices =
			(this._widthSegments + this._heightSegments + this._depthSegments - 3) * 4;
		let faceVertices =
			((this._widthSegments - 1) * (this._heightSegments - 1) +
				(this._widthSegments - 1) * (this._depthSegments - 1) +
				(this._heightSegments - 1) * (this._depthSegments - 1)) *
			2;
		this._verticeNum = cornerVertices + edgeVertices + faceVertices;

		this._positionBuffer = new ArrayBuffer(
			this._gl,
			ProceduralCube.getVertices(
				this._width,
				this._height,
				this._depth,
				this._widthSegments,
				this._heightSegments,
				this._depthSegments
			)
		);
		this._positionBuffer.setAttribs('position', 3);

		if (this._vao) {
			this._positionBuffer.bind().attribPointer(this._program);
		}

		this._indexBuffer = new IndexArrayBuffer(
			this._gl,
			ProceduralCube.getIndices(
				this._widthSegments,
				this._heightSegments,
				this._depthSegments
			)
		);

		this._cnt = this._indexBuffer.dataArray.length;
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

	static getVertices(width, height, depth, widthSegments, heightSegments, depthSegments) {
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
				vertices[verticeNum++] = halfDepth;
			}
			for (zz = 1; zz <= depthSegments; zz++) {
				vertices[verticeNum++] = halfWidth;
				vertices[verticeNum++] = yPos;
				vertices[verticeNum++] = halfDepth - zz * depthRate * depth;
			}
			for (xx = widthSegments - 1; xx >= 0; xx--) {
				vertices[verticeNum++] = width * widthRate * xx - halfWidth;
				vertices[verticeNum++] = yPos;
				vertices[verticeNum++] = -halfDepth;
			}

			for (zz = depthSegments - 1; zz > 0; zz--) {
				vertices[verticeNum++] = -halfWidth;
				vertices[verticeNum++] = yPos;
				vertices[verticeNum++] = halfDepth - zz * depthRate * depth;
			}
		}

		// bottom
		for (yy = 0; yy < 2; yy++) {
			let yPos = yy === 0 ? -halfHeight : halfHeight;
			for (zz = 1; zz < depthSegments; zz++) {
				let zPos = halfDepth - zz * depthRate * depth;
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
		let oneSideVertexNum = 2 * (widthSegments + depthSegments);

		for (let height = 0; height < heightSegments; height++) {
			let heightPosNum = oneSideVertexNum * height;

			for (let row = 0; row < oneSideVertexNum; row++) {
				indices.push(row + heightPosNum);
				if (row === oneSideVertexNum - 1) indices.push(0 + heightPosNum);
				else indices.push(row + 1 + heightPosNum);
				indices.push(row + oneSideVertexNum + heightPosNum);

				if (row === oneSideVertexNum - 1) {
					indices.push(0 + heightPosNum);
					indices.push(oneSideVertexNum + heightPosNum);
				} else {
					indices.push(row + 1 + heightPosNum);
					indices.push(row + 1 + oneSideVertexNum + heightPosNum);
				}

				indices.push(row + oneSideVertexNum + heightPosNum);
			}
		}

		indices = indices.concat(
			ProceduralCube.createFace(widthSegments, heightSegments, depthSegments, false)
		);
		indices = indices.concat(
			ProceduralCube.createFace(widthSegments, heightSegments, depthSegments)
		);

		indices = new Uint16Array(indices);

		return indices;
	}

	static createFace(widthSegments, heightSegments, depthSegments, isTop = true) {
		let indices = [];
		let ring = 2 * (widthSegments + depthSegments);
		let sideNum = isTop
			? ring * (heightSegments + 1) + (depthSegments - 1) * (widthSegments - 1)
			: ring * (heightSegments + 1);
		let startNum = isTop ? ring * heightSegments : 0;
		let setQuad = isTop ? ProceduralCube.setTopQuad : ProceduralCube.setQuad;

		if (widthSegments === 1 || depthSegments === 1) {
			let segments = Math.max(widthSegments, depthSegments);
			if (widthSegments === 1) {
				for (let ii = 0; ii < segments; ii++) {
					if (ii === 0)
						indices = indices.concat(
							setQuad(
								startNum + ii,
								startNum + ii + 1,
								startNum + ii + 2,
								startNum + ring - 1 - ii
							)
						);
					else
						indices = indices.concat(
							setQuad(
								startNum + ring - ii,
								startNum + ii + 1,
								startNum + ii + 2,
								startNum + ring - 1 - ii
							)
						);
				}
			} else {
				for (let ii = 0; ii < segments; ii++) {
					indices = indices.concat(
						setQuad(
							startNum + ii,
							startNum + ii + 1,
							startNum + ring - 2 - ii,
							startNum + ring - 1 - ii
						)
					);
				}
			}
		} else {
			indices = indices.concat(setQuad(startNum, startNum + 1, sideNum, startNum + ring - 1));

			for (let ii = 1; ii < widthSegments - 1; ii++) {
				indices = indices.concat(
					setQuad(startNum + ii, startNum + ii + 1, sideNum + ii, sideNum + ii - 1)
				);
			}

			indices = indices.concat(
				setQuad(
					startNum + widthSegments - 1,
					startNum + widthSegments,
					startNum + widthSegments + 1,
					sideNum + widthSegments - 2
				)
			);

			for (let jj = 1; jj < depthSegments - 1; jj++) {
				indices = indices.concat(
					setQuad(
						startNum + ring - jj,
						sideNum + (jj - 1) * (widthSegments - 1),
						sideNum + jj * (widthSegments - 1),
						startNum + ring - jj - 1
					)
				);

				for (let ii = 1; ii < widthSegments - 1; ii++) {
					indices = indices.concat(
						setQuad(
							sideNum + ii - 1 + (jj - 1) * (widthSegments - 1),
							sideNum + ii + (jj - 1) * (widthSegments - 1),
							sideNum + ii + jj * (widthSegments - 1),
							sideNum + ii + jj * (widthSegments - 1) - 1
						)
					);
				}

				indices = indices.concat(
					setQuad(
						sideNum + jj * (widthSegments - 1) - 1,
						startNum + widthSegments + jj,
						startNum + widthSegments + jj + 1,
						sideNum + (jj + 1) * (widthSegments - 1) - 1
					)
				);
			}

			indices = indices.concat(
				setQuad(
					startNum + ring - depthSegments + 1,
					sideNum + (depthSegments - 2) * (widthSegments - 1),
					startNum + ring - depthSegments - 1,
					startNum + ring - depthSegments
				)
			);

			for (let ii = 1; ii < widthSegments - 1; ii++) {
				indices = indices.concat(
					setQuad(
						sideNum + (depthSegments - 2) * (widthSegments - 1) + ii - 1,
						sideNum + (depthSegments - 2) * (widthSegments - 1) + ii,
						startNum + ring - depthSegments - ii - 1,
						startNum + ring - depthSegments - ii
					)
				);
			}

			indices = indices.concat(
				setQuad(
					sideNum + (depthSegments - 1) * (widthSegments - 1) - 1,
					startNum + widthSegments + depthSegments - 1,
					startNum + widthSegments + depthSegments,
					startNum + widthSegments + depthSegments + 1
				)
			);
		}

		return indices;
	}
	/**
	 *
	 * @param {Number} a
	 * @param {Number} b
	 * @param {Number} c
	 * @param {Number} d
	 */
	static setTopQuad(a, b, c, d) {
		let indices = [];

		indices.push(a);
		indices.push(b);
		indices.push(c);

		indices.push(c);
		indices.push(d);
		indices.push(a);

		return indices;
	}

	/**
	 *
	 *
	 * @param {Number} a
	 * @param {Number} b
	 * @param {Number} c
	 * @param {Number} d
	 */
	static setQuad(a, b, c, d) {
		let indices = [];

		indices.push(b);
		indices.push(a);
		indices.push(c);

		indices.push(d);
		indices.push(c);
		indices.push(a);

		return indices;
	}

	static _getWireframeIndices(indexBuffer) {
		console.log(indexBuffer);
	}
}

class ProceduralRoundingCube extends ProceduralCube {
	constructor(
		gl,
		params = {},
		width = 100,
		height = 100,
		depth = 100,
		roundness = 2,
		widthSegments = 1,
		heightSegments = 1,
		depthSegments = 1
	) {
		params.roundness = roundness;
		super(gl, params, width, height, depth, widthSegments, heightSegments, depthSegments);
	}

	getNormals() {
		return this._normalBuffer.dataArray;
	}

	_makeBuffers(params) {
		super._makeBuffers();

		let positionArray = this._positionBuffer.dataArray;
		let normals = [];

		let normal = vec3$1.create();
		let inner = vec3$1.create();
		let roundness = params.roundness;
		for (let ii = 0; ii < positionArray.length / 3; ii++) {
			let xx = positionArray[3 * ii];
			let yy = positionArray[3 * ii + 1];

			let zz = positionArray[3 * ii + 2];
			// vec3.set(normal, xx, yy, zz);
			vec3$1.set(inner, xx, yy, zz);

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

			vec3$1.set(normal, xx - inner[0], yy - inner[1], zz - inner[2]);
			vec3$1.normalize(normal, normal);

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

	_updateAttributes() {
		if (this._vao) {
			this._vao.bind();
		} else {
			this._positionBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
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

class ProceduralSphere extends Shape3D {
	constructor(gl, params = {}, radius = 100, segments = 10) {
		super(gl, params);
		this._radius = radius;
		this._segments = segments;

		this._makeProgram(params);
		this._makeBuffer(params);

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
			this.gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA);
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
	_makeProgram(params) {
		const vertexShaderSrc = params.vertexShaderSrc
			? params.vertexShaderSrc
			: this._isGl2 ? base2ShaderVertSrc : normalShaderVertSrc;
		const fragmentShaderSrc = params.fragmentShaderSrc
			? params.fragmentShaderSrc
			: this._isGl2 ? base2ShaderFragSrc : normalShaderFragSrc;

		this._program = new Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
	}
	_makeWireframe() {
		this._wireframeProgram = new Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
	}
	_makeBuffer() {
		var cornerVertices = 8;
		var edgeVertices = (this._segments + this._segments + this._segments - 3) * 4;
		var faceVertices =
			2 *
			((this._segments - 1) * (this._segments - 1) +
				(this._segments - 1) * (this._segments - 1) +
				(this._segments - 1) * (this._segments - 1));
		let verticesLength = cornerVertices + edgeVertices + faceVertices;

		let vertices = [];
		let normals = [];
		this.ring = (this._segments + this._segments) * 2;

		for (let yy = 0; yy <= this._segments; yy++) {
			for (let xx = 0; xx <= this._segments; xx++)
				ProceduralSphere.getVertex(
					vertices,
					normals,
					xx,
					yy,
					0,
					this._radius,
					this._segments
				);

			for (let zz = 1; zz <= this._segments; zz++)
				ProceduralSphere.getVertex(
					vertices,
					normals,
					this._segments,
					yy,
					zz,
					this._radius,
					this._segments
				);

			for (let xx = this._segments - 1; xx >= 0; xx--)
				ProceduralSphere.getVertex(
					vertices,
					normals,
					xx,
					yy,
					this._segments,
					this._radius,
					this._segments
				);

			for (let zz = this._segments - 1; zz > 0; zz--)
				ProceduralSphere.getVertex(
					vertices,
					normals,
					0,
					yy,
					zz,
					this._radius,
					this._segments
				);
		}

		for (let zz = 1; zz < this._segments; zz++)
			for (let xx = 1; xx < this._segments; xx++)
				ProceduralSphere.getVertex(
					vertices,
					normals,
					xx,
					this._segments,
					zz,
					this._radius,
					this._segments
				);

		for (let zz = 1; zz < this._segments; zz++)
			for (let xx = 1; xx < this._segments; xx++)
				ProceduralSphere.getVertex(
					vertices,
					normals,
					xx,
					0,
					zz,
					this._radius,
					this._segments
				);

		let indexNum = 0;
		let indices = [];
		let ind = 0;
		for (var yy = 0; yy < this._segments; yy++) {
			for (var ii = 0; ii < this.ring - 1; ii++) {
				indexNum = ProceduralSphere.setQuad(
					indices,
					indexNum,
					ind,
					ind + 1,
					ind + this.ring,
					ind + this.ring + 1
				);
				ind++;
			}

			indexNum = ProceduralSphere.setQuad(
				indices,
				indexNum,
				ind,
				ind - this.ring + 1,
				ind + this.ring,
				ind + 1
			);
			ind++;
		}

		indexNum = this._createTopRings(indices, indexNum, this.ring);
		indexNum = this._createBottomFace(indices, indexNum, this.ring, verticesLength);

		this._positionBuffer = new ArrayBuffer(this._gl, new Float32Array(vertices));
		this._positionBuffer.setAttribs('position', 3);

		this._normalBuffer = new ArrayBuffer(this._gl, new Float32Array(normals));
		this._normalBuffer.setAttribs('normal', 3);

		if (this._vao) {
			this._positionBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
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

	_updateAttributes() {
		if (this._vao) {
			this._vao.bind();
		} else {
			this._positionBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
			this._indexBuffer.bind();
		}
	}

	_createTopRings(indices, indexNum, ring) {
		var v = this.ring * this._segments;
		for (var xx = 0; xx < this._segments - 1; xx++, v++) {
			indexNum = ProceduralSphere.setQuad(
				indices,
				indexNum,
				v,
				v + 1,
				v + ring - 1,
				v + ring
			);
		}

		indexNum = ProceduralSphere.setQuad(indices, indexNum, v, v + 1, v + ring - 1, v + 2);

		var vMin = ring * (this._segments + 1) - 1;
		var vMid = vMin + 1;
		var vMax = v + 2;

		for (var z = 1; z < this._segments - 1; z++, vMin--, vMid++, vMax++) {
			indexNum = ProceduralSphere.setQuad(
				indices,
				indexNum,
				vMin,
				vMid,
				vMin - 1,
				vMid + this._segments - 1
			);
			for (var x = 1; x < this._segments - 1; x++, vMid++) {
				indexNum = ProceduralSphere.setQuad(
					indices,
					indexNum,
					vMid,
					vMid + 1,
					vMid + this._segments - 1,
					vMid + this._segments
				);
			}
			indexNum = ProceduralSphere.setQuad(
				indices,
				indexNum,
				vMid,
				vMax,
				vMid + this._segments - 1,
				vMax + 1
			);
		}

		var vTop = vMin - 2;
		indexNum = ProceduralSphere.setQuad(indices, indexNum, vMin, vMid, vMin - 1, vMin - 2);

		for (var x = 1; x < this._segments - 1; x++, vTop--, vMid++) {
			indexNum = ProceduralSphere.setQuad(indices, indexNum, vMid, vMid + 1, vTop, vTop - 1);
		}

		indexNum = ProceduralSphere.setQuad(indices, indexNum, vMid, vTop - 2, vTop, vTop - 1);

		return indexNum;
	}

	_createBottomFace(indices, indexNum, ring, verticeLength) {
		var v = 1;
		var vMid = verticeLength - (this._segments - 1) * (this._segments - 1);

		indexNum = ProceduralSphere.setQuad(indices, indexNum, ring - 1, vMid, 0, 1);
		for (var x = 1; x < this._segments - 1; x++, v++, vMid++) {
			indexNum = ProceduralSphere.setQuad(indices, indexNum, vMid, vMid + 1, v, v + 1);
		}
		indexNum = ProceduralSphere.setQuad(indices, indexNum, vMid, v + 2, v, v + 1);

		var vMin = ring - 2;
		vMid -= this._segments - 2;
		var vMax = v + 2;

		for (var z = 1; z < this._segments - 1; z++, vMin--, vMid++, vMax++) {
			indexNum = ProceduralSphere.setQuad(
				indices,
				indexNum,
				vMin,
				vMid + this._segments - 1,
				vMin + 1,
				vMid
			);
			for (var x = 1; x < this._segments - 1; x++, vMid++) {
				indexNum = ProceduralSphere.setQuad(
					indices,
					indexNum,
					vMid + this._segments - 1,
					vMid + this._segments,
					vMid,
					vMid + 1
				);
			}
			indexNum = ProceduralSphere.setQuad(
				indices,
				indexNum,
				vMid + this._segments - 1,
				vMax + 1,
				vMid,
				vMax
			);
		}

		var vTop = vMin - 1;
		indexNum = ProceduralSphere.setQuad(indices, indexNum, vTop + 1, vTop, vTop + 2, vMid);
		for (var x = 1; x < this._segments - 1; x++, vTop--, vMid++) {
			indexNum = ProceduralSphere.setQuad(indices, indexNum, vTop, vTop - 1, vMid, vMid + 1);
		}
		indexNum = ProceduralSphere.setQuad(indices, indexNum, vTop, vTop - 1, vMid, vTop - 2);

		return indexNum;
	}

	static getVertex(vertices, normals, xx, yy, zz, radius, segment) {
		let vec = [xx * 2 / segment - 1, yy * 2 / segment - 1, zz * 2 / segment - 1];

		let x2 = vec[0] * vec[0];
		let y2 = vec[1] * vec[1];
		let z2 = vec[2] * vec[2];
		let ss = [];
		ss[0] = vec[0] * Math.sqrt(1 - y2 / 2 - z2 / 2 + y2 * z2 / 3);
		ss[1] = vec[1] * Math.sqrt(1 - x2 / 2 - z2 / 2 + x2 * z2 / 3);
		ss[2] = vec[2] * Math.sqrt(1 - x2 / 2 - y2 / 2 + x2 * y2 / 3);

		normals.push(ss[0], ss[1], ss[2]);
		vertices.push(radius * ss[0], radius * ss[1], radius * ss[2]);
	}

	static setQuad(indices, ii, v00, v10, v01, v11) {
		indices[ii] = v00;
		indices[ii + 1] = indices[ii + 4] = v01;
		indices[ii + 2] = indices[ii + 3] = v10;
		indices[ii + 5] = v11;
		return ii + 6;
	}
}

class Sphere extends Shape3D {
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

class Cone extends Shape3D {
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
		if (this._isWire) this.updateWire(camera).drawWireframe();
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
		const vertexShaderSrc = params.vertexShaderSrc
			? params.vertexShaderSrc
			: this._isGl2 ? base2ShaderVertSrc : normalShaderVertSrc;
		const fragmentShaderSrc = params.fragmentShaderSrc
			? params.fragmentShaderSrc
			: this._isGl2 ? base2ShaderFragSrc : normalShaderFragSrc;

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

		let yPos = -this._height / 2;

		// make bottom part of shape
		rawVertices.push(0, yPos, 0);

		for (let ii = 0; ii < this._radialSegments; ii++) {
			let theta = ii / this._radialSegments * 2 * Math.PI;
			let xPos = Math.cos(theta) * this._radius;
			let zPos = Math.sin(theta) * this._radius;

			rawVertices.push(xPos, yPos, zPos);
		}

		// make side part of shape

		rawVertices.push(0, -yPos, 0);

		for (let ii = 0; ii < this._radialSegments; ii++) {
			let theta = ii / this._radialSegments * 2 * Math.PI;
			let xPos = Math.cos(theta) * this._radius;
			let zPos = Math.sin(theta) * this._radius;

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
			indices.push(curIndex, center, nextIndex);
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

		this._positionBuffer = new ArrayBuffer(this._gl, new Float32Array(vertices));
		this._positionBuffer.setAttribs('position', 3);

		this._normalBuffer = new ArrayBuffer(this._gl, new Float32Array(normals));
		this._normalBuffer.setAttribs('normal', 3);

		this._cnt = vertices.length / 3;
	}

	_makeWireframeBuffer() {
		let vertices = [];
		let yPos = -this._height / 2;
		let topPos = { x: 0, y: -yPos, z: 0 };
		let bottomPos = { x: 0, y: yPos, z: 0 };

		for (let ii = 0; ii < this._radialSegments; ii++) {
			let theta = ii / this._radialSegments * 2 * Math.PI;
			let nextTheta = (ii + 1) / this._radialSegments * 2 * Math.PI;

			let xPos = Math.cos(theta) * this._radius;
			let zPos = Math.sin(theta) * this._radius;

			let nextXPos = Math.cos(nextTheta) * this._radius;
			let nextZPos = Math.sin(nextTheta) * this._radius;

			vertices.push(xPos, yPos, zPos, nextXPos, yPos, nextZPos);
			vertices.push(nextXPos, yPos, nextZPos, topPos.x, topPos.y, topPos.z);
			vertices.push(topPos.x, topPos.y, topPos.z, xPos, yPos, zPos);
			vertices.push(xPos, yPos, zPos, bottomPos.x, bottomPos.y, bottomPos.z);
			vertices.push(nextXPos, yPos, nextZPos, bottomPos.x, bottomPos.y, bottomPos.z);
		}

		this._wirePositionBuffer = new ArrayBuffer(this._gl, new Float32Array(vertices));
		this._wirePositionBuffer.setAttribs('position', 3);

		this._wireframeCnt = vertices.length / 3;
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

	_updateAttributes() {
		this._positionBuffer.bind().attribPointer(this._program);
		this._normalBuffer.bind().attribPointer(this._program);
	}

	draw() {
		this._updateDrawStatus();
		this._gl.drawArrays(TRIANGLES, 0, this._cnt);

		return this;
	}
	updateWire(camera) {
		let prg = this._wireframeProgram;

		prg.bind();
		this._wirePositionBuffer.bind().attribPointer(prg);
		// this._wireframeIndexBuffer.bind();

		this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this.modelMatrix);
		this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
		this._gl.uniformMatrix4fv(
			prg.getUniforms('projectionMatrix').location,
			false,
			camera.projectionMatrix
		);

		return this;
	}

	drawWireframe() {
		this._gl.drawArrays(LINES, 0, this._wireframeCnt);
		return this;
	}
}

class Cylinder extends Shape3D {
	constructor(
		gl,
		params,
		radiusTop,
		radiusBottom,
		height,
		radialSegments = 3,
		heightSegments = 2
	) {
		super(gl, params);

		this._radiusTop = radiusTop;
		this._radiusBottom = radiusBottom;
		this._height = height;
		this._radialSegments = radialSegments;
		this._heightSegments = heightSegments;

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
		if (this._isWire) this.updateWire(camera).drawWireframe();
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
		const vertexShaderSrc = params.vertexShaderSrc
			? params.vertexShaderSrc
			: this._isGl2 ? base2ShaderVertSrc : normalShaderVertSrc;
		const fragmentShaderSrc = params.fragmentShaderSrc
			? params.fragmentShaderSrc
			: this._isGl2 ? base2ShaderFragSrc : normalShaderFragSrc;

		this._program = new Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
	}

	_makeWireframe() {
		this._wireframeProgram = new Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
	}

	_makeBuffers() {
		let vertices = [];
		let indices = [];
		let normals = [];
		let uvs = [];
		let index = 0;

		index = this._generateTorso(vertices, indices, normals, uvs, index);
		index = this._generateCap(true, vertices, indices, normals, uvs, index);
		index = this._generateCap(false, vertices, indices, normals, uvs, index);

		// console.log(vertices, indices, normals, uvs);

		this._positionBuffer = new ArrayBuffer(this._gl, new Float32Array(vertices));
		this._positionBuffer.setAttribs('position', 3);

		this._normalBuffer = new ArrayBuffer(this._gl, new Float32Array(normals));
		this._normalBuffer.setAttribs('normal', 3);

		this._uvBuffer = new ArrayBuffer(this._gl, new Float32Array(uvs));
		this._uvBuffer.setAttribs('uv', 2);

		this._indexBuffer = new IndexArrayBuffer(this._gl, new Uint16Array(indices));

		this._cnt = indices.length;
	}

	_generateTorso(vertices, indices, normals, uvs, index) {
		let slope = (this._radiusBottom - this._radiusBottom) / this._height;
		let indexArray = [];

		let normal = vec3.create();

		for (let yy = 0; yy <= this._heightSegments; yy++) {
			let indexRow = [];
			let vv = yy / this._heightSegments;

			let radius = vv * (this._radiusBottom - this._radiusTop) + this._radiusTop;

			for (let xx = 0; xx <= this._radialSegments; xx++) {
				let uu = xx / this._radialSegments;
				let theta = 2 * Math.PI * uu;

				let sinTheta = Math.sin(theta);
				let cosTheta = Math.cos(theta);

				vertices.push(radius * sinTheta, (-vv + 0.5) * this._height, radius * cosTheta);
				vec3.normalize(normal, [sinTheta, slope, cosTheta]);
				normals.push(normal[0], normal[1], normal[2]);
				uvs.push(uu, 1 - vv);

				indexRow.push(index++);
			}

			indexArray.push(indexRow);
		}

		for (let xx = 0; xx < this._radialSegments; xx++) {
			for (let yy = 0; yy < this._heightSegments; yy++) {
				var a = indexArray[yy][xx];
				var b = indexArray[yy + 1][xx];
				var c = indexArray[yy + 1][xx + 1];
				var d = indexArray[yy][xx + 1];

				// faces

				indices.push(a, b, d);
				indices.push(b, c, d);
			}
		}

		return index;
	}

	_generateCap(isTop = true, vertices, indices, normals, uvs, index) {
		let centerIndexStart, centerIndexEnd;

		let sign = isTop === true ? 1 : -1;
		let radius = isTop === true ? this._radiusTop : this._radiusBottom;

		centerIndexStart = index;

		for (let xx = 1; xx <= this._radialSegments; xx++) {
			vertices.push(0, this._height / 2 * sign, 0);
			normals.push(0, sign, 0);
			uvs.push(0.5, 0.5);
			index++;
		}

		centerIndexEnd = index;

		for (let xx = 0; xx <= this._radialSegments; xx++) {
			let u = xx / this._radialSegments;
			let theta = u * 2 * Math.PI;

			let cosTheta = Math.cos(theta);
			let sinTheta = Math.sin(theta);

			vertices.push(radius * sinTheta, sign * this._height / 2, radius * cosTheta);

			normals.push(0, sign, 0);

			uvs.push(cosTheta * 0.5 + 0.5, sinTheta * 0.5 * sign + 0.5);
			index++;
		}

		for (let xx = 0; xx < this._radialSegments; xx++) {
			let c = centerIndexStart + xx;
			let i = centerIndexEnd + xx;

			if (top === true) {
				// face top

				indices.push(i, i + 1, c);
			} else {
				// face bottom

				indices.push(i + 1, i, c);
			}
		}

		return index;
	}

	_makeWireframeBuffer() {
		this._wireframeIndexBuffer = new IndexArrayBuffer(
			this._gl,
			generateWireframeIndices(this._indexBuffer.dataArray)
		);
		this._wireframeIndexCnt = this._wireframeIndexBuffer.dataArray.length;
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

	_updateAttributes() {
		this._positionBuffer.bind().attribPointer(this._program);
		this._uvBuffer.bind().attribPointer(this._program);
		this._normalBuffer.bind().attribPointer(this._program);
		this._indexBuffer.bind();
	}

	draw() {
		this._updateDrawStatus();
		this._gl.drawElements(TRIANGLES, this._cnt, UNSIGNED_SHORT, 0);

		return this;
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

	drawWireframe() {
		this._gl.drawElements(LINES, this._wireframeIndexCnt, UNSIGNED_SHORT, 0);
		return this;
	}
}

export { Cube, TextureCube, ProceduralCube, ProceduralRoundingCube, ProceduralSphere, Sphere, Cone, Cylinder };
