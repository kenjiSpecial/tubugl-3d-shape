import { Object3D } from './object3D';

export class Shape3D extends Object3D {
	/**
	 *
	 * @param {webglContext} gl
	 * @param {*} params
	 */
	constructor(gl, params = {}) {
		super(gl, params);
	}
}
