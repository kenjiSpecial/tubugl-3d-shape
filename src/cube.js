import {
	baseUVShaderVertSrc,
	baseUVShaderFragSrc,
	base2ShaderVertSrc,
	base2ShaderFragSrc,
	wireFrameFragSrc,
	baseShaderVertSrc
} from './shaders/base.shader';
import { Program, ArrayBuffer, IndexArrayBuffer, VAO } from 'tubugl-core';
import { TRIANGLES, UNSIGNED_SHORT, LINES } from 'tubugl-constants';
import { generateWireframeIndices } from 'tubugl-utils';
import { Shape3D } from './shape3D';

export class Cube extends Shape3D {
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
