// http://catlikecoding.com/unity/tutorials/rounded-cube/

const EventEmitter = require('wolfy87-eventemitter');
import { mat4 } from 'gl-matrix/src/gl-matrix';
import {
	baseShaderFragSrc,
	baseShaderVertSrc,
	base2ShaderVertSrc,
	base2ShaderFragSrc,
	wireFrameFragSrc
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
	BLEND,
	LINES
} from 'tubugl-constants';

import { generateWireframeIndices } from 'tubugl-utils';

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
		this._isDepthTest = params.isDepthTest ? params.isDepthTest : true;
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
		this._makeBuffer();

		if (this._isWire) {
			this._makeWireframe();
			this._makeWireframeBuffer();
		}
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

		this._program = new Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
	}

	_makeWireframe() {
		this._wireframeProgram = new Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
	}

	_makeBuffer() {
		if (this._isGl2) {
			this._vao = new VAO(this._gl);
			this._vao.bind();
		}

		let cornerVertices = 8;
		let edgeVertices = (this._widthSegments + this._heightSegments + this._depthSegments - 3) * 4;
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

		if (this._vao) {
			this._positionBuffer.bind().attribPointer(this._program);
		}

		this._indexBuffer = new IndexArrayBuffer(
			this._gl,
			Box.getIndices(this._widthSegments, this._heightSegments, this._depthSegments)
		);
		this._cnt = this._indexBuffer.dataArray.length;
	}

	_makeWireframeBuffer() {
		this._wireframeIndexBuffer = new IndexArrayBuffer(
			this._gl,
			generateWireframeIndices(this._indexBuffer.dataArray)
		);
		console.log(this._wireframeIndexBuffer);
		this._wireframeIndexCnt = this._wireframeIndexBuffer.dataArray.length;
		console.log(this._wireframeIndexCnt);
	}

	update(camera) {
		this._camaera = camera;
		this._updateModelMatrix();

		let prg = this._program;
		prg.bind();

		if (this._vao) {
			this._vao.bind();
		} else {
			this._positionBuffer.bind().attribPointer(prg);
			// if (this._isWire) this._wireframeIndexBuffer.bind();
			this._indexBuffer.bind();
		}

		this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this._modelMatrix);
		this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
		this._gl.uniformMatrix4fv(prg.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);

		// prg.bind();

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

		this._gl.drawElements(TRIANGLES, this._cnt, UNSIGNED_SHORT, 0);

		if (this._isWire) this._drawWireframe();
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
	}

	_drawWireframe() {
		let camera = this._camaera;
		let prg = this._wireframeProgram;

		prg.bind();
		this._positionBuffer.bind().attribPointer(prg);
		this._wireframeIndexBuffer.bind();

		this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this._modelMatrix);
		this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
		this._gl.uniformMatrix4fv(prg.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);

		this._gl.drawElements(LINES, this._wireframeIndexCnt, UNSIGNED_SHORT, 0);
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

		indices = indices.concat(Box.setSideIndex(widthSegments, heightSegments, depthSegments, 'top'));
		indices = indices.concat(Box.setSideIndex(widthSegments, heightSegments, depthSegments, 'bottom'));

		indices = new Uint16Array(indices);

		return indices;
	}

	static setSideIndex(widthSegments, heightSegments, depthSegments, side) {
		let indices = [];
		let oneSideVertexNum = 2 * (widthSegments + depthSegments);
		let startNum = side === 'bottom' ? 0 : oneSideVertexNum * heightSegments;
		let bottomVertexNum =
			side === 'bottom'
				? oneSideVertexNum * (heightSegments + 1)
				: oneSideVertexNum * (heightSegments + 1) + (widthSegments - 1) * (depthSegments - 1);

		// top-left
		if (side === 'bottom') {
			indices.push(1 + startNum);
			indices.push(0 + startNum);
		} else {
			indices.push(0 + startNum);
			indices.push(1 + startNum);
		}
		indices.push(bottomVertexNum);

		if (side === 'bottom') {
			indices.push(bottomVertexNum);
			indices.push(0 + startNum);
		} else {
			indices.push(0 + startNum);
			indices.push(bottomVertexNum);
		}
		indices.push((widthSegments + depthSegments) * 2 - 1 + startNum);

		// top-right
		if (side === 'bottom') {
			indices.push(widthSegments + startNum);
			indices.push(widthSegments - 1 + startNum);
		} else {
			indices.push(widthSegments - 1 + startNum);
			indices.push(widthSegments + startNum);
		}
		indices.push(bottomVertexNum + widthSegments - 2);

		if (side === 'bottom') {
			indices.push(widthSegments + 1 + startNum);
			indices.push(widthSegments + startNum);
		} else {
			indices.push(widthSegments + startNum);
			indices.push(widthSegments + 1 + startNum);
		}
		indices.push(bottomVertexNum + widthSegments - 2);

		//bottom-right
		if (side === 'bottom') {
			indices.push(widthSegments + depthSegments + startNum);
			indices.push(widthSegments + depthSegments - 1 + startNum);
		} else {
			indices.push(widthSegments + depthSegments - 1 + startNum);
			indices.push(widthSegments + depthSegments + startNum);
		}
		indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 1) - 1);

		if (side === 'bottom') {
			indices.push(widthSegments + depthSegments + 1 + startNum);
			indices.push(widthSegments + depthSegments + startNum);
		} else {
			indices.push(widthSegments + depthSegments + startNum);
			indices.push(widthSegments + depthSegments + 1 + startNum);
		}
		indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 1) - 1);

		// bottom-right
		if (side === 'bottom') {
			indices.push(2 * widthSegments + depthSegments + startNum);
			indices.push(2 * widthSegments + depthSegments - 1 + startNum);
		} else {
			indices.push(2 * widthSegments + depthSegments - 1 + startNum);
			indices.push(2 * widthSegments + depthSegments + startNum);
		}
		indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 2));

		if (side === 'bottom') {
			indices.push(2 * widthSegments + depthSegments + 1 + startNum);
			indices.push(2 * widthSegments + depthSegments + startNum);
		} else {
			indices.push(2 * widthSegments + depthSegments + startNum);
			indices.push(2 * widthSegments + depthSegments + 1 + startNum);
		}
		indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 2));

		if (widthSegments - 2 > 0) {
			for (let xx = 1; xx < widthSegments - 1; xx++) {
				if (side === 'bottom') {
					indices.push(xx + 1 + startNum);
					indices.push(xx + startNum);
				} else {
					indices.push(xx + startNum);
					indices.push(xx + 1 + startNum);
				}
				indices.push(bottomVertexNum + (xx - 1));

				if (side === 'bottom') {
					indices.push(xx + 1 + startNum);
					indices.push(bottomVertexNum + (xx - 1));
				} else {
					indices.push(bottomVertexNum + (xx - 1));
					indices.push(xx + 1 + startNum);
				}
				indices.push(bottomVertexNum + xx);
			}

			for (let xx = 1; xx < widthSegments - 1; xx++) {
				if (side === 'bottom') {
					indices.push(widthSegments + depthSegments + 1 + xx + startNum);
					indices.push(widthSegments + depthSegments + xx + startNum);
				} else {
					indices.push(widthSegments + depthSegments + xx + startNum);
					indices.push(widthSegments + depthSegments + 1 + xx + startNum);
				}
				indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 1) - xx);

				if (side === 'bottom') {
					indices.push(widthSegments + depthSegments + 1 + xx + startNum);
					indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 1) - xx);
				} else {
					indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 1) - xx);
					indices.push(widthSegments + depthSegments + 1 + xx + startNum);
				}
				indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 1) - xx - 1);
			}

			// indices.push(bottomVertexNum + (widthSegments - 1) * zz - 1);
		}

		if (depthSegments - 2 > 0) {
			for (let zz = 1; zz < depthSegments - 1; zz++) {
				if (side === 'bottom') {
					indices.push(zz + 1 + widthSegments + startNum);
					indices.push(zz + widthSegments + startNum);
				} else {
					indices.push(zz + widthSegments + startNum);
					indices.push(zz + 1 + widthSegments + startNum);
				}
				indices.push(bottomVertexNum + (widthSegments - 1) * zz - 1);

				if (side === 'bottom') {
					indices.push(zz + 1 + widthSegments + startNum);
					indices.push(bottomVertexNum + (widthSegments - 1) * zz - 1);
				} else {
					indices.push(bottomVertexNum + (widthSegments - 1) * zz - 1);
					indices.push(zz + 1 + widthSegments + startNum);
				}
				indices.push(bottomVertexNum + (widthSegments - 1) * (zz + 1) - 1);
			}

			for (let zz = 1; zz < depthSegments - 1; zz++) {
				if (side === 'bottom') {
					indices.push(widthSegments * 2 + depthSegments + zz + 1 + startNum);
					indices.push(widthSegments * 2 + depthSegments + zz + startNum);
				} else {
					indices.push(widthSegments * 2 + depthSegments + zz + startNum);
					indices.push(widthSegments * 2 + depthSegments + zz + 1 + startNum);
				}
				indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 1 - zz));

				if (side === 'bottom') {
					indices.push(widthSegments * 2 + depthSegments + zz + 1 + startNum);
					indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 1 - zz));
				} else {
					indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 1 - zz));
					indices.push(widthSegments * 2 + depthSegments + zz + 1 + startNum);
				}

				indices.push(bottomVertexNum + (widthSegments - 1) * (depthSegments - 1 - zz - 1));
			}
		}

		if (widthSegments - 2 > 0 && depthSegments - 2 > 0) {
			for (let zz = 1; zz < depthSegments - 1; zz++) {
				let depthRow = (widthSegments - 1) * (zz - 1);

				for (let xx = 1; xx < widthSegments - 1; xx++) {
					if (side === 'bottom') {
						indices.push(bottomVertexNum + xx - 1 + depthRow);
						indices.push(bottomVertexNum + xx + widthSegments - 1 - 1 + depthRow);
					} else {
						indices.push(bottomVertexNum + xx + widthSegments - 1 - 1 + depthRow);
						indices.push(bottomVertexNum + xx - 1 + depthRow);
					}
					indices.push(bottomVertexNum + xx + depthRow);

					if (side === 'bottom') {
						indices.push(bottomVertexNum + xx + depthRow);
						indices.push(bottomVertexNum + xx + widthSegments - 1 - 1 + depthRow);
					} else {
						indices.push(bottomVertexNum + xx + widthSegments - 1 - 1 + depthRow);
						indices.push(bottomVertexNum + xx + depthRow);
					}
					indices.push(bottomVertexNum + xx + widthSegments - 1 + depthRow);
				}
			}
		}

		return indices;
	}

	static _getWireframeIndices(indexBuffer) {
		console.log(indexBuffer);
	}
}