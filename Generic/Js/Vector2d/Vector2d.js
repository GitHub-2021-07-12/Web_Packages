import {Common} from '/$/Packages/Generic/Js/Common/Common.js';


export class Vector2d {
    x = 0;
    y = 0;


    get length() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
    set length(value) {
        if (this.isZero()) return;

        let n = value / this.length;
        this.x *= n;
        this.y *= n;
    }


    clone() {
        return new this.constructor(this.x, this.y);
    }

    constructor(x = 0, y = x) {
        this.set(x, y);
    }

    divide(num) {
        this.x /= num;
        this.y /= num;

        return this;
    }

    getCos(vector) {
        return this.prodScalar(vector) / (this.length * vector.length);
    }

    invert() {
        this.x = -this.x;
        this.y = -this.y;

        return this;
    }

    isEqual(vector) {
        return this.x == vector.x && this.y == vector.y;
    }

    isFinite() {
        return Number.isFinite(this.x) && Number.isFinite(this.y);
    }

    isZero() {
        return !this.x && !this.y;
    }

    norm() {
        this.length = 1;

        return this;
    }

    prod(num) {
        this.x *= num;
        this.y *= num;

        return this;
    }

    prodScalar(vector) {
        return this.x * vector.x + this.y * vector.y;
    }

    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);

        return this;
    }

    set(x, y = x) {
        this.x = x;
        this.y = y;

        return this;
    }

    setLength(value) {
        this.length = value;

        return this;
    }

    setVector(vector) {
        this.x = vector.x;
        this.y = vector.y;

        return this;
    }

    sub(vector) {
        this.x -= vector.x;
        this.y -= vector.y;

        return this;
    }

    sum(vector) {
        this.x += vector.x;
        this.y += vector.y;

        return this;
    }

    toRange(vectorMin, vectorMax) {
        this.toRangeX(vectorMin.x, vectorMax.x);
        this.toRangeY(vectorMin.y, vectorMax.y);

        return this;
    }

    toRangeLength(lengthMin, lengthMax) {
        this.length = Common.toRange(this.length, lengthMin, lengthMax);

        return this;
    }

    toRangeX(xMin, xMax) {
        this.x = Common.toRange(this.x, xMin, xMax);

        return this;
    }

    toRangeY(yMin, yMax) {
        this.y = Common.toRange(this.y, yMin, yMax);

        return this;
    }
}
