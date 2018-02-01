// import { ProceduralCube } from './proceduralCube';
import { Object3D } from './object3D';
import { ArrayBuffer, IndexArrayBuffer, Program } from 'tubugl-core';
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

import { generateWireframeIndices } from 'tubugl-utils';
import { Shape3D } from './shape3D';

export class ProceduralSphere extends Shape3D {
	constructor(gl, params = {}, rad = 100, segments = 10) {
		super(gl, params);
		this._rad = rad;
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

	update(camera) {
		this._updateModelMatrix();

		this._program.bind();

		this._updateAttributes(this._program);

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
				ProceduralSphere.getVertex(vertices, normals, xx, yy, 0, this._rad, this._segments);

			for (let zz = 1; zz <= this._segments; zz++)
				ProceduralSphere.getVertex(
					vertices,
					normals,
					this._segments,
					yy,
					zz,
					this._rad,
					this._segments
				);

			for (let xx = this._segments - 1; xx >= 0; xx--)
				ProceduralSphere.getVertex(
					vertices,
					normals,
					xx,
					yy,
					this._segments,
					this._rad,
					this._segments
				);

			for (let zz = this._segments - 1; zz > 0; zz--)
				ProceduralSphere.getVertex(vertices, normals, 0, yy, zz, this._rad, this._segments);
		}

		for (let zz = 1; zz < this._segments; zz++)
			for (let xx = 1; xx < this._segments; xx++)
				ProceduralSphere.getVertex(
					vertices,
					normals,
					xx,
					this._segments,
					zz,
					this._rad,
					this._segments
				);

		for (let zz = 1; zz < this._segments; zz++)
			for (let xx = 1; xx < this._segments; xx++)
				ProceduralSphere.getVertex(vertices, normals, xx, 0, zz, this._rad, this._segments);

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

	_updateAttributes(prg) {
		if (this._vao) {
			this._vao.bind();
		} else {
			this._positionBuffer.bind().attribPointer(prg);
			this._normalBuffer.bind().attribPointer(prg);
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

	static getVertex(vertices, normals, xx, yy, zz, rad, segment) {
		let vec = [xx * 2 / segment - 1, yy * 2 / segment - 1, zz * 2 / segment - 1];

		let x2 = vec[0] * vec[0];
		let y2 = vec[1] * vec[1];
		let z2 = vec[2] * vec[2];
		let ss = [];
		ss[0] = vec[0] * Math.sqrt(1 - y2 / 2 - z2 / 2 + y2 * z2 / 3);
		ss[1] = vec[1] * Math.sqrt(1 - x2 / 2 - z2 / 2 + x2 * z2 / 3);
		ss[2] = vec[2] * Math.sqrt(1 - x2 / 2 - y2 / 2 + x2 * y2 / 3);

		normals.push(ss[0], ss[1], ss[2]);
		vertices.push(rad * ss[0], rad * ss[1], rad * ss[2]);
	}

	static setQuad(indices, ii, v00, v10, v01, v11) {
		indices[ii] = v00;
		indices[ii + 1] = indices[ii + 4] = v01;
		indices[ii + 2] = indices[ii + 3] = v10;
		indices[ii + 5] = v11;
		return ii + 6;
	}
}
