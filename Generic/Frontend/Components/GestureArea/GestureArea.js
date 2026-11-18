import {Component} from '/$/Packages/Generic/Frontend/Components/Component/Component.js';

import {Common} from '/$/Packages/Generic/Js/Common/Common.js';
import {Executor} from '/$/Packages/Generic/Js/Executor/Executor.js';
import {Vector2d} from '/$/Packages/Generic/Js/Vector2d/Vector2d.js';


export class GestureArea extends Component {
    static _Pointer = class {
        static _exclusiveCaptors = new Map();
        static _idsCaptured = new Set();


        static pointsCountMax = 4;


        __rectInitial = null;


        _captured = false;
        _component = null;
        _id = 0;
        _magnetAreasBottomBottom = new Set();
        _magnetAreasBottomTop = new Set();
        _magnetAreasLeftLeft = new Set();
        _magnetAreasLeftRight = new Set();
        _magnetAreasRightLeft = new Set();
        _magnetAreasRightRight = new Set();
        _magnetAreasTopBottom = new Set();
        _magnetAreasTopTop = new Set();
        _magnetVector = new Vector2d();
        _points = [];
        _positionDelta = new Vector2d();
        _positionDeltaModified = new Vector2d();
        _positionInner = new Vector2d();
        _positionInnerInitial = new Vector2d();
        _positionOuter = new Vector2d();
        _positionOuterInitial = new Vector2d();
        _rectDeltaBounded = null;
        _shifted = false;
        _target = null;
        _timeStamp = 0;
        _timeStampInitial = 0;
        _velocity = new Vector2d();

        _rectDelta = {
            bottom: undefined,
            left: undefined,
            right: undefined,
            top: undefined,
        };


        get rectInitial() {
            return this.__rectInitial;
        }
        set rectInitial(rectInitial) {
            this.__rectInitial = rectInitial;
            this._rectDeltaBounded = null;

            if (this.rectInitial && !this._component.bound) return;

            let boundDomRect = GestureArea.getDomRect(this._component.bound);
            this._rectDeltaBounded = {
                bottom: boundDomRect.bottom - this.rectInitial.bottom,
                left: boundDomRect.left - this.rectInitial.left,
                right: boundDomRect.right - this.rectInitial.right,
                top: boundDomRect.top - this.rectInitial.top,
            };
        }

        _defineVelocity() {
            let pointFirst = this._points[0];
            let pointLast = this._points.at(-1);
            let dt = (pointLast?.timeStamp - pointFirst?.timeStamp) / 1e3;

            if (!dt) return;

            this._velocity.setVector(pointLast.position).sub(pointFirst.position).divide(dt);
        }

        _detectShift() {
            if (this._shifted || this._positionDelta.length < this._component.shift) return;

            this._shifted = true;

            if (this._component.shiftJumping || this._component.shift <= 1) return;

            this._positionDelta.length = this._component.shift - 1;
            this._positionDelta.round();
            this._positionInnerInitial.sum(this._positionDelta);
            this._positionOuterInitial.sum(this._positionDelta);
            this._positionDelta.set(0);
        }

        _updatePoints() {
            this._points.push({
                position: this._positionOuter.clone(),
                timeStamp: this._timeStamp,
            });

            if (this._points.length > this.constructor.pointsCountMax) {
                this._points.shift();
            }
        }

        _updatePositions(event) {
            if (this._component.vertical) {
                if (this._component.invertedX) {
                    this._positionInner.x = this._component.clientHeight - event.offsetY - 1;
                    this._positionOuter.x = document.scrollingElement.scrollHeight - event.pageY - 1;
                }
                else {
                    this._positionInner.x = event.offsetY;
                    this._positionOuter.x = event.pageY;
                }

                if (this._component.invertedY) {
                    this._positionInner.y = this._component.clientWidth - event.offsetX - 1;
                    this._positionOuter.y = document.scrollingElement.scrollWidth - event.pageX - 1;
                }
                else {
                    this._positionInner.y = event.offsetX;
                    this._positionOuter.y = event.pageX;
                }
            }
            else {
                if (this._component.invertedX) {
                    this._positionInner.x = this._component.clientWidth - event.offsetX - 1;
                    this._positionOuter.x = document.scrollingElement.scrollWidth - event.pageX - 1;
                }
                else {
                    this._positionInner.x = event.offsetX;
                    this._positionOuter.x = event.pageX;
                }

                if (this._component.invertedY) {
                    this._positionInner.y = this._component.clientHeight - event.offsetY - 1;
                    this._positionOuter.y = document.scrollingElement.scrollHeight - event.pageY - 1;
                }
                else {
                    this._positionInner.y = event.offsetY;
                    this._positionOuter.y = event.pageY;
                }
            }
        }


        capture(exclusive = true) {
            let exclusiveCaptors = this.constructor._exclusiveCaptors;
            let idsCaptured = this.constructor._idsCaptured;

            if (exclusive && !exclusiveCaptors.has(this._id)) {
                if (this._component.exclusiveCapture) {
                    exclusiveCaptors.set(this._id, this._component);
                }
                else {
                    this._captured = true;
                }
            }

            if (idsCaptured.has(this._id)) return;

            this._target.setPointerCapture(this._id);
            idsCaptured.add(this._id);
        }

        checkCapture() {
            let exclusiveCaptor = this.constructor._exclusiveCaptors.get(this._id);

            return exclusiveCaptor ? exclusiveCaptor == this._component : this._captured;
        }

        constructor(component, event) {
            this._component = component;
            this._id = event.pointerId;
            this._target = this._component._pointerTarget || event.target;
            this._updatePositions(event);
            this.updateTimestamp();
            this._timeStampInitial = this._timeStamp;
            this._positionInnerInitial.setVector(this._positionInner);
            this._positionOuterInitial.setVector(this._positionOuter);
        }

        release() {
            this._captured = false;
            this._target.releasePointerCapture(this._id);
            this.constructor._exclusiveCaptors.delete(this._id);
            this.constructor._idsCaptured.delete(this._id);
        }

        update(event) {
            this._updatePositions(event);
            this.updateTimestamp();
            this._positionDelta.setVector(this._positionOuter).sub(this._positionOuterInitial);
            this._detectShift();

            if (!this._shifted) return;

            this._updatePoints();
            this._defineVelocity();
            this._positionDeltaModified.setVector(this._positionDelta);

            if (this._component.axis == 'x') {
                this._positionDeltaModified.y = 0;
            }
            else {
                let step = this._component.stepY || this._component.step;
                this._positionDeltaModified.y = Math.round(this._positionDeltaModified.y / step) * step;
            }

            if (this._component.axis == 'y') {
                this._positionDeltaModified.x = 0;
            }
            else {
                let step = this._component.stepX || this._component.step;
                this._positionDeltaModified.x = Math.round(this._positionDeltaModified.x / step) * step;
            }

            this._positionDeltaModified
                .prod(this._component.swipeFactor)
                .toRangeLength(0, this._component.radius)
                .round()
            ;
        }

        updateMagnetVector() {
            let magnetAreas = this._component.magnetAreas;
            let magnetism = this._component.magnetism;
            this._magnetAreasBottomBottom.clear();
            this._magnetAreasBottomTop.clear();
            this._magnetAreasLeftLeft.clear();
            this._magnetAreasLeftRight.clear();
            this._magnetAreasRightLeft.clear();
            this._magnetAreasRightRight.clear();
            this._magnetAreasTopBottom.clear();
            this._magnetAreasTopTop.clear();
            this._magnetVector.set(null);

            if (!(magnetism && this._rectDelta && this.rectInitial && magnetAreas?.size)) return;

            let magnetAreasBottomBottom = new Map();
            let magnetAreasBottomTop = new Map();
            let magnetAreasLeftLeft = new Map();
            let magnetAreasLeftRight = new Map();
            let magnetAreasRightLeft = new Map();
            let magnetAreasRightRight = new Map();
            let magnetAreasTopBottom = new Map();
            let magnetAreasTopTop = new Map();
            let magnetRect = {
                bottom: this.rectInitial.bottom + (this._rectDelta.bottom || 0),
                left: this.rectInitial.left + (this._rectDelta.left || 0),
                right: this.rectInitial.right + (this._rectDelta.right || 0),
                top: this.rectInitial.top + (this._rectDelta.top || 0),
            };
            let magnetVector = new Vector2d(Infinity);

            for (let magnetArea of magnetAreas) {
                let magnetAreaRect = this._component._magnetAreaRects.get(magnetArea);
                let deltaBottomTop = magnetRect.bottom - magnetAreaRect.top;
                let deltaLeftRight = magnetRect.left - magnetAreaRect.right;
                let deltaRightLeft = magnetRect.right - magnetAreaRect.left;
                let deltaTopBottom = magnetRect.top - magnetAreaRect.bottom;

                if (deltaBottomTop < -magnetism || deltaLeftRight > magnetism || deltaRightLeft < -magnetism || deltaTopBottom > magnetism) continue;

                if (Number.isFinite(this._rectDelta.bottom)) {
                    let deltaBottomBottom = magnetRect.bottom - magnetAreaRect.bottom;
                    let deltaBottomBottomAbs = Math.abs(deltaBottomBottom);
                    let deltaBottomTopAbs = Math.abs(deltaBottomTop);
                    let magnetVectorYAbs = Math.abs(magnetVector.y);

                    if (deltaBottomBottomAbs <= magnetism && deltaBottomBottomAbs <= magnetVectorYAbs) {
                        magnetVector.y = -deltaBottomBottom;
                        magnetAreasBottomBottom.set(magnetArea, magnetVector.y);
                    }
                    else if (deltaBottomTopAbs <= magnetism && deltaBottomTopAbs <= magnetVectorYAbs) {
                        magnetVector.y = -deltaBottomTop;
                        magnetAreasBottomTop.set(magnetArea, magnetVector.y);
                    }
                }

                if (Number.isFinite(this._rectDelta.left)) {
                    let deltaLeftLeft = magnetRect.left - magnetAreaRect.left;
                    let deltaLeftLeftAbs = Math.abs(deltaLeftLeft);
                    let deltaLeftRightAbs = Math.abs(deltaLeftRight);
                    let magnetVectorXAbs = Math.abs(magnetVector.x);

                    if (deltaLeftLeftAbs <= magnetism && deltaLeftLeftAbs <= magnetVectorXAbs) {
                        magnetVector.x = -deltaLeftLeft;
                        magnetAreasLeftLeft.set(magnetArea, magnetVector.x);
                    }
                    else if (deltaLeftRightAbs <= magnetism && deltaLeftRightAbs <= magnetVectorXAbs) {
                        magnetVector.x = -deltaLeftRight;
                        magnetAreasLeftRight.set(magnetArea, magnetVector.x);
                    }
                }

                if (Number.isFinite(this._rectDelta.right)) {
                    let deltaRightRight = magnetRect.right - magnetAreaRect.right;
                    let deltaRightLeftAbs = Math.abs(deltaRightLeft);
                    let deltaRightRightAbs = Math.abs(deltaRightRight);
                    let magnetVectorXAbs = Math.abs(magnetVector.x);

                    if (deltaRightLeftAbs <= magnetism && deltaRightLeftAbs <= magnetVectorXAbs) {
                        magnetVector.x = -deltaRightLeft;
                        magnetAreasRightLeft.set(magnetArea, magnetVector.x);
                    }
                    else if (deltaRightRightAbs <= magnetism && deltaRightRightAbs <= magnetVectorXAbs) {
                        magnetVector.x = -deltaRightRight;
                        magnetAreasRightRight.set(magnetArea, magnetVector.x);
                    }
                }

                if (Number.isFinite(this._rectDelta.top)) {
                    let deltaTopTop = magnetRect.top - magnetAreaRect.top;
                    let deltaTopBottomAbs = Math.abs(deltaTopBottom);
                    let deltaTopTopAbs = Math.abs(deltaTopTop);
                    let magnetVectorYAbs = Math.abs(magnetVector.y);

                    if (deltaTopBottomAbs <= magnetism && deltaTopBottomAbs <= magnetVectorYAbs) {
                        magnetVector.y = -deltaTopBottom;
                        magnetAreasTopBottom.set(magnetArea, magnetVector.y);
                    }
                    else if (deltaTopTopAbs <= magnetism && deltaTopTopAbs <= magnetVectorYAbs) {
                        magnetVector.y = -deltaTopTop;
                        magnetAreasTopTop.set(magnetArea, magnetVector.y);
                    }
                }
            }

            for (let [magnetArea, magnetVectorY] of magnetAreasBottomBottom) {
                if (magnetVectorY != magnetVector.y) continue;

                this._magnetVector.y = magnetVectorY;
                this._magnetAreasBottomBottom.add(magnetArea);
            }

            for (let [magnetArea, magnetVectorY] of magnetAreasBottomTop) {
                if (magnetVectorY != magnetVector.y) continue;

                this._magnetVector.y = magnetVectorY;
                this._magnetAreasBottomTop.add(magnetArea);
            }

            for (let [magnetArea, magnetVectorX] of magnetAreasLeftLeft) {
                if (magnetVectorX != magnetVector.x) continue;

                this._magnetVector.x = magnetVectorX;
                this._magnetAreasLeftLeft.add(magnetArea);
            }

            for (let [magnetArea, magnetVectorX] of magnetAreasLeftRight) {
                if (magnetVectorX != magnetVector.x) continue;

                this._magnetVector.x = magnetVectorX;
                this._magnetAreasLeftRight.add(magnetArea);
            }

            for (let [magnetArea, magnetVectorX] of magnetAreasRightLeft) {
                if (magnetVectorX != magnetVector.x) continue;

                this._magnetVector.x = magnetVectorX;
                this._magnetAreasRightLeft.add(magnetArea);
            }

            for (let [magnetArea, magnetVectorX] of magnetAreasRightRight) {
                if (magnetVectorX != magnetVector.x) continue;

                this._magnetVector.x = magnetVectorX;
                this._magnetAreasRightRight.add(magnetArea);
            }

            for (let [magnetArea, magnetVectorY] of magnetAreasTopBottom) {
                if (magnetVectorY != magnetVector.y) continue;

                this._magnetVector.y = magnetVectorY;
                this._magnetAreasTopBottom.add(magnetArea);
            }

            for (let [magnetArea, magnetVectorY] of magnetAreasTopTop) {
                if (magnetVectorY != magnetVector.y) continue;

                this._magnetVector.y = magnetVectorY;
                this._magnetAreasTopTop.add(magnetArea);
            }
        }

        updatePositionDeltaModified(vector = null) {
            Object.assign(this._positionDeltaModified, vector);

            if (!this._component.bound) return;

            this._positionDeltaModified.x = Common.toRange(this._positionDeltaModified.x, this._rectDeltaBounded.left, this._rectDeltaBounded.right);
            this._positionDeltaModified.y = Common.toRange(this._positionDeltaModified.y, this._rectDeltaBounded.top, this._rectDeltaBounded.bottom);
        }

        updateRectDelta(rect = null) {
            Object.assign(this._rectDelta, rect);

            if (!this._component.bound) return;

            this._rectDelta.bottom = Math.min(this._rectDelta.bottom, this._rectDeltaBounded.bottom);
            this._rectDelta.left = Math.max(this._rectDelta.left, this._rectDeltaBounded.left);
            this._rectDelta.right = Math.min(this._rectDelta.right, this._rectDeltaBounded.right);
            this._rectDelta.top = Math.max(this._rectDelta.top, this._rectDeltaBounded.top);
        }

        updateTimestamp() {
            this._timeStamp = performance.now();
        }
    };

