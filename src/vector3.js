export class Vector3 {
	constructor(x = 0, y = 0, z = 0) {
		this.needsUpdate = true;

		this._x = x;
		this._y = y;
		this._z = z;

		this.array = new Float32Array([x, y, z]);
	}
	set x(value) {
		this.needsUpdate = true;
		this._x = value;
		this.array[0] = value;
		// console.log(value);
	}
	get x() {
		return this._x;
	}
	set y(value) {
		this.needsUpdate = true;
		this._y = value;
		this.array[1] = value;
	}
	get y() {
		return this._y;
	}
	set z(value) {
		this.needsUpdate = true;
		this._z = value;
		this.array[2] = value;
	}
	get z() {
		return this._z;
	}
}
