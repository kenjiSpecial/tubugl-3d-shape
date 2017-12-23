import { Box } from './box';

export class NormalBox extends Box {
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
		super(gl, width, height, depth, widthSegments, heightSegments, depthSegments, params);
	}
}
