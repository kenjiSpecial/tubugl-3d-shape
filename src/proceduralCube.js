// http://catlikecoding.com/unity/tutorials/rounded-cube/
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

import { generateWireframeIndices } from 'tubugl-utils';
import { Object3D } from './object3D';

export class ProceduralCube extends Object3D {
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
	render(camera) {
		this.update(camera).draw();
		if (this._isWire) this.updateWire(camera).drawWireframe();
	}

	update(camera) {
		this._updateModelMatrix();

		let prg = this._program;
		prg.bind();

		this._updateAttributes(prg);

		this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this.modelMatrix);
		this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
		this._gl.uniformMatrix4fv(
			prg.getUniforms('projectionMatrix').location,
			false,
			camera.projectionMatrix
		);

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

	_updateAttributes(prg) {
		if (this._vao) {
			this._vao.bind();
		} else {
			this._positionBuffer.bind().attribPointer(prg);
			this._indexBuffer.bind();
		}
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