    static _eventHandlerDescriptors = {
        host: {
            pointerdown: function (event) {
                if (!this.gestures.size) return;

                this._addPointer(event);

                if (!this.dispatchEvent('capture', {originalEvent: event, pointer: this._pointer})) {
                    this._deletePointer(this._pointer);

                    return;
                }

                this._active = true;
                this._eventHandlers.host.pointermove.disabled = !this._active;
                this._initPress(this._pointer, event);
            },

            pointermove: function (event) {
                let pointer = this._pointers.get(event.pointerId);

                if (!pointer) return;

                pointer.update(event);

                this._cancelPress(pointer);
                this._detectSwipe(pointer, event);

                this._updateMagnetAreasActive();
            },

            pointerup: function (event) {
                let pointer = this._pointers.get(event.pointerId);
                this._pointerTarget = null;

                if (!pointer) return;

                pointer.updateTimestamp();
                this._updateMagnetAreasActive(true);

                this._detectTap(pointer, event);
                this._detectSwipeStop(pointer, event);
                this._detectFlick(pointer, event);
                this._dispatchEvent('release', 'releaseExtra', pointer, event);

                this._deletePointer(pointer);
                this._cancelPress(pointer);
                this._active = !!this._pointers.size;
                this._eventHandlers.host.pointermove.disabled = !this._active;
            },
        },

        shadow: {
            pointerdown: function (event) {
                this._pointerTarget = event.target;
            },
        },
    };

