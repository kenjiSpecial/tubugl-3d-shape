(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('tubugl-math/src/vector3'), require('tubugl-math/src/euler'), require('gl-matrix'), require('tubugl-core'), require('tubugl-core/src/indexArrayBuffer'), require('tubugl-utils'), require('tubugl-core/src/program'), require('gl-matrix/src/gl-matrix')) :
	typeof define === 'function' && define.amd ? define(['exports', 'tubugl-math/src/vector3', 'tubugl-math/src/euler', 'gl-matrix', 'tubugl-core', 'tubugl-core/src/indexArrayBuffer', 'tubugl-utils', 'tubugl-core/src/program', 'gl-matrix/src/gl-matrix'], factory) :
	(factory((global.Tubu = {}),global.vector3,global.euler,global.glMatrix,global.tubuglCore,global.indexArrayBuffer,global.tubuglUtils,global.program,global.glMatrix$1));
}(this, (function (exports,vector3,euler,glMatrix,tubuglCore,indexArrayBuffer,tubuglUtils,program,glMatrix$1) { 'use strict';

var baseShaderVertSrc = "\nattribute vec4 position;\n\nuniform mat4 projectionMatrix;\nuniform mat4 viewMatrix;\nuniform mat4 modelMatrix;\n\n\nvoid main() {\n    gl_Position = projectionMatrix * viewMatrix * modelMatrix * position;\n    gl_PointSize = 10.;\n}";

var baseShaderFragSrc = "\nprecision mediump float;\n\nuniform bool uWireframe;\n\nvoid main() {\n    float colorR = gl_FrontFacing ? 1.0 : 0.0;\n    float colorG = gl_FrontFacing ? 0.0 : 1.0;\n    \n    gl_FragColor = vec4(colorR, colorG, 0.0, 1.0);\n\n}";

var wireFrameFragSrc = "\nprecision mediump float;\n\nvoid main(){\n    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n}\n";

var base2ShaderVertSrc = "#version 300 es\nin vec4 position;\nin vec3 barycentricPosition;\n\nuniform mat4 projectionMatrix;\nuniform mat4 viewMatrix;\nuniform mat4 modelMatrix;\n\nout vec3 vBarycentricPosition;\n\nvoid main() {\n    gl_Position = projectionMatrix * viewMatrix * modelMatrix * position;\n    \n    vBarycentricPosition = barycentricPosition; \n}\n";

var base2ShaderFragSrc = "#version 300 es\nprecision mediump float;\nin vec3 vBarycentricPosition;\n\nuniform bool uWireframe;\n\nout vec4 outColor;\n\nvoid main() {\n\n    if(uWireframe){\n        float minBarycentricVal = min(min(vBarycentricPosition.x, vBarycentricPosition.y), vBarycentricPosition.z);\n        if(minBarycentricVal > 0.01) discard;\n    }\n    \n    outColor = vec4(1.0, 0.0, 0.0, 1.0);\n}\n";

var normalShaderVertSrc = "\nattribute vec4 position;\nattribute vec3 normal;\n\nuniform mat4 projectionMatrix;\nuniform mat4 viewMatrix;\nuniform mat4 modelMatrix;\n\nvarying vec3 vNormal;\n\nvoid main() {\n    gl_Position = projectionMatrix * viewMatrix * modelMatrix * position;\n    vNormal = normal;\n}\n";

var normalShaderFragSrc = "\nprecision mediump float;\n\nvarying vec3 vNormal;\n\nvoid main() {\n    vec3 faceColor = (vNormal + vec3(0.5))/2.0;\n    gl_FragColor = vec4(faceColor, 1.0);\n}";

var baseUVShaderVertSrc = "\nattribute vec4 position;\nattribute vec3 normal;\nattribute vec2 uv;\n\nuniform mat4 projectionMatrix;\nuniform mat4 viewMatrix;\nuniform mat4 modelMatrix;\n\nvarying vec3 vNormal;\nvarying vec2 vUv;\n\nvoid main() {\n    gl_Position = projectionMatrix * viewMatrix * modelMatrix * position;\n    vNormal = normal;\n    vUv = uv;\n}";

var baseUVShaderFragSrc = "\nprecision mediump float;\n\nvarying vec3 vNormal;\nvarying vec2 vUv;\nvoid main() {\n    vec3 outColor = (vNormal + vec3(1.0, 1.0, 1.0))/2.0;\n    if(!gl_FrontFacing) outColor = vec3(1.0);\n    \n    // gl_FragColor = vec4( vec3(vUv, 0.0), 1.0);\n    gl_FragColor = vec4(outColor, 1.0);\n\n}";

var baseTextureShaderFragSrc = "\nprecision mediump float;\n\nvarying vec3 vNormal;\nvarying vec2 vUv;\n\nuniform sampler2D uTexture;\n\nvoid main(){\n    vec3 normal = vNormal;\n    gl_FragColor = texture2D(uTexture, vUv);\n}\n\n";

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();







var get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var EventEmitter = require('wolfy87-eventemitter');
/**
 * Object3d
 */
var Object3D = function (_EventEmitter) {
	inherits(Object3D, _EventEmitter);

	/**
  * @param {webglContext} gl
  * @param {{isGl2: boolean, side: string, isWirer: boolean, isDepthTest: boolean, isTransparent: boolean}} params
  */
	function Object3D(gl) {
		var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { isDepthTest: true };
		classCallCheck(this, Object3D);

		var _this = possibleConstructorReturn(this, (Object3D.__proto__ || Object.getPrototypeOf(Object3D)).call(this));

		_this._gl = gl;

		_this.position = new vector3.Vector3();
		_this.rotation = new euler.Euler();
		_this.scale = new vector3.Vector3(1, 1, 1);

		_this.modelMatrix = glMatrix.mat4.create();

		_this._isGl2 = params.isGl2;
		_this._side = params.side ? params.side : 'double'; // 'front', 'back', 'double'
		_this._isNeedUpdate = true;
		_this._isWire = !!params.isWire;
		_this._isDepthTest = params.isDepthTest === undefined ? true : params.isDepthTest;
		_this._isTransparent = !!params.isTransparent;
		return _this;
	}

	createClass(Object3D, [{
		key: 'updateModelMatrix',
		value: function updateModelMatrix(matrix) {
			glMatrix.mat4.copy(this.modelMatrix, matrix);
		}
	}, {
		key: 'setPosition',
		value: function setPosition(x, y, z) {
			this._isNeedUpdate = true;

			if (x !== undefined) this.position.x = x;
			if (y !== undefined) this.position.y = y;
			if (z !== undefined) this.position.z = z;

			return this;
		}
	}, {
		key: 'setRotation',
		value: function setRotation(x, y, z) {
			this._isNeedUpdate = true;

			if (x !== undefined) this.rotation.x = x;
			if (y !== undefined) this.rotation.y = y;
			if (z !== undefined) this.rotation.z = z;

			return this;
		}
	}, {
		key: '_updateModelMatrix',
		value: function _updateModelMatrix() {
			if (!this._isNeedUpdate && !this.position.needsUpdate && !this.rotation.needsMatrixUpdate && !this.scale.needsUpdate) return;

			glMatrix.mat4.fromTranslation(this.modelMatrix, this.position.array);
			glMatrix.mat4.scale(this.modelMatrix, this.modelMatrix, this.scale.array);

			this.rotation.updateMatrix();
			glMatrix.mat4.multiply(this.modelMatrix, this.modelMatrix, this.rotation.matrix);

			this._isNeedUpdate = false;
			this.position.needsUpdate = false;
			this.scale.needsUpdate = false;

			return this;
		}
	}]);
	return Object3D;
}(EventEmitter);

var Shape3D = function (_Object3D) {
	inherits(Shape3D, _Object3D);

	/**
  *
  * @param {webglContext} gl
  * @param {*} params
  */
	function Shape3D(gl) {
		var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		classCallCheck(this, Shape3D);

		var _this = possibleConstructorReturn(this, (Shape3D.__proto__ || Object.getPrototypeOf(Shape3D)).call(this, gl, params));

		_this.disableUpdateModelMatrix = !!params.disableUpdateModelMatrix;
		return _this;
	}

	createClass(Shape3D, [{
		key: '_makeProgram',
		value: function _makeProgram(vertexShaderSrc, fragmentShaderSrc) {
			this._program = new tubuglCore.Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
		}
	}, {
		key: '_useProgram',
		value: function _useProgram() {
			this._program.use();
		}
	}, {
		key: '_makeBuffers',
		value: function _makeBuffers() {
			var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { buffers: {}, index: [], count: 0 };

			this._buffers = [];

			var buffers = params.buffer;
			for (var key in buffers) {
				var buffer = buffers[key];

				var positionBuffer = new tubuglCore.ArrayBuffer(this._gl, buffer.array);
				positionBuffer.setAttribs(buffer.name, buffer.size);
				this._buffers.push(positionBuffer);
			}

			if (params.index) {
				var index = params.index;
				this._indexBuffer = new indexArrayBuffer.IndexArrayBuffer(this._gl, index.array);
				this._cnt = index.array.length;
			} else {
				this._cnt = params.count;
			}
		}
	}, {
		key: '_updateAttributes',
		value: function _updateAttributes() {
			var _this2 = this;

			this._buffers.forEach(function (buffer) {
				buffer.bind().attribPointer(_this2._program);
			});
			this._indexBuffer.bind();
		}
	}, {
		key: '_updateUniforms',
		value: function _updateUniforms(camera) {}

		/**
   * update status of drawing
   *
   */

	}, {
		key: '_updateDrawStatus',
		value: function _updateDrawStatus() {
			if (this._side === 'double') {
				this._gl.disable(this._gl.CULL_FACE);
			} else if (this._side === 'front') {
				this._gl.enable(this._gl.CULL_FACE);
				this._gl.cullFace(this._gl.BACK);
			} else {
				this._gl.enable(this._gl.CULL_FACE);
				this._gl.cullFace(this._gl.FRONT);
			}

			if (this._isDepthTest) this._gl.enable(this._gl.DEPTH_TEST);else this._gl.disable(this._gl.DEPTH_TEST);

			if (this._isTransparent) {
				this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);
				this._gl.enable(this._gl.BLEND);
			} else {
				this._gl.blendFunc(this._gl.ONE, this._gl.ZERO);
				this._gl.disable(this._gl.BLEND);
			}
		}
	}, {
		key: '_drawShape',
		value: function _drawShape() {
			return this;
		}
	}, {
		key: 'render',
		value: function render(camera) {
			this.update(camera).draw();
		}
	}, {
		key: 'update',
		value: function update(camera) {
			if (!this.disableUpdateModelMatrix) this._updateModelMatrix(); // method which inherit from Object3D
			this._useProgram();
			this._updateAttributes();
			this._updateUniforms(camera);

			return this;
		}
	}, {
		key: 'draw',
		value: function draw() {
			this._updateDrawStatus();
			this._drawShape();

			return this;
		}
	}, {
		key: 'resize',
		value: function resize() {}
	}, {
		key: 'addGui',
		value: function addGui(gui) {}
	}]);
	return Shape3D;
}(Object3D);

var Cube = function (_Shape3D) {
	inherits(Cube, _Shape3D);

	function Cube(gl) {
		var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { isDepthTest: true };
		var width = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 100;
		var height = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 100;
		var depth = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 100;
		var widthSegment = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 1;
		var heightSegment = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 1;
		var depthSegment = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : 1;
		classCallCheck(this, Cube);

		var _this = possibleConstructorReturn(this, (Cube.__proto__ || Object.getPrototypeOf(Cube)).call(this, gl, params));

		_this._width = width;
		_this._height = height;
		_this._depth = depth;
		_this._widthSegment = widthSegment;
		_this._heightSegment = heightSegment;
		_this._depthSegment = depthSegment;

		_this._makeProgram(params.vertexShaderSrc, params.fragmentShaderSrc);
		_this._makeBuffer(params);

		if (_this._isWire) {
			_this._makeWireframe();
			_this._makeWireframeBuffer();
		}
		return _this;
	}

	createClass(Cube, [{
		key: 'getVertice',
		value: function getVertice() {
			return this._positionBuffer.dataArray;
		}
	}, {
		key: 'getNormals',
		value: function getNormals() {
			return this._normalBuffer.dataArray;
		}
	}, {
		key: '_makeProgram',
		value: function _makeProgram(vertexShaderSrc, fragmentShaderSrc) {
			this._program = new tubuglCore.Program(this._gl, vertexShaderSrc ? vertexShaderSrc : this._isGl2 ? base2ShaderVertSrc : baseUVShaderVertSrc, fragmentShaderSrc ? fragmentShaderSrc : this._isGl2 ? base2ShaderFragSrc : baseUVShaderFragSrc);
		}
	}, {
		key: '_makeWireframe',
		value: function _makeWireframe() {
			this._wireframeProgram = new tubuglCore.Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
		}
	}, {
		key: '_makeBuffer',
		value: function _makeBuffer() {
			if (this._isGl2) {
				this._vao = new tubuglCore.VAO(this._gl);
				this._vao.bind();
			}

			var cubeObj = Cube.getVertice(this._width, this._height, this._depth, this._widthSegment, this._heightSegment, this._depthSegment);

			var normals = Cube.getNormal(this._widthSegment, this._heightSegment, this._depthSegment);
			var indices = Cube.getIndices(this._widthSegment, this._heightSegment, this._depthSegment);
			this._positionBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(cubeObj.vertices));
			this._positionBuffer.setAttribs('position', 3);

			this._uvBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(cubeObj.uvs));
			this._uvBuffer.setAttribs('uv', 2);

			this._normalBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(normals));
			this._normalBuffer.setAttribs('normal', 3);

			if (this._vao) {
				this._positionBuffer.bind().attribPointer(this._program);
				this._uvBuffer.bind().attribPointer(this._program);
				this._normalBuffer.bind().attribPointer(this._program);
			}
			this._indexBuffer = new tubuglCore.IndexArrayBuffer(this._gl, new Uint16Array(indices));

			this._cnt = indices.length;
		}
	}, {
		key: '_makeWireframeBuffer',
		value: function _makeWireframeBuffer() {
			this._wireframeIndexBuffer = new tubuglCore.IndexArrayBuffer(this._gl, tubuglUtils.generateWireframeIndices(this._indexBuffer.dataArray));
			this._wireframeIndexCnt = this._wireframeIndexBuffer.dataArray.length;
		}
	}, {
		key: '_updateAttributes',
		value: function _updateAttributes() {
			if (this._vao) {
				this._vao.bind();
			} else {
				this._positionBuffer.bind().attribPointer(this._program);
				this._uvBuffer.bind().attribPointer(this._program);
				this._normalBuffer.bind().attribPointer(this._program);
				this._indexBuffer.bind();
			}
		}
	}, {
		key: 'render',
		value: function render(camera) {
			this.update(camera).draw();
			if (this._isWire) this.updateWire(camera).drawWireframe();
		}
	}, {
		key: '_updateUniforms',
		value: function _updateUniforms(camera) {
			this._gl.uniformMatrix4fv(this._program.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);
		}
	}, {
		key: 'updateWire',
		value: function updateWire(camera) {
			var prg = this._wireframeProgram;

			prg.bind();
			this._positionBuffer.bind().attribPointer(prg);
			this._wireframeIndexBuffer.bind();

			this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);

			return this;
		}
	}, {
		key: 'draw',
		value: function draw() {
			this._updateDrawStatus();
			this._gl.drawElements(this._gl.TRIANGLES, this._cnt, this._gl.UNSIGNED_SHORT, 0);

			return this;
		}
	}, {
		key: 'drawWireframe',
		value: function drawWireframe() {
			this._gl.drawElements(this._gl.LINES, this._wireframeIndexCnt, this._gl.UNSIGNED_SHORT, 0);

			return;
		}
	}, {
		key: 'resize',
		value: function resize() {}
	}, {
		key: 'addGui',
		value: function addGui(gui) {
			var _this2 = this;

			var positionFolder = gui.addFolder('position');
			positionFolder.add(this.position, 'x', -200, 200);
			positionFolder.add(this.position, 'y', -200, 200);
			positionFolder.add(this.position, 'z', -200, 200);

			var scaleFolder = gui.addFolder('scale');
			scaleFolder.add(this.scale, 'x', 0.05, 2).step(0.01);
			scaleFolder.add(this.scale, 'y', 0.05, 2).step(0.01);
			scaleFolder.add(this.scale, 'z', 0.05, 2).step(0.01);

			var rotationFolder = gui.addFolder('rotation');
			rotationFolder.add(this.rotation, 'x', -Math.PI, Math.PI).step(0.01);
			rotationFolder.add(this.rotation, 'y', -Math.PI, Math.PI).step(0.01);
			rotationFolder.add(this.rotation, 'z', -Math.PI, Math.PI).step(0.01);

			gui.add(this, '_isWire').name('isWire').onChange(function () {
				if (_this2._isWire && !_this2._wireframeProgram) {
					_this2._makeWireframe();
					_this2._makeWireframeBuffer();
				}
			});
		}
	}], [{
		key: 'getVertice',
		value: function getVertice(width, height, depth, widthSegment, heightSegment, depthSegment) {
			var vertices = [];
			var uvs = [];
			var xRate = 1 / widthSegment;
			var yRate = 1 / heightSegment;
			var zRate = 1 / depthSegment;

			for (var ii = 0; ii < 2; ii++) {
				var dir = ii === 0 ? -1 : 1;
				for (var zz = 0; zz <= depthSegment; zz++) {
					var zPos = (-0.5 + zRate * zz) * depth;

					for (var xx = 0; xx <= widthSegment; xx++) {
						var xPos = (-0.5 + xRate * xx) * width;

						vertices.push(xPos);
						vertices.push(dir * height / 2);
						vertices.push(zPos);

						uvs.push(xx * xRate);

						if (ii == 1) uvs.push(zz * zRate);else uvs.push(1.0 - zz * zRate);
					}
				}
			}

			for (var _ii = 0; _ii < 2; _ii++) {
				var _dir = _ii === 0 ? -1 : 1;
				for (var yy = 0; yy <= heightSegment; yy++) {
					var yPos = (-0.5 + yRate * yy) * height;

					for (var _xx = 0; _xx <= widthSegment; _xx++) {
						var _xPos = (-0.5 + xRate * _xx) * width;

						vertices.push(_xPos);
						vertices.push(yPos);
						vertices.push(_dir * depth / 2);

						if (_ii == 1) uvs.push(_xx * xRate);else uvs.push(1.0 - _xx * xRate);

						uvs.push(1.0 - yy * yRate);
					}
				}
			}

			for (var _ii2 = 0; _ii2 < 2; _ii2++) {
				var _dir2 = _ii2 === 0 ? -1 : 1;
				for (var _yy = 0; _yy <= heightSegment; _yy++) {
					var _yPos = (-0.5 + yRate * _yy) * height;
					for (var _zz = 0; _zz <= depthSegment; _zz++) {
						var _zPos = (-0.5 + zRate * _zz) * depth;

						vertices.push(_dir2 * width / 2);
						vertices.push(_yPos);
						vertices.push(_zPos);

						if (_ii2 === 0) uvs.push(_zz * zRate);else uvs.push(1.0 - _zz * zRate);
						uvs.push(1.0 - _yy * yRate);
					}
				}
			}

			return { vertices: vertices, uvs: uvs };
		}
	}, {
		key: 'getIndices',
		value: function getIndices(widthSegment, heightSegment, depthSegment) {
			var indices = [];

			var num = 0;
			for (var ii = 0; ii < 2; ii++) {
				for (var yy = 0; yy < depthSegment; yy++) {
					for (var xx = 0; xx < widthSegment; xx++) {
						var rowStartNum = yy * (widthSegment + 1);
						var nextRowStartNum = (yy + 1) * (widthSegment + 1);

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

			for (var _ii3 = 0; _ii3 < 2; _ii3++) {
				for (var _yy2 = 0; _yy2 < heightSegment; _yy2++) {
					for (var _xx2 = 0; _xx2 < widthSegment; _xx2++) {
						var _rowStartNum = _yy2 * (widthSegment + 1);
						var _nextRowStartNum = (_yy2 + 1) * (widthSegment + 1);

						if (_ii3 == 0) {
							indices.push(_rowStartNum + _xx2 + num);
							indices.push(_nextRowStartNum + _xx2 + num);
							indices.push(_rowStartNum + _xx2 + 1 + num);

							indices.push(_rowStartNum + _xx2 + 1 + num);
							indices.push(_nextRowStartNum + _xx2 + num);
							indices.push(_nextRowStartNum + _xx2 + 1 + num);
						} else {
							indices.push(_rowStartNum + _xx2 + num);
							indices.push(_rowStartNum + _xx2 + 1 + num);
							indices.push(_nextRowStartNum + _xx2 + num + 1);

							indices.push(_rowStartNum + _xx2 + num);
							indices.push(_nextRowStartNum + _xx2 + 1 + num);
							indices.push(_nextRowStartNum + _xx2 + num);
						}
					}
				}

				num += (widthSegment + 1) * (heightSegment + 1);
			}

			for (var _ii4 = 0; _ii4 < 2; _ii4++) {
				for (var _yy3 = 0; _yy3 < heightSegment; _yy3++) {
					for (var zz = 0; zz < depthSegment; zz++) {
						var _rowStartNum2 = _yy3 * (depthSegment + 1);
						var _nextRowStartNum2 = (_yy3 + 1) * (depthSegment + 1);

						if (_ii4 == 0) {
							indices.push(_rowStartNum2 + zz + num);
							indices.push(_rowStartNum2 + zz + 1 + num);
							indices.push(_nextRowStartNum2 + zz + 1 + num);

							indices.push(_rowStartNum2 + zz + num);
							indices.push(_nextRowStartNum2 + zz + 1 + num);
							indices.push(_nextRowStartNum2 + zz + num);
						} else {
							indices.push(_rowStartNum2 + zz + num);
							indices.push(_nextRowStartNum2 + zz + num);
							indices.push(_rowStartNum2 + zz + 1 + num);

							indices.push(_rowStartNum2 + zz + 1 + num);
							indices.push(_nextRowStartNum2 + zz + num);
							indices.push(_nextRowStartNum2 + zz + num + 1);
						}
					}
				}

				num += (depthSegment + 1) * (heightSegment + 1);
			}

			return indices;
		}
	}, {
		key: 'getNormal',
		value: function getNormal(widthSegment, heightSegment, depthSegment) {
			var normals = [];

			for (var ii = 0; ii < 2; ii++) {
				var dir = ii == 0 ? -1 : 1;
				for (var yy = 0; yy <= depthSegment; yy++) {
					for (var xx = 0; xx <= widthSegment; xx++) {
						normals.push(0);
						normals.push(dir);
						normals.push(0);
					}
				}
			}

			for (var _ii5 = 0; _ii5 < 2; _ii5++) {
				var _dir3 = _ii5 == 0 ? -1 : 1;
				for (var _yy4 = 0; _yy4 <= heightSegment; _yy4++) {
					for (var _xx3 = 0; _xx3 <= widthSegment; _xx3++) {
						normals.push(0);
						normals.push(0);
						normals.push(_dir3);
					}
				}
			}

			for (var _ii6 = 0; _ii6 < 2; _ii6++) {
				var _dir4 = _ii6 == 0 ? -1 : 1;
				for (var _yy5 = 0; _yy5 <= heightSegment; _yy5++) {
					for (var _xx4 = 0; _xx4 <= depthSegment; _xx4++) {
						normals.push(_dir4);
						normals.push(0);
						normals.push(0);
					}
				}
			}

			return normals;
		}
	}]);
	return Cube;
}(Shape3D);

var TextureCube = function (_Cube) {
	inherits(TextureCube, _Cube);

	function TextureCube(gl) {
		var width = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;
		var height = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 100;
		var depth = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 100;
		var widthSegment = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 1;
		var heightSegment = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 1;
		var depthSegment = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 1;
		var params = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
		classCallCheck(this, TextureCube);

		var _this = possibleConstructorReturn(this, (TextureCube.__proto__ || Object.getPrototypeOf(TextureCube)).call(this, gl, params, width, height, depth, widthSegment, heightSegment, depthSegment));

		_this._texture = params.texture;
		return _this;
	}

	createClass(TextureCube, [{
		key: '_makeProgram',
		value: function _makeProgram() {
			this._program = new program.Program(this._gl, baseUVShaderVertSrc, baseTextureShaderFragSrc);
		}
	}, {
		key: 'update',
		value: function update(camera) {
			get(TextureCube.prototype.__proto__ || Object.getPrototypeOf(TextureCube.prototype), 'update', this).call(this, camera);

			if (this._texture) {
				this._program.setUniformTexture(this._texture.value, this._texture.name);
				this._texture.value.activeTexture().bind();
			}

			return this;
		}
	}]);
	return TextureCube;
}(Cube);

// http://catlikecoding.com/unity/tutorials/rounded-cube/
var ProceduralCube = function (_Shape3D) {
	inherits(ProceduralCube, _Shape3D);

	function ProceduralCube(gl) {
		var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		var width = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 100;
		var height = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 100;
		var depth = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 100;
		var widthSegments = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 1;
		var heightSegments = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 1;
		var depthSegments = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : 1;
		classCallCheck(this, ProceduralCube);

		var _this = possibleConstructorReturn(this, (ProceduralCube.__proto__ || Object.getPrototypeOf(ProceduralCube)).call(this, gl, params));

		_this._width = width;
		_this._height = height;
		_this._depth = depth;
		_this._widthSegments = widthSegments;
		_this._heightSegments = heightSegments;
		_this._depthSegments = depthSegments;

		_this._makeProgram(params);
		_this._makeBuffers(params);

		if (_this._isWire) {
			_this._makeWireframe();
			_this._makeWireframeBuffer();
		}
		return _this;
	}

	createClass(ProceduralCube, [{
		key: 'getModelMatrix',
		value: function getModelMatrix() {
			return this.modelMatrix;
		}
	}, {
		key: 'getVertice',
		value: function getVertice() {
			return this._positionBuffer.dataArray;
		}
	}, {
		key: 'render',
		value: function render(camera) {
			this.update(camera).draw();
			if (this._isWire) this.updateWire(camera).drawWireframe();
		}
	}, {
		key: 'updateWire',
		value: function updateWire(camera) {
			var prg = this._wireframeProgram;

			prg.bind();
			this._positionBuffer.bind().attribPointer(prg);
			this._wireframeIndexBuffer.bind();

			this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);

			return this;
		}
	}, {
		key: 'draw',
		value: function draw() {
			if (this._side === 'double') {
				this._gl.disable(this._gl.CULL_FACE);
			} else if (this._side === 'front') {
				this._gl.enable(this._gl.CULL_FACE);
				this._gl.cullFace(this._gl.BACK);
			} else {
				this._gl.enable(this._gl.CULL_FACE);
				this._gl.cullFace(this._gl.FRONT);
			}

			if (this._isDepthTest) this._gl.enable(this._gl.DEPTH_TEST);else this._gl.disable(this._gl.DEPTH_TEST);

			if (this._isTransparent) {
				this.gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);
				this._gl.enable(this._gl.BLEND);
			} else {
				this._gl.blendFunc(this._gl.ONE, this._gl.ZERO); // default value https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc
				this._gl.disable(this._gl.BLEND);
			}

			this._gl.drawElements(this._gl.TRIANGLES, this._cnt, this._gl.UNSIGNED_SHORT, 0);

			return this;
		}
	}, {
		key: 'resize',
		value: function resize() {}
	}, {
		key: 'addGui',
		value: function addGui(gui) {
			var _this2 = this;

			gui.add(this, '_isWire').name('isWire').onChange(function () {
				if (_this2._isWire && !_this2._wireframeProgram) {
					_this2._makeWireframe();
					_this2._makeWireframeBuffer();
				}
			});

			var positionGui = gui.addFolder('position');
			positionGui.add(this.position, 'x', -100, 100);
			positionGui.add(this.position, 'y', -100, 100);
			positionGui.add(this.position, 'z', -100, 100);

			var rotationGui = gui.addFolder('rotation');
			rotationGui.add(this.rotation, 'x', -Math.PI, Math.PI).step(0.01);
			rotationGui.add(this.rotation, 'y', -Math.PI, Math.PI).step(0.01);
			rotationGui.add(this.rotation, 'z', -Math.PI, Math.PI).step(0.01);
		}
	}, {
		key: 'drawWireframe',
		value: function drawWireframe() {
			this._gl.drawElements(this._gl.LINES, this._wireframeIndexCnt, this._gl.UNSIGNED_SHORT, 0);

			return;
		}
	}, {
		key: '_makeProgram',
		value: function _makeProgram(params) {
			var fragmentShaderSrc = params.fragmentShaderSrc ? params.fragmentShaderSrc : this._isGl2 ? base2ShaderFragSrc : baseShaderFragSrc;
			var vertexShaderSrc = params.vertexShaderSrc ? params.vertexShaderSrc : this._isGl2 ? base2ShaderVertSrc : baseShaderVertSrc;

			this._program = new tubuglCore.Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
		}
	}, {
		key: '_makeWireframe',
		value: function _makeWireframe() {
			this._wireframeProgram = new tubuglCore.Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
		}
	}, {
		key: '_makeBuffers',
		value: function _makeBuffers() {
			if (this._isGl2) {
				this._vao = new tubuglCore.VAO(this._gl);
				this._vao.bind();
			}

			var cornerVertices = 8;
			var edgeVertices = (this._widthSegments + this._heightSegments + this._depthSegments - 3) * 4;
			var faceVertices = ((this._widthSegments - 1) * (this._heightSegments - 1) + (this._widthSegments - 1) * (this._depthSegments - 1) + (this._heightSegments - 1) * (this._depthSegments - 1)) * 2;
			this._verticeNum = cornerVertices + edgeVertices + faceVertices;

			this._positionBuffer = new tubuglCore.ArrayBuffer(this._gl, ProceduralCube.getVertices(this._width, this._height, this._depth, this._widthSegments, this._heightSegments, this._depthSegments));
			this._positionBuffer.setAttribs('position', 3);

			if (this._vao) {
				this._positionBuffer.bind().attribPointer(this._program);
			}

			this._indexBuffer = new tubuglCore.IndexArrayBuffer(this._gl, ProceduralCube.getIndices(this._widthSegments, this._heightSegments, this._depthSegments));

			this._cnt = this._indexBuffer.dataArray.length;
		}
	}, {
		key: '_makeWireframeBuffer',
		value: function _makeWireframeBuffer() {
			this._wireframeIndexBuffer = new tubuglCore.IndexArrayBuffer(this._gl, tubuglUtils.generateWireframeIndices(this._indexBuffer.dataArray));
			this._wireframeIndexCnt = this._wireframeIndexBuffer.dataArray.length;
		}
	}, {
		key: '_updateAttributes',
		value: function _updateAttributes() {
			if (this._vao) {
				this._vao.bind();
			} else {
				this._positionBuffer.bind().attribPointer(this._program);
				this._indexBuffer.bind();
			}
		}
	}, {
		key: '_updateUniforms',
		value: function _updateUniforms(camera) {
			this._gl.uniformMatrix4fv(this._program.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);
		}
	}], [{
		key: 'getVertices',
		value: function getVertices(width, height, depth, widthSegments, heightSegments, depthSegments) {
			var xx = void 0,
			    yy = void 0,
			    zz = void 0;
			var vertices = [];
			var verticeNum = 0;
			var widthRate = 1 / widthSegments;
			var heightRate = 1 / heightSegments;
			var depthRate = 1 / depthSegments;
			var halfWidth = width / 2;
			var halfHeight = height / 2;
			var halfDepth = depth / 2;

			for (yy = 0; yy <= heightSegments; yy++) {
				var yPos = -halfHeight + height * heightRate * yy;

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
				var _yPos = yy === 0 ? -halfHeight : halfHeight;
				for (zz = 1; zz < depthSegments; zz++) {
					var zPos = halfDepth - zz * depthRate * depth;
					for (xx = 1; xx < widthSegments; xx++) {
						var xPos = -halfWidth + xx * widthRate * width;

						vertices[verticeNum++] = xPos;
						vertices[verticeNum++] = _yPos;
						vertices[verticeNum++] = zPos;
					}
				}
			}

			vertices = new Float32Array(vertices);

			return vertices;
		}
	}, {
		key: '_getBarycentricVertices',
		value: function _getBarycentricVertices(segmentW, segmentH) {
			var barycentricVertices = [];
			var barycentricId = void 0;

			for (var yy = 0; yy <= segmentH; yy++) {
				for (var xx = 0; xx <= segmentW; xx++) {
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
	}, {
		key: 'getIndices',
		value: function getIndices(widthSegments, heightSegments, depthSegments) {
			var indices = [];
			var oneSideVertexNum = 2 * (widthSegments + depthSegments);

			for (var height = 0; height < heightSegments; height++) {
				var heightPosNum = oneSideVertexNum * height;

				for (var row = 0; row < oneSideVertexNum; row++) {
					indices.push(row + heightPosNum);
					if (row === oneSideVertexNum - 1) indices.push(0 + heightPosNum);else indices.push(row + 1 + heightPosNum);
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

			indices = indices.concat(ProceduralCube.createFace(widthSegments, heightSegments, depthSegments, false));
			indices = indices.concat(ProceduralCube.createFace(widthSegments, heightSegments, depthSegments));

			indices = new Uint16Array(indices);

			return indices;
		}
	}, {
		key: 'createFace',
		value: function createFace(widthSegments, heightSegments, depthSegments) {
			var isTop = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

			var indices = [];
			var ring = 2 * (widthSegments + depthSegments);
			var sideNum = isTop ? ring * (heightSegments + 1) + (depthSegments - 1) * (widthSegments - 1) : ring * (heightSegments + 1);
			var startNum = isTop ? ring * heightSegments : 0;
			var setQuad = isTop ? ProceduralCube.setTopQuad : ProceduralCube.setQuad;

			if (widthSegments === 1 || depthSegments === 1) {
				var segments = Math.max(widthSegments, depthSegments);
				if (widthSegments === 1) {
					for (var ii = 0; ii < segments; ii++) {
						if (ii === 0) indices = indices.concat(setQuad(startNum + ii, startNum + ii + 1, startNum + ii + 2, startNum + ring - 1 - ii));else indices = indices.concat(setQuad(startNum + ring - ii, startNum + ii + 1, startNum + ii + 2, startNum + ring - 1 - ii));
					}
				} else {
					for (var _ii = 0; _ii < segments; _ii++) {
						indices = indices.concat(setQuad(startNum + _ii, startNum + _ii + 1, startNum + ring - 2 - _ii, startNum + ring - 1 - _ii));
					}
				}
			} else {
				indices = indices.concat(setQuad(startNum, startNum + 1, sideNum, startNum + ring - 1));

				for (var _ii2 = 1; _ii2 < widthSegments - 1; _ii2++) {
					indices = indices.concat(setQuad(startNum + _ii2, startNum + _ii2 + 1, sideNum + _ii2, sideNum + _ii2 - 1));
				}

				indices = indices.concat(setQuad(startNum + widthSegments - 1, startNum + widthSegments, startNum + widthSegments + 1, sideNum + widthSegments - 2));

				for (var jj = 1; jj < depthSegments - 1; jj++) {
					indices = indices.concat(setQuad(startNum + ring - jj, sideNum + (jj - 1) * (widthSegments - 1), sideNum + jj * (widthSegments - 1), startNum + ring - jj - 1));

					for (var _ii3 = 1; _ii3 < widthSegments - 1; _ii3++) {
						indices = indices.concat(setQuad(sideNum + _ii3 - 1 + (jj - 1) * (widthSegments - 1), sideNum + _ii3 + (jj - 1) * (widthSegments - 1), sideNum + _ii3 + jj * (widthSegments - 1), sideNum + _ii3 + jj * (widthSegments - 1) - 1));
					}

					indices = indices.concat(setQuad(sideNum + jj * (widthSegments - 1) - 1, startNum + widthSegments + jj, startNum + widthSegments + jj + 1, sideNum + (jj + 1) * (widthSegments - 1) - 1));
				}

				indices = indices.concat(setQuad(startNum + ring - depthSegments + 1, sideNum + (depthSegments - 2) * (widthSegments - 1), startNum + ring - depthSegments - 1, startNum + ring - depthSegments));

				for (var _ii4 = 1; _ii4 < widthSegments - 1; _ii4++) {
					indices = indices.concat(setQuad(sideNum + (depthSegments - 2) * (widthSegments - 1) + _ii4 - 1, sideNum + (depthSegments - 2) * (widthSegments - 1) + _ii4, startNum + ring - depthSegments - _ii4 - 1, startNum + ring - depthSegments - _ii4));
				}

				indices = indices.concat(setQuad(sideNum + (depthSegments - 1) * (widthSegments - 1) - 1, startNum + widthSegments + depthSegments - 1, startNum + widthSegments + depthSegments, startNum + widthSegments + depthSegments + 1));
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

	}, {
		key: 'setTopQuad',
		value: function setTopQuad(a, b, c, d) {
			var indices = [];

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

	}, {
		key: 'setQuad',
		value: function setQuad(a, b, c, d) {
			var indices = [];

			indices.push(b);
			indices.push(a);
			indices.push(c);

			indices.push(d);
			indices.push(c);
			indices.push(a);

			return indices;
		}
	}, {
		key: '_getWireframeIndices',
		value: function _getWireframeIndices(indexBuffer) {
			console.log(indexBuffer);
		}
	}]);
	return ProceduralCube;
}(Shape3D);

var ProceduralRoundingCube = function (_ProceduralCube) {
	inherits(ProceduralRoundingCube, _ProceduralCube);

	function ProceduralRoundingCube(gl) {
		var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		var width = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 100;
		var height = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 100;
		var depth = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 100;
		var roundness = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 2;
		var widthSegments = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 1;
		var heightSegments = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : 1;
		var depthSegments = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : 1;
		classCallCheck(this, ProceduralRoundingCube);

		params.roundness = roundness;
		return possibleConstructorReturn(this, (ProceduralRoundingCube.__proto__ || Object.getPrototypeOf(ProceduralRoundingCube)).call(this, gl, params, width, height, depth, widthSegments, heightSegments, depthSegments));
	}

	createClass(ProceduralRoundingCube, [{
		key: 'getNormals',
		value: function getNormals() {
			return this._normalBuffer.dataArray;
		}
	}, {
		key: '_makeBuffers',
		value: function _makeBuffers(params) {
			get(ProceduralRoundingCube.prototype.__proto__ || Object.getPrototypeOf(ProceduralRoundingCube.prototype), '_makeBuffers', this).call(this);

			var positionArray = this._positionBuffer.dataArray;
			var normals = [];

			var normal = glMatrix$1.vec3.create();
			var inner = glMatrix$1.vec3.create();
			var roundness = params.roundness;
			for (var ii = 0; ii < positionArray.length / 3; ii++) {
				var xx = positionArray[3 * ii];
				var yy = positionArray[3 * ii + 1];

				var zz = positionArray[3 * ii + 2];
				// vec3.set(normal, xx, yy, zz);
				glMatrix$1.vec3.set(inner, xx, yy, zz);

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

				glMatrix$1.vec3.set(normal, xx - inner[0], yy - inner[1], zz - inner[2]);
				glMatrix$1.vec3.normalize(normal, normal);

				positionArray[3 * ii] = inner[0] + normal[0] * roundness;
				positionArray[3 * ii + 1] = inner[1] + normal[1] * roundness;
				positionArray[3 * ii + 2] = inner[2] + normal[2] * roundness;

				normals.push(normal[0]);
				normals.push(normal[1]);
				normals.push(normal[2]);
			}

			this._positionBuffer.bind().setData(positionArray);

			this._normalBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(normals));
			this._normalBuffer.setAttribs('normal', 3);
		}
	}, {
		key: '_updateAttributes',
		value: function _updateAttributes() {
			if (this._vao) {
				this._vao.bind();
			} else {
				this._positionBuffer.bind().attribPointer(this._program);
				this._normalBuffer.bind().attribPointer(this._program);
				this._indexBuffer.bind();
			}
		}
	}, {
		key: '_makeProgram',
		value: function _makeProgram(params) {
			var vertexShaderSrc = params.vertexShaderSrc ? params.vertexShaderSrc : this._isGl2 ? base2ShaderVertSrc : normalShaderVertSrc;

			var fragmentShaderSrc = params.fragmentShaderSrc ? params.fragmentShaderSrc : this._isGl2 ? base2ShaderFragSrc : normalShaderFragSrc;

			this._program = new tubuglCore.Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
		}
	}]);
	return ProceduralRoundingCube;
}(ProceduralCube);

var ProceduralSphere = function (_Shape3D) {
	inherits(ProceduralSphere, _Shape3D);

	function ProceduralSphere(gl) {
		var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		var radius = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 100;
		var segments = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 10;
		classCallCheck(this, ProceduralSphere);

		var _this = possibleConstructorReturn(this, (ProceduralSphere.__proto__ || Object.getPrototypeOf(ProceduralSphere)).call(this, gl, params));

		_this._radius = radius;
		_this._segments = segments;

		_this._makeProgram(params);
		_this._makeBuffer(params);

		if (_this._isWire) {
			_this._makeWireframe();
			_this._makeWireframeBuffer();
		}
		return _this;
	}

	createClass(ProceduralSphere, [{
		key: 'getVertice',
		value: function getVertice() {
			return this._positionBuffer.dataArray;
		}
	}, {
		key: 'getNormals',
		value: function getNormals() {
			return this._normalBuffer.dataArray;
		}
	}, {
		key: 'render',
		value: function render(camera) {
			this.update(camera).draw();
			if (this._isWire) this.updateWire(camera).drawWireframe();
		}
	}, {
		key: 'updateWire',
		value: function updateWire(camera) {
			var prg = this._wireframeProgram;

			prg.bind();
			this._positionBuffer.bind().attribPointer(prg);
			this._wireframeIndexBuffer.bind();

			this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);

			return this;
		}
	}, {
		key: 'draw',
		value: function draw() {
			if (this._side === 'double') {
				this._gl.disable(this._gl.CULL_FACE);
			} else if (this._side === 'front') {
				this._gl.enable(this._gl.CULL_FACE);
				this._gl.cullFace(this._gl.BACK);
			} else {
				this._gl.enable(this._gl.CULL_FACE);
				this._gl.cullFace(this._gl.FRONT);
			}

			if (this._isDepthTest) this._gl.enable(this._gl.DEPTH_TEST);else this._gl.disable(this._gl.DEPTH_TEST);

			if (this._isTransparent) {
				this.gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);
				this._gl.enable(this._gl.BLEND);
			} else {
				this._gl.blendFunc(this._gl.ONE, this._gl.ZERO);
				this._gl.disable(this._gl.BLEND);
			}

			this._gl.drawElements(this._gl.TRIANGLES, this._cnt, this._gl.UNSIGNED_SHORT, 0);

			return this;
		}
	}, {
		key: 'drawWireframe',
		value: function drawWireframe() {
			this._gl.drawElements(this._gl.LINES, this._wireframeIndexCnt, this._gl.UNSIGNED_SHORT, 0);

			return;
		}
	}, {
		key: 'resize',
		value: function resize() {}
	}, {
		key: 'addGui',
		value: function addGui(gui) {
			var _this2 = this;

			var positionFolder = gui.addFolder('position');
			positionFolder.add(this.position, 'x', -200, 200);
			positionFolder.add(this.position, 'y', -200, 200);
			positionFolder.add(this.position, 'z', -200, 200);

			var scaleFolder = gui.addFolder('scale');
			scaleFolder.add(this.scale, 'x', 0.05, 2).step(0.01);
			scaleFolder.add(this.scale, 'y', 0.05, 2).step(0.01);
			scaleFolder.add(this.scale, 'z', 0.05, 2).step(0.01);

			var rotationFolder = gui.addFolder('rotation');
			rotationFolder.add(this.rotation, 'x', -Math.PI, Math.PI).step(0.01);
			rotationFolder.add(this.rotation, 'y', -Math.PI, Math.PI).step(0.01);
			rotationFolder.add(this.rotation, 'z', -Math.PI, Math.PI).step(0.01);

			gui.add(this, '_isWire').name('isWire').onChange(function () {
				if (_this2._isWire && !_this2._wireframeProgram) {
					_this2._makeWireframe();
					_this2._makeWireframeBuffer();
				}
			});
		}
	}, {
		key: '_makeProgram',
		value: function _makeProgram(params) {
			var vertexShaderSrc = params.vertexShaderSrc ? params.vertexShaderSrc : this._isGl2 ? base2ShaderVertSrc : normalShaderVertSrc;
			var fragmentShaderSrc = params.fragmentShaderSrc ? params.fragmentShaderSrc : this._isGl2 ? base2ShaderFragSrc : normalShaderFragSrc;

			this._program = new tubuglCore.Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
		}
	}, {
		key: '_makeWireframe',
		value: function _makeWireframe() {
			this._wireframeProgram = new tubuglCore.Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
		}
	}, {
		key: '_makeBuffer',
		value: function _makeBuffer() {
			var cornerVertices = 8;
			var edgeVertices = (this._segments + this._segments + this._segments - 3) * 4;
			var faceVertices = 2 * ((this._segments - 1) * (this._segments - 1) + (this._segments - 1) * (this._segments - 1) + (this._segments - 1) * (this._segments - 1));
			var verticesLength = cornerVertices + edgeVertices + faceVertices;

			var vertices = [];
			var normals = [];
			this.ring = (this._segments + this._segments) * 2;

			for (var _yy = 0; _yy <= this._segments; _yy++) {
				for (var xx = 0; xx <= this._segments; xx++) {
					ProceduralSphere.getVertex(vertices, normals, xx, _yy, 0, this._radius, this._segments);
				}for (var zz = 1; zz <= this._segments; zz++) {
					ProceduralSphere.getVertex(vertices, normals, this._segments, _yy, zz, this._radius, this._segments);
				}for (var _xx = this._segments - 1; _xx >= 0; _xx--) {
					ProceduralSphere.getVertex(vertices, normals, _xx, _yy, this._segments, this._radius, this._segments);
				}for (var _zz = this._segments - 1; _zz > 0; _zz--) {
					ProceduralSphere.getVertex(vertices, normals, 0, _yy, _zz, this._radius, this._segments);
				}
			}

			for (var _zz2 = 1; _zz2 < this._segments; _zz2++) {
				for (var _xx2 = 1; _xx2 < this._segments; _xx2++) {
					ProceduralSphere.getVertex(vertices, normals, _xx2, this._segments, _zz2, this._radius, this._segments);
				}
			}for (var _zz3 = 1; _zz3 < this._segments; _zz3++) {
				for (var _xx3 = 1; _xx3 < this._segments; _xx3++) {
					ProceduralSphere.getVertex(vertices, normals, _xx3, 0, _zz3, this._radius, this._segments);
				}
			}var indexNum = 0;
			var indices = [];
			var ind = 0;
			for (var yy = 0; yy < this._segments; yy++) {
				for (var ii = 0; ii < this.ring - 1; ii++) {
					indexNum = ProceduralSphere.setQuad(indices, indexNum, ind, ind + 1, ind + this.ring, ind + this.ring + 1);
					ind++;
				}

				indexNum = ProceduralSphere.setQuad(indices, indexNum, ind, ind - this.ring + 1, ind + this.ring, ind + 1);
				ind++;
			}

			indexNum = this._createTopRings(indices, indexNum, this.ring);
			indexNum = this._createBottomFace(indices, indexNum, this.ring, verticesLength);

			this._positionBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(vertices));
			this._positionBuffer.setAttribs('position', 3);

			this._normalBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(normals));
			this._normalBuffer.setAttribs('normal', 3);

			if (this._vao) {
				this._positionBuffer.bind().attribPointer(this._program);
				this._normalBuffer.bind().attribPointer(this._program);
			}
			this._indexBuffer = new tubuglCore.IndexArrayBuffer(this._gl, new Uint16Array(indices));
			this._cnt = indices.length;
		}
	}, {
		key: '_makeWireframeBuffer',
		value: function _makeWireframeBuffer() {
			this._wireframeIndexBuffer = new tubuglCore.IndexArrayBuffer(this._gl, tubuglUtils.generateWireframeIndices(this._indexBuffer.dataArray));
			this._wireframeIndexCnt = this._wireframeIndexBuffer.dataArray.length;
		}
	}, {
		key: '_updateUniforms',
		value: function _updateUniforms(camera) {
			this._gl.uniformMatrix4fv(this._program.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);
		}
	}, {
		key: '_updateAttributes',
		value: function _updateAttributes() {
			if (this._vao) {
				this._vao.bind();
			} else {
				this._positionBuffer.bind().attribPointer(this._program);
				this._normalBuffer.bind().attribPointer(this._program);
				this._indexBuffer.bind();
			}
		}
	}, {
		key: '_createTopRings',
		value: function _createTopRings(indices, indexNum, ring) {
			var v = this.ring * this._segments;
			for (var xx = 0; xx < this._segments - 1; xx++, v++) {
				indexNum = ProceduralSphere.setQuad(indices, indexNum, v, v + 1, v + ring - 1, v + ring);
			}

			indexNum = ProceduralSphere.setQuad(indices, indexNum, v, v + 1, v + ring - 1, v + 2);

			var vMin = ring * (this._segments + 1) - 1;
			var vMid = vMin + 1;
			var vMax = v + 2;

			for (var z = 1; z < this._segments - 1; z++, vMin--, vMid++, vMax++) {
				indexNum = ProceduralSphere.setQuad(indices, indexNum, vMin, vMid, vMin - 1, vMid + this._segments - 1);
				for (var x = 1; x < this._segments - 1; x++, vMid++) {
					indexNum = ProceduralSphere.setQuad(indices, indexNum, vMid, vMid + 1, vMid + this._segments - 1, vMid + this._segments);
				}
				indexNum = ProceduralSphere.setQuad(indices, indexNum, vMid, vMax, vMid + this._segments - 1, vMax + 1);
			}

			var vTop = vMin - 2;
			indexNum = ProceduralSphere.setQuad(indices, indexNum, vMin, vMid, vMin - 1, vMin - 2);

			for (var _x4 = 1; _x4 < this._segments - 1; _x4++, vTop--, vMid++) {
				indexNum = ProceduralSphere.setQuad(indices, indexNum, vMid, vMid + 1, vTop, vTop - 1);
			}

			indexNum = ProceduralSphere.setQuad(indices, indexNum, vMid, vTop - 2, vTop, vTop - 1);

			return indexNum;
		}
	}, {
		key: '_createBottomFace',
		value: function _createBottomFace(indices, indexNum, ring, verticeLength) {
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
				indexNum = ProceduralSphere.setQuad(indices, indexNum, vMin, vMid + this._segments - 1, vMin + 1, vMid);
				for (var _x5 = 1; _x5 < this._segments - 1; _x5++, vMid++) {
					indexNum = ProceduralSphere.setQuad(indices, indexNum, vMid + this._segments - 1, vMid + this._segments, vMid, vMid + 1);
				}
				indexNum = ProceduralSphere.setQuad(indices, indexNum, vMid + this._segments - 1, vMax + 1, vMid, vMax);
			}

			var vTop = vMin - 1;
			indexNum = ProceduralSphere.setQuad(indices, indexNum, vTop + 1, vTop, vTop + 2, vMid);
			for (var _x6 = 1; _x6 < this._segments - 1; _x6++, vTop--, vMid++) {
				indexNum = ProceduralSphere.setQuad(indices, indexNum, vTop, vTop - 1, vMid, vMid + 1);
			}
			indexNum = ProceduralSphere.setQuad(indices, indexNum, vTop, vTop - 1, vMid, vTop - 2);

			return indexNum;
		}
	}], [{
		key: 'getVertex',
		value: function getVertex(vertices, normals, xx, yy, zz, radius, segment) {
			var vec = [xx * 2 / segment - 1, yy * 2 / segment - 1, zz * 2 / segment - 1];

			var x2 = vec[0] * vec[0];
			var y2 = vec[1] * vec[1];
			var z2 = vec[2] * vec[2];
			var ss = [];
			ss[0] = vec[0] * Math.sqrt(1 - y2 / 2 - z2 / 2 + y2 * z2 / 3);
			ss[1] = vec[1] * Math.sqrt(1 - x2 / 2 - z2 / 2 + x2 * z2 / 3);
			ss[2] = vec[2] * Math.sqrt(1 - x2 / 2 - y2 / 2 + x2 * y2 / 3);

			normals.push(ss[0], ss[1], ss[2]);
			vertices.push(radius * ss[0], radius * ss[1], radius * ss[2]);
		}
	}, {
		key: 'setQuad',
		value: function setQuad(indices, ii, v00, v10, v01, v11) {
			indices[ii] = v00;
			indices[ii + 1] = indices[ii + 4] = v01;
			indices[ii + 2] = indices[ii + 3] = v10;
			indices[ii + 5] = v11;
			return ii + 6;
		}
	}]);
	return ProceduralSphere;
}(Shape3D);

var Sphere = function (_Shape3D) {
	inherits(Sphere, _Shape3D);

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
	function Sphere(gl) {
		var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		var radius = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 100;
		var widthSegments = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 10;
		var heightSegments = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 10;
		var phiStart = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;
		var phiLength = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 2 * Math.PI;
		var thetaStart = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : 0;
		var thetaLength = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : Math.PI;
		classCallCheck(this, Sphere);

		var _this = possibleConstructorReturn(this, (Sphere.__proto__ || Object.getPrototypeOf(Sphere)).call(this, gl, params));

		_this._radius = radius;
		_this._widthSegments = widthSegments;
		_this._heightSegments = heightSegments;
		_this._phiStart = phiStart;
		_this._phiLength = phiLength;
		_this._thetaStart = thetaStart;
		_this._thetaLength = thetaLength;

		_this._makeProgram(params);
		_this._makeBuffers();

		if (_this._isWire) {
			_this._makeWireframe();
			_this._makeWireframeBuffer();
		}
		return _this;
	}

	createClass(Sphere, [{
		key: 'getModelMatrix',
		value: function getModelMatrix() {
			return this.modelMatrix;
		}
	}, {
		key: 'getVertice',
		value: function getVertice() {
			return this._positionBuffer.dataArray;
		}
	}, {
		key: 'getNormals',
		value: function getNormals() {
			return this._normalBuffer.dataArray;
		}
	}, {
		key: 'render',
		value: function render(camera) {
			this.update(camera).draw();
			if (this._isWire) this.updateWire(camera).drawWireframe();
		}
	}, {
		key: 'updateWire',
		value: function updateWire(camera) {
			var prg = this._wireframeProgram;

			prg.bind();
			this._positionBuffer.bind().attribPointer(prg);
			this._wireframeIndexBuffer.bind();

			this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);

			return this;
		}
	}, {
		key: 'draw',
		value: function draw() {
			if (this._side === 'double') {
				this._gl.disable(this._gl.CULL_FACE);
			} else if (this._side === 'front') {
				this._gl.enable(this._gl.CULL_FACE);
				this._gl.cullFace(this._gl.BACK);
			} else {
				this._gl.enable(this._gl.CULL_FACE);
				this._gl.cullFace(this._gl.FRONT);
			}

			if (this._isDepthTest) this._gl.enable(this._gl.DEPTH_TEST);else this._gl.disable(this._gl.DEPTH_TEST);

			if (this._isTransparent) {
				this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);
				this._gl.enable(this._gl.BLEND);
			} else {
				this._gl.blendFunc(this._gl.ONE, this._gl.ZERO);
				this._gl.disable(this._gl.BLEND);
			}

			this._gl.drawElements(this._gl.TRIANGLES, this._cnt, this._gl.UNSIGNED_SHORT, 0);

			return this;
		}
	}, {
		key: 'drawWireframe',
		value: function drawWireframe() {
			this._gl.drawElements(this._gl.LINES, this._wireframeIndexCnt, this._gl.UNSIGNED_SHORT, 0);

			return;
		}
	}, {
		key: 'resize',
		value: function resize() {}
	}, {
		key: 'addGui',
		value: function addGui(gui) {
			var _this2 = this;

			gui.add(this, '_isWire').name('isWire').onChange(function () {
				if (_this2._isWire && !_this2._wireframeProgram) {
					_this2._makeWireframe();
					_this2._makeWireframeBuffer();
				}
			});

			var positionGui = gui.addFolder('position');
			positionGui.add(this.position, 'x', -100, 100);
			positionGui.add(this.position, 'y', -100, 100);
			positionGui.add(this.position, 'z', -100, 100);

			var rotationGui = gui.addFolder('rotation');
			rotationGui.add(this.rotation, 'x', -Math.PI, Math.PI).step(0.01);
			rotationGui.add(this.rotation, 'y', -Math.PI, Math.PI).step(0.01);
			rotationGui.add(this.rotation, 'z', -Math.PI, Math.PI).step(0.01);
		}
	}, {
		key: '_makeProgram',
		value: function _makeProgram(params) {
			var vertexShaderSrc = params.vertexShaderSrc ? params.vertexShaderSrc : this._isGl2 ? base2ShaderVertSrc : baseUVShaderVertSrc;

			var fragmentShaderSrc = params.fragmentShaderSrc ? params.fragmentShaderSrc : this._isGl2 ? base2ShaderFragSrc : baseUVShaderFragSrc;

			this._program = new tubuglCore.Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
		}
	}, {
		key: '_makeWireframe',
		value: function _makeWireframe() {
			this._wireframeProgram = new tubuglCore.Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
		}
	}, {
		key: '_makeBuffers',
		value: function _makeBuffers() {
			if (this._isGl2) {
				this._vao = new tubuglCore.VAO(this._gl);
				this._vao.bind();
			}

			var _Sphere$getData = Sphere.getData(this._radius, this._widthSegments, this._heightSegments, this._phiStart, this._phiLength, this._thetaStart, this._thetaLength),
			    vertice = _Sphere$getData.vertice,
			    uvs = _Sphere$getData.uvs,
			    normals = _Sphere$getData.normals,
			    indices = _Sphere$getData.indices;

			this._positionBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(vertice));
			this._positionBuffer.setAttribs('position', 3);
			this._normalBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(normals));
			this._normalBuffer.setAttribs('normal', 3);
			this._uvBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(uvs));
			this._uvBuffer.setAttribs('uv', 2);

			if (this._vao) {
				this._positionBuffer.bind().attribPointer(this._program);
				this._normalBuffer.bind().attribPointer(this._program);
				this._uvBuffer.bind().attribPointer(this._program);
			}

			this._indexBuffer = new tubuglCore.IndexArrayBuffer(this._gl, new Uint16Array(indices));
			this._cnt = indices.length;
		}
	}, {
		key: '_makeWireframeBuffer',
		value: function _makeWireframeBuffer() {
			this._wireframeIndexBuffer = new tubuglCore.IndexArrayBuffer(this._gl, tubuglUtils.generateWireframeIndices(this._indexBuffer.dataArray));
			this._wireframeIndexCnt = this._wireframeIndexBuffer.dataArray.length;
		}
	}, {
		key: '_updateAttributes',
		value: function _updateAttributes() {
			if (this._vao) {
				this._vao.bind();
			} else {
				this._positionBuffer.bind().attribPointer(this._program);
				this._normalBuffer.bind().attribPointer(this._program);
				this._uvBuffer.bind().attribPointer(this._program);
				this._indexBuffer.bind();
			}
		}
	}, {
		key: '_updateUniforms',
		value: function _updateUniforms(camera) {
			this._gl.uniformMatrix4fv(this._program.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);
		}
	}], [{
		key: 'getData',
		value: function getData(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength) {
			var grid = [];
			var indices = [];
			var vertices = [];
			var normals = [];
			var uvs = [];
			var index = 0;
			var normalVec3 = glMatrix.vec3.create();

			for (var yy = 0; yy <= heightSegments; yy++) {
				var verticeRow = [];
				var vv = yy / heightSegments;
				for (var xx = 0; xx <= widthSegments; xx++) {
					var uu = xx / widthSegments;
					var phi = phiStart + phiLength * uu;
					var theta = thetaStart + thetaLength * vv;

					var vertex = [-radius * Math.cos(phi) * Math.sin(theta), radius * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta)];

					vertices.push(vertex[0], vertex[1], vertex[2]);

					glMatrix.vec3.normalize(normalVec3, vertex);
					normals.push(normalVec3[0], normalVec3[1], normalVec3[2]);

					uvs.push(uu, 1 - vv);

					verticeRow.push(index++);
				}

				grid.push(verticeRow);
			}

			var thetaEnd = thetaStart + thetaLength;
			for (var _yy = 0; _yy < heightSegments; _yy++) {
				for (var _xx = 0; _xx < widthSegments; _xx++) {
					var a = grid[_yy][_xx + 1];
					var b = grid[_yy][_xx];
					var c = grid[_yy + 1][_xx];
					var d = grid[_yy + 1][_xx + 1];

					if (_yy !== 0 || thetaStart > 0) indices.push(a, b, d);
					if (_yy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(b, c, d);
				}
			}

			return { vertice: vertices, uvs: uvs, normals: normals, indices: indices };
		}
	}]);
	return Sphere;
}(Shape3D);

