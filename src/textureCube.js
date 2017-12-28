import { Cube } from './cube';
import { baseUVShaderVertSrc, baseTextureShaderFragSrc } from './shaders/base.shader';
import { Program } from 'tubugl-core/src/program';

export class TextureCube extends Cube {
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
		super(gl, width, height, depth, widthSegment, heightSegment, depthSegment, params);

		this._texture = params.texture;
	}
	_makeProgram() {
		this._program = new Program(this._gl, baseUVShaderVertSrc, baseTextureShaderFragSrc);
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