    static _fieldDescriptors = {
        _active: false,


        deferredMagnetism: false,
        exclusiveCapture: false,
        invertedX: false,
        invertedY: false,
        multiPoint: false,
        shiftJumping: false,
        vertical: false,

        axis: {
            default: 'none',
            enum: ['none', 'x', 'y'],
        },

        bound: {
            default: '',

            updateBefore(value) {
                if (value instanceof Node) {
                    this._valueExtra = value;
                }
                else {
                    let selector = value + '';

                    try {
                        this._valueExtra = this._component.closest(selector);
                    }
                    catch {
                        this._valueExtra = null;
                    }
                }
            },
        },

        flickDurationMax: {
            cssPropFactor: 1e3,
            cssPropUnit: 'ms',
            default: Infinity,
            range: [0, Infinity],
        },

        flickVelocityMin: {
            default: 100,
            range: [0, Infinity],
        },

        gestures: {
            default: new Set(['flick', 'press', 'swipe', 'tap']),
            enum: ['flick', 'press', 'swipe', 'tap'],
        },

        magnetAreas: {
            default: '',

            updateAfter() {
                this._component._defineMagnetAreaRects();
            },

            updateBefore(value) {
                if (value?.constructor == String) {
                    if (!this._component._pointer) {
                        this._valueExtra = undefined;

                        return;
                    }

                    let rootNode = this._component.getRootNode(this._component);

                    try {
                        this._valueExtra = new Set(rootNode?.querySelectorAll(value));
                    }
                    catch {
                        this._valueExtra = null;
                    }
                }
                else if (value?.[Symbol.iterator]) {
                    this._valueExtra = new Set(value);
                }
                else {
                    this._valueExtra = null;
                }
            },
        },

        magnetism: {
            cssPropUnit: 'px',
            default: 0,
            range: [0, Infinity],
        },

        pressDuration: {
            cssPropFactor: 1e3,
            cssPropUnit: 'ms',
            default: 800,
            range: [0, Infinity],
        },

        radius: {
            default: Infinity,
            range: [1, Infinity],
        },

        shift: {
            cssPropUnit: 'px',
            default: 1,
            range: [1, Infinity],
        },

        step: {
            default: 1,
            range: [1, Infinity],
        },

        stepX: {
            default: 0,
            range: [0, Infinity],
        },

        stepY: {
            default: 0,
            range: [0, Infinity],
        },

        swipeFactor: {
            default: 1,
            range: [0, Infinity],
        },

        tapDuration: {
            cssPropFactor: 1e3,
            cssPropUnit: 'ms',
            default: 200,
            range: [0, Infinity],
        },

        target: {
            default: '',

            updateBefore(value) {
                if (value instanceof Node) {
                    this._valueExtra = value;
                }
                else {
                    let selector = value + '';

                    try {
                        this._valueExtra = this._component.closest(selector) || this._component.querySelector(selector);
                    }
                    catch {
                        this._valueExtra = null;
                    }

                    this._valueExtra ||= this._component;
                }
            },
        },
    };