var Cone = function (_Shape3D) {
	inherits(Cone, _Shape3D);

	function Cone(gl, params, radius, height) {
		var radialSegments = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 3;
		classCallCheck(this, Cone);

		var _this = possibleConstructorReturn(this, (Cone.__proto__ || Object.getPrototypeOf(Cone)).call(this, gl, params));

		_this._radius = radius;
		_this._height = height;
		_this._radialSegments = radialSegments;
		if (_this._radialSegments < 3) {
			console.warn('make sure radialsegment more than 3');
			return possibleConstructorReturn(_this);
		}

		_this._makeProgram(params);
		_this._makeBuffers(params, radialSegments);

		if (_this._isWire) {
			_this._makeWireframe();
			_this._makeWireframeBuffer();
		}
		return _this;
	}

	createClass(Cone, [{
		key: 'getVertice',
		value: function getVertice() {
			return this._positionBuffer.dataArray;
		}
	}, {
		key: 'getNormals',
		value: function getNormals() {
			return this._normalBuffer.dataArray;
		}
	}, {
		key: 'render',
		value: function render(camera) {
			this.update(camera).draw();
			if (this._isWire) this.updateWire(camera).drawWireframe();
		}
	}, {
		key: 'addGui',
		value: function addGui(gui) {
			var _this2 = this;

			var positionFolder = gui.addFolder('position');
			positionFolder.add(this.position, 'x', -200, 200);
			positionFolder.add(this.position, 'y', -200, 200);
			positionFolder.add(this.position, 'z', -200, 200);

			var scaleFolder = gui.addFolder('scale');
			scaleFolder.add(this.scale, 'x', 0.05, 2).step(0.01);
			scaleFolder.add(this.scale, 'y', 0.05, 2).step(0.01);
			scaleFolder.add(this.scale, 'z', 0.05, 2).step(0.01);

			var rotationFolder = gui.addFolder('rotation');
			rotationFolder.add(this.rotation, 'x', -Math.PI, Math.PI).step(0.01);
			rotationFolder.add(this.rotation, 'y', -Math.PI, Math.PI).step(0.01);
			rotationFolder.add(this.rotation, 'z', -Math.PI, Math.PI).step(0.01);

			gui.add(this, '_isWire').name('isWire').onChange(function () {
				if (_this2._isWire && !_this2._wireframeProgram) {
					_this2._makeWireframe();
					_this2._makeWireframeBuffer();
				}
			});
		}

		// ========================
		//        private
		// ========================

	}, {
		key: '_makeProgram',
		value: function _makeProgram(params) {
			var vertexShaderSrc = params.vertexShaderSrc ? params.vertexShaderSrc : this._isGl2 ? base2ShaderVertSrc : normalShaderVertSrc;
			var fragmentShaderSrc = params.fragmentShaderSrc ? params.fragmentShaderSrc : this._isGl2 ? base2ShaderFragSrc : normalShaderFragSrc;

			this._program = new tubuglCore.Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
		}
	}, {
		key: '_makeWireframe',
		value: function _makeWireframe() {
			this._wireframeProgram = new tubuglCore.Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
		}
	}, {
		key: '_makeBuffers',
		value: function _makeBuffers() {
			var vertices = [];
			var rawVertices = [];
			var indices = [];
			var normals = [];

			var yPos = -this._height / 2;

			// make bottom part of shape
			rawVertices.push(0, yPos, 0);

			for (var ii = 0; ii < this._radialSegments; ii++) {
				var theta = ii / this._radialSegments * 2 * Math.PI;
				var xPos = Math.cos(theta) * this._radius;
				var zPos = Math.sin(theta) * this._radius;

				rawVertices.push(xPos, yPos, zPos);
			}

			// make side part of shape

			rawVertices.push(0, -yPos, 0);

			for (var _ii = 0; _ii < this._radialSegments; _ii++) {
				var _theta = _ii / this._radialSegments * 2 * Math.PI;
				var _xPos = Math.cos(_theta) * this._radius;
				var _zPos = Math.sin(_theta) * this._radius;

				rawVertices.push(_xPos, yPos, _zPos);
			}

			// ----------------------
			// ----------------------

			for (var _ii2 = 0; _ii2 < this._radialSegments; _ii2++) {
				var curIndex = _ii2 + 1;
				var nextIndex = (_ii2 + 1) % this._radialSegments + 1;
				var center = 0;
				indices.push(curIndex, nextIndex, center);
			}

			for (var _ii3 = 0; _ii3 < this._radialSegments; _ii3++) {
				var _curIndex = _ii3 + this._radialSegments + 2;
				var _nextIndex = (_ii3 + 1) % this._radialSegments + this._radialSegments + 2;
				var _center = this._radialSegments + 1;
				indices.push(_curIndex, _center, _nextIndex);
			}

			// ----------------------
			// ----------------------

			indices.forEach(function (index) {
				var xPos = rawVertices[3 * index + 0];
				var yPos = rawVertices[3 * index + 1];
				var zPos = rawVertices[3 * index + 2];

				vertices.push(xPos, yPos, zPos);
			});

			// calculate normals
			var vec3A = glMatrix.vec3.create();
			var vec3B = glMatrix.vec3.create();
			var normalVec3 = glMatrix.vec3.create();

			for (var _ii4 = 0; _ii4 < vertices.length / 9; _ii4++) {
				for (var jj = 0; jj < 3; jj++) {
					var curPosX = vertices[9 * _ii4 + 3 * jj];
					var curPosY = vertices[9 * _ii4 + 3 * jj + 1];
					var curPosZ = vertices[9 * _ii4 + 3 * jj + 2];

					var nextRPosX = vertices[9 * _ii4 + 3 * ((jj + 1) % 3)];
					var nextRPosY = vertices[9 * _ii4 + 3 * ((jj + 1) % 3) + 1];
					var nextRPosZ = vertices[9 * _ii4 + 3 * ((jj + 1) % 3) + 2];

					var nextLPosX = vertices[9 * _ii4 + 3 * ((jj + 2) % 3)];
					var nextLPosY = vertices[9 * _ii4 + 3 * ((jj + 2) % 3) + 1];
					var nextLPosZ = vertices[9 * _ii4 + 3 * ((jj + 2) % 3) + 2];

					vec3A[0] = nextRPosX - curPosX;
					vec3A[1] = nextRPosY - curPosY;
					vec3A[2] = nextRPosZ - curPosZ;

					vec3B[0] = nextLPosX - curPosX;
					vec3B[1] = nextLPosY - curPosY;
					vec3B[2] = nextLPosZ - curPosZ;

					glMatrix.vec3.cross(normalVec3, vec3A, vec3B);
					glMatrix.vec3.normalize(normalVec3, normalVec3);

					normals.push(normalVec3[0], normalVec3[1], normalVec3[2]);
				}
			}

			this._positionBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(vertices));
			this._positionBuffer.setAttribs('position', 3);

			this._normalBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(normals));
			this._normalBuffer.setAttribs('normal', 3);

			this._cnt = vertices.length / 3;
		}
	}, {
		key: '_makeWireframeBuffer',
		value: function _makeWireframeBuffer() {
			var vertices = [];
			var yPos = -this._height / 2;
			var topPos = { x: 0, y: -yPos, z: 0 };
			var bottomPos = { x: 0, y: yPos, z: 0 };

			for (var ii = 0; ii < this._radialSegments; ii++) {
				var theta = ii / this._radialSegments * 2 * Math.PI;
				var nextTheta = (ii + 1) / this._radialSegments * 2 * Math.PI;

				var xPos = Math.cos(theta) * this._radius;
				var zPos = Math.sin(theta) * this._radius;

				var nextXPos = Math.cos(nextTheta) * this._radius;
				var nextZPos = Math.sin(nextTheta) * this._radius;

				vertices.push(xPos, yPos, zPos, nextXPos, yPos, nextZPos);
				vertices.push(nextXPos, yPos, nextZPos, topPos.x, topPos.y, topPos.z);
				vertices.push(topPos.x, topPos.y, topPos.z, xPos, yPos, zPos);
				vertices.push(xPos, yPos, zPos, bottomPos.x, bottomPos.y, bottomPos.z);
				vertices.push(nextXPos, yPos, nextZPos, bottomPos.x, bottomPos.y, bottomPos.z);
			}

			this._wirePositionBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(vertices));
			this._wirePositionBuffer.setAttribs('position', 3);

			this._wireframeCnt = vertices.length / 3;
		}
	}, {
		key: '_updateUniforms',
		value: function _updateUniforms(camera) {
			this._gl.uniformMatrix4fv(this._program.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);
		}
	}, {
		key: '_updateAttributes',
		value: function _updateAttributes() {
			this._positionBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
		}
	}, {
		key: 'draw',
		value: function draw() {
			this._updateDrawStatus();
			this._gl.drawArrays(this._gl.TRIANGLES, 0, this._cnt);

			return this;
		}
	}, {
		key: 'updateWire',
		value: function updateWire(camera) {
			var prg = this._wireframeProgram;

			prg.bind();
			this._wirePositionBuffer.bind().attribPointer(prg);
			// this._wireframeIndexBuffer.bind();

			this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);

			return this;
		}
	}, {
		key: 'drawWireframe',
		value: function drawWireframe() {
			this._gl.drawArrays(this._gl.LINES, 0, this._wireframeCnt);
			return this;
		}
	}]);
	return Cone;
}(Shape3D);

var Cylinder = function (_Shape3D) {
	inherits(Cylinder, _Shape3D);

	function Cylinder(gl, params, radiusTop, radiusBottom, height) {
		var radialSegments = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 3;
		var heightSegments = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 2;
		classCallCheck(this, Cylinder);

		var _this = possibleConstructorReturn(this, (Cylinder.__proto__ || Object.getPrototypeOf(Cylinder)).call(this, gl, params));

		_this._radiusTop = radiusTop;
		_this._radiusBottom = radiusBottom;
		_this._height = height;
		_this._radialSegments = radialSegments;
		_this._heightSegments = heightSegments;

		if (_this._radialSegments < 3) {
			console.warn('make sure radialsegment more than 3');
			return possibleConstructorReturn(_this);
		}

		_this._makeProgram(params);
		_this._makeBuffers(params, radialSegments);

		if (_this._isWire) {
			_this._makeWireframe();
			_this._makeWireframeBuffer();
		}
		return _this;
	}

	createClass(Cylinder, [{
		key: 'getVertice',
		value: function getVertice() {
			return this._positionBuffer.dataArray;
		}
	}, {
		key: 'getNormals',
		value: function getNormals() {
			return this._normalBuffer.dataArray;
		}
	}, {
		key: 'render',
		value: function render(camera) {
			this.update(camera).draw();
			if (this._isWire) this.updateWire(camera).drawWireframe();
		}
	}, {
		key: 'addGui',
		value: function addGui(gui) {
			var _this2 = this;

			var positionFolder = gui.addFolder('position');
			positionFolder.add(this.position, 'x', -200, 200);
			positionFolder.add(this.position, 'y', -200, 200);
			positionFolder.add(this.position, 'z', -200, 200);

			var scaleFolder = gui.addFolder('scale');
			scaleFolder.add(this.scale, 'x', 0.05, 2).step(0.01);
			scaleFolder.add(this.scale, 'y', 0.05, 2).step(0.01);
			scaleFolder.add(this.scale, 'z', 0.05, 2).step(0.01);

			var rotationFolder = gui.addFolder('rotation');
			rotationFolder.add(this.rotation, 'x', -Math.PI, Math.PI).step(0.01);
			rotationFolder.add(this.rotation, 'y', -Math.PI, Math.PI).step(0.01);
			rotationFolder.add(this.rotation, 'z', -Math.PI, Math.PI).step(0.01);

			gui.add(this, '_isWire').name('isWire').onChange(function () {
				if (_this2._isWire && !_this2._wireframeProgram) {
					_this2._makeWireframe();
					_this2._makeWireframeBuffer();
				}
			});
		}

		// ========================
		//        private
		// ========================

	}, {
		key: '_makeProgram',
		value: function _makeProgram(params) {
			var vertexShaderSrc = params.vertexShaderSrc ? params.vertexShaderSrc : this._isGl2 ? base2ShaderVertSrc : normalShaderVertSrc;
			var fragmentShaderSrc = params.fragmentShaderSrc ? params.fragmentShaderSrc : this._isGl2 ? base2ShaderFragSrc : normalShaderFragSrc;

			this._program = new tubuglCore.Program(this._gl, vertexShaderSrc, fragmentShaderSrc);
		}
	}, {
		key: '_makeWireframe',
		value: function _makeWireframe() {
			this._wireframeProgram = new tubuglCore.Program(this._gl, baseShaderVertSrc, wireFrameFragSrc);
		}
	}, {
		key: '_makeBuffers',
		value: function _makeBuffers() {
			var vertices = [];
			var indices = [];
			var normals = [];
			var uvs = [];
			var index = 0;

			index = this._generateTorso(vertices, indices, normals, uvs, index);
			index = this._generateCap(true, vertices, indices, normals, uvs, index);
			index = this._generateCap(false, vertices, indices, normals, uvs, index);

			// console.log(vertices, indices, normals, uvs);

			this._positionBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(vertices));
			this._positionBuffer.setAttribs('position', 3);

			this._normalBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(normals));
			this._normalBuffer.setAttribs('normal', 3);

			this._uvBuffer = new tubuglCore.ArrayBuffer(this._gl, new Float32Array(uvs));
			this._uvBuffer.setAttribs('uv', 2);

			this._indexBuffer = new tubuglCore.IndexArrayBuffer(this._gl, new Uint16Array(indices));

			this._cnt = indices.length;
		}
	}, {
		key: '_generateTorso',
		value: function _generateTorso(vertices, indices, normals, uvs, index) {
			var slope = (this._radiusBottom - this._radiusBottom) / this._height;
			var indexArray = [];

			var normal = glMatrix.vec3.create();

			for (var yy = 0; yy <= this._heightSegments; yy++) {
				var indexRow = [];
				var vv = yy / this._heightSegments;

				var radius = vv * (this._radiusBottom - this._radiusTop) + this._radiusTop;

				for (var xx = 0; xx <= this._radialSegments; xx++) {
					var uu = xx / this._radialSegments;
					var theta = 2 * Math.PI * uu;

					var sinTheta = Math.sin(theta);
					var cosTheta = Math.cos(theta);

					vertices.push(radius * sinTheta, (-vv + 0.5) * this._height, radius * cosTheta);
					glMatrix.vec3.normalize(normal, [sinTheta, slope, cosTheta]);
					normals.push(normal[0], normal[1], normal[2]);
					uvs.push(uu, 1 - vv);

					indexRow.push(index++);
				}

				indexArray.push(indexRow);
			}

			for (var _xx = 0; _xx < this._radialSegments; _xx++) {
				for (var _yy = 0; _yy < this._heightSegments; _yy++) {
					var a = indexArray[_yy][_xx];
					var b = indexArray[_yy + 1][_xx];
					var c = indexArray[_yy + 1][_xx + 1];
					var d = indexArray[_yy][_xx + 1];

					// faces

					indices.push(a, b, d);
					indices.push(b, c, d);
				}
			}

			return index;
		}
	}, {
		key: '_generateCap',
		value: function _generateCap() {
			var isTop = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
			var vertices = arguments[1];
			var indices = arguments[2];
			var normals = arguments[3];
			var uvs = arguments[4];
			var index = arguments[5];

			var centerIndexStart = void 0,
			    centerIndexEnd = void 0;

			var sign = isTop === true ? 1 : -1;
			var radius = isTop === true ? this._radiusTop : this._radiusBottom;

			centerIndexStart = index;

			for (var xx = 1; xx <= this._radialSegments; xx++) {
				vertices.push(0, this._height / 2 * sign, 0);
				normals.push(0, sign, 0);
				uvs.push(0.5, 0.5);
				index++;
			}

			centerIndexEnd = index;

			for (var _xx2 = 0; _xx2 <= this._radialSegments; _xx2++) {
				var u = _xx2 / this._radialSegments;
				var theta = u * 2 * Math.PI;

				var cosTheta = Math.cos(theta);
				var sinTheta = Math.sin(theta);

				vertices.push(radius * sinTheta, sign * this._height / 2, radius * cosTheta);

				normals.push(0, sign, 0);

				uvs.push(cosTheta * 0.5 + 0.5, sinTheta * 0.5 * sign + 0.5);
				index++;
			}

			for (var _xx3 = 0; _xx3 < this._radialSegments; _xx3++) {
				var c = centerIndexStart + _xx3;
				var i = centerIndexEnd + _xx3;

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
	}, {
		key: '_makeWireframeBuffer',
		value: function _makeWireframeBuffer() {
			this._wireframeIndexBuffer = new tubuglCore.IndexArrayBuffer(this._gl, tubuglUtils.generateWireframeIndices(this._indexBuffer.dataArray));
			this._wireframeIndexCnt = this._wireframeIndexBuffer.dataArray.length;
		}
	}, {
		key: '_updateUniforms',
		value: function _updateUniforms(camera) {
			this._gl.uniformMatrix4fv(this._program.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(this._program.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);
		}
	}, {
		key: '_updateAttributes',
		value: function _updateAttributes() {
			this._positionBuffer.bind().attribPointer(this._program);
			this._uvBuffer.bind().attribPointer(this._program);
			this._normalBuffer.bind().attribPointer(this._program);
			this._indexBuffer.bind();
		}
	}, {
		key: 'draw',
		value: function draw() {
			this._updateDrawStatus();
			this._gl.drawElements(this._gl.TRIANGLES, this._cnt, this._gl.UNSIGNED_SHORT, 0);

			return this;
		}
	}, {
		key: 'updateWire',
		value: function updateWire(camera) {
			var prg = this._wireframeProgram;

			prg.bind();
			this._positionBuffer.bind().attribPointer(prg);
			this._wireframeIndexBuffer.bind();

			this._gl.uniformMatrix4fv(prg.getUniforms('modelMatrix').location, false, this.modelMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('viewMatrix').location, false, camera.viewMatrix);
			this._gl.uniformMatrix4fv(prg.getUniforms('projectionMatrix').location, false, camera.projectionMatrix);

			return this;
		}
	}, {
		key: 'drawWireframe',
		value: function drawWireframe() {
			this._gl.drawElements(this._gl.LINES, this._wireframeIndexCnt, this._gl.UNSIGNED_SHORT, 0);
			return this;
		}
	}]);
	return Cylinder;
}(Shape3D);

exports.Cube = Cube;
exports.TextureCube = TextureCube;
exports.ProceduralCube = ProceduralCube;
exports.ProceduralRoundingCube = ProceduralRoundingCube;
exports.ProceduralSphere = ProceduralSphere;
exports.Sphere = Sphere;
exports.Cone = Cone;
exports.Cylinder = Cylinder;
exports.Object3D = Object3D;
exports.Shape3D = Shape3D;

Object.defineProperty(exports, '__esModule', { value: true });

})));