    static checkIntersection(rect1, rect2) {
        return !(rect1.bottom <= rect2.top || rect1.left >= rect2.right || rect1.right <= rect2.left || rect1.top >= rect2.bottom);
    }


    static {
        this.init();
    }


    _magnetAreaRects = new Map();
    _magnetAreasActive = new Set();
    _magnetAreasBottomBottom = new Set();
    _magnetAreasBottomTop = new Set();
    _magnetAreasLeftLeft = new Set();
    _magnetAreasLeftRight = new Set();
    _magnetAreasRightLeft = new Set();
    _magnetAreasRightRight = new Set();
    _magnetAreasTopBottom = new Set();
    _magnetAreasTopTop = new Set();
    _pointer = null;
    _pointerTarget = null;
    _pointers = new Map();
    _tapFirstPosition = new Vector2d();
    _tapPrevTimeStamp = 0;
    _tapsCount = 0;


    _addPointer(pointerEvent) {
        if (this._pointer && !this.multiPoint) {
            this._deletePointer(this._pointer);
        }

        this._pointer = new this.constructor._Pointer(this, pointerEvent);
        this._pointers.set(this._pointer._id, this._pointer);
        this._pointer.capture(false);
    }

    _cancelPress(pointer) {
        if (!pointer._shifted && this._pointers.has(pointer._id)) return;

        Executor.cancelTask(pointer._GestureArea_detectPress);
    }

    _defineMagnetAreaRects() {
        if (!this.magnetism || this.magnetAreas?.constructor != Set) return;

        this._magnetAreaRects.clear();

        for (let magnetArea of this.magnetAreas) {
            this._magnetAreaRects.set(magnetArea, this.constructor.getDomRect(magnetArea, true));
        }
    }

    _deletePointer(pointer) {
        pointer.release();
        this._pointers.delete(pointer._id);

        if (pointer == this._pointer) {
            this._pointer = null;
        }
    }

    _detectFlick(pointer, originalEvent) {
        if (!this.gestures.has('flick')) return;

        if (
            pointer._velocity.length < this.flickVelocityMin
            || pointer._points.at(-1).timeStamp - pointer._timeStampInitial > this.flickDurationMax
        ) return;

        this._dispatchEvent('flick', 'flickExtra', pointer, originalEvent);
    }

    _detectPress(pointer, originalEvent) {
        this._updateTapsCount(pointer);
        this.dispatchEvent('press', {originalEvent, pointer, tapsCount: this._tapsCount});
    }

    _detectSwipe(pointer, originalEvent) {
        if (!pointer._shifted || !this.gestures.has('swipe')) return;

        if (!pointer._GestureArea_swiped) {
            pointer._GestureArea_swiped = true;
            this._dispatchEvent('swipeStart', 'swipeStartExtra', pointer, originalEvent);
        }

        this._dispatchEvent('swipe', 'swipeExtra', pointer, originalEvent);
    }

    _detectSwipeStop(pointer, originalEvent) {
        if (!pointer._shifted) return;

        this._dispatchEvent('swipeStop', 'swipeStopExtra', pointer, originalEvent);
    }

    _detectTap(pointer, originalEvent) {
        if (pointer._shifted || pointer._timeStamp - pointer._timeStampInitial > this.tapDuration || !this.gestures.has('tap')) return;

        this._updateTapsCount(pointer);
        this.dispatchEvent('tap', {originalEvent, pointer, tapsCount: this._tapsCount});
    }

    _dispatchEvent(eventName, eventExtraName, pointer, originalEvent) {
        if (pointer == this._pointer) {
            this.dispatchEvent(eventName, {originalEvent, pointer});
        }
        else if (this.multiPoint) {
            this.dispatchEvent(eventExtraName, {originalEvent, pointer});
        }
    }

    _init() {
        this._eventHandlers.host.pointermove.disabled = true;
    }

    _initPress(pointer, originalEvent) {
        if (!this.gestures.has('press')) return;

        pointer._GestureArea_detectPress = this._detectPress.bind(this, pointer, originalEvent);
        Executor.queueTask(pointer._GestureArea_detectPress, this.pressDuration);
    }

    _updateMagnetAreasActive(resetOnly = false) {
        if (!this.magnetAreas || !this.magnetism || !this._pointer.checkCapture()) return;

        for (let magnetArea of this._magnetAreasActive) {
            magnetArea.removeAttribute('_GestureArea_magnetEdges');
        }

        this._magnetAreasActive.clear();
        this._magnetAreasBottomBottom.clear();
        this._magnetAreasBottomTop.clear();
        this._magnetAreasLeftLeft.clear();
        this._magnetAreasLeftRight.clear();
        this._magnetAreasRightLeft.clear();
        this._magnetAreasRightRight.clear();
        this._magnetAreasTopBottom.clear();
        this._magnetAreasTopTop.clear();
        this.target.removeAttribute('_GestureArea_magnetEdges');

        if (resetOnly) return;

        for (let pointer of this._pointers.values()) {
            for (let magnetArea of pointer._magnetAreasBottomBottom) {
                this._magnetAreasActive.add(magnetArea);
                this._magnetAreasBottomBottom.add(magnetArea);
            }

            for (let magnetArea of pointer._magnetAreasBottomTop) {
                this._magnetAreasActive.add(magnetArea);
                this._magnetAreasBottomTop.add(magnetArea);
            }

            for (let magnetArea of pointer._magnetAreasLeftLeft) {
                this._magnetAreasActive.add(magnetArea);
                this._magnetAreasLeftLeft.add(magnetArea);
            }

            for (let magnetArea of pointer._magnetAreasLeftRight) {
                this._magnetAreasActive.add(magnetArea);
                this._magnetAreasLeftRight.add(magnetArea);
            }

            for (let magnetArea of pointer._magnetAreasRightLeft) {
                this._magnetAreasActive.add(magnetArea);
                this._magnetAreasRightLeft.add(magnetArea);
            }

            for (let magnetArea of pointer._magnetAreasRightRight) {
                this._magnetAreasActive.add(magnetArea);
                this._magnetAreasRightRight.add(magnetArea);
            }

            for (let magnetArea of pointer._magnetAreasTopBottom) {
                this._magnetAreasActive.add(magnetArea);
                this._magnetAreasTopBottom.add(magnetArea);
            }

            for (let magnetArea of pointer._magnetAreasTopTop) {
                this._magnetAreasActive.add(magnetArea);
                this._magnetAreasTopTop.add(magnetArea);
            }
        }

        let edgeNames = [];

        if (this._magnetAreasTopBottom.size || this._magnetAreasTopTop.size) {
            edgeNames.push('top');
        }

        if (this._magnetAreasRightLeft.size || this._magnetAreasRightRight.size) {
            edgeNames.push('right');
        }

        if (this._magnetAreasLeftLeft.size || this._magnetAreasLeftRight.size) {
            edgeNames.push('left');
        }

        if (this._magnetAreasBottomBottom.size || this._magnetAreasBottomTop.size) {
            edgeNames.push('bottom');
        }

        if (edgeNames.length) {
            this.target.setAttribute('_GestureArea_magnetEdges', edgeNames.join(' '));
        }

        for (let magnetArea of this._magnetAreasActive) {
            let edgeNames = [];

            if (this._magnetAreasBottomBottom.has(magnetArea) || this._magnetAreasTopBottom.has(magnetArea)) {
                edgeNames.push('bottom');
            }

            if (this._magnetAreasBottomTop.has(magnetArea) || this._magnetAreasTopTop.has(magnetArea)) {
                edgeNames.push('top');
            }

            if (this._magnetAreasLeftLeft.has(magnetArea) || this._magnetAreasRightLeft.has(magnetArea)) {
                edgeNames.push('left');
            }

            if (this._magnetAreasLeftRight.has(magnetArea) || this._magnetAreasRightRight.has(magnetArea)) {
                edgeNames.push('right');
            }

            if (edgeNames.length) {
                magnetArea.setAttribute('_GestureArea_magnetEdges', edgeNames.join(' '));
            }
        }
    }

    _updateTapsCount(pointer) {
        if (
            pointer._timeStampInitial - this._tapPrevTimeStamp <= this.tapDuration
            && this._tapFirstPosition?.clone().sub(pointer._positionOuter).length <= this.shift
        ) {
            this._tapsCount++;
        }
        else {
            this._tapsCount = 1;
            this._tapFirstPosition.setVector(pointer._positionOuter);
        }

        this._tapPrevTimeStamp = pointer._timeStamp;
    }
}
