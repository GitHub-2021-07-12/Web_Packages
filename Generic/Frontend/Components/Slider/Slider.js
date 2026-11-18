import {GestureArea} from '/$/Packages/Generic/Frontend/Components/GestureArea/GestureArea.js';

import {AnimationManager} from '/$/Packages/Generic/Frontend/Units/AnimationManager/AnimationManager.js';
import {EventManager} from '/$/Packages/Generic/Frontend/Units/EventManager/EventManager.js';

import {Common} from '/$/Packages/Generic/Js/Common/Common.js';


export class Slider extends GestureArea {
    static _cssUrl = true;
    static _htmlUrl = true;
    static _url = import.meta.url;

    static _eventHandlerDescriptors = {
        animationManager: {
            stop: function () {
                this._flickDirection = 0;
                this._flickVelocity = 0;
                this._flipDirection = undefined;
                this._flipProgressExcess = 0;
                this._frameCurrentIndex = this.index;
                this._frameNextIndex = undefined;
                this._animationManager.direction = 1;
                this._animationManager.progress = 0;
                this._animationManager.clear();

                if (this._fields.index._valueQueued != undefined) {
                    this.index = this._fields.index._valueQueued;

                    return;
                }

                this._animationManager.duration = 0;
            },
        },

        host: {
            capture: function () {
                this._animationManager.stop(true);

                if (this.children.length < 2) return;

                this._pointer.capture();

                if (!this._pointer.checkCapture()) return;

                this._flipProgressExcess = this._animationManager.progress * -this._flipDirection;
            },

            flick: function (event) {
                if (event.target != this || !this._pointer.checkCapture()) return;

                this._pointer._Slider_flicked = true;
                let velocityAbs = Math.abs(this._pointer._velocity.x);

                if (!this._flickDirection && velocityAbs < this.flipVelocityThreshold) return;

                let flickDirection = Math.sign(this._pointer._velocity.x);
                this._flickVelocity = velocityAbs + (flickDirection == this._flickDirection ? this._flickVelocity : 0);
                this._flickDirection = flickDirection;
            },

            release: function (event) {
                if (event.target != this || !this._pointer.checkCapture()) return;

                if (this._frameNextIndex != undefined) {
                    if (this._flickDirection && this._pointer._Slider_flicked) {
                        this.index =
                            this._flickDirection == this._flipDirection
                                ? this._frameCurrentIndex - (this._animationManager.direction < 0 ? this._flipDirection : 0)
                                : this._frameNextIndex + (this.index == this._frameNextIndex ? this._flipDirection : 0)
                        ;
                    }
                    else {
                        let swipeDirection = Math.sign(this._pointer._positionDeltaModified.x);
                        this.index =
                            (this._flickDirection ? this._flipDirection == swipeDirection : this._animationManager.progress < this.flipProgressThreshold)
                                ? this._frameCurrentIndex
                                : this._frameNextIndex
                        ;
                    }
                }
                else {
                    this.index = this._frameCurrentIndex;
                }

                this._animationManager.duration = Common.toRange(
                    this._sizeInline / this._flickVelocity * 1e3,
                    Math.min(this.flipDurationMin, this._animationManager._durationDefault),
                    this._animationManager._durationDefault,
                );
                this._animationManager.start(true);
            },

            swipe: function (event) {
                if (event.target != this || !this._pointer.checkCapture()) return;

                let flipProgress = -this._pointer._positionDeltaModified.x / this._sizeInline - this._flipProgressExcess;
                let frameNextUpdate = false;

                if (!this.looped) {
                    flipProgress = Common.toRange(flipProgress, ...this._flipProgressRange);
                }

                let flipProgressTruncated = Math.trunc(flipProgress);

                if (flipProgressTruncated) {
                    flipProgress -= flipProgressTruncated;
                    frameNextUpdate = true;
                    this._flipProgressExcess += flipProgressTruncated;
                    this._frameCurrentIndex = this._frameNextIndex ?? this._frameCurrentIndex;
                }

                let flipDirection = Math.sign(flipProgress);

                if (flipDirection != this._flipDirection) {
                    frameNextUpdate = true;
                    this._flipDirection = flipDirection;
                }

                this._animationManager.progress = flipProgress * this._flipDirection;

                if (frameNextUpdate) {
                    this._frameNextIndex = this._frameCurrentIndex + this._flipDirection;
                }
            },
        },
    };

    static _fieldDescriptors = {
        _flipDirection: {
            default: 0,

            updateAfter() {
                this._elements.root.inert = !!this._value;
                this._component._animationManager.prepare();
            },

            updateBefore() {
                this._valueSimple = Math.sign(this._valueSimple);
            },
        },


        implicitFlipping: false,
        looped: false,

        autoRefresh: class Field extends super._fieldDescriptors.autoRefresh {
            _updateAfter() {
                let methodName = this._value ? 'observe' : 'unobserve';
                this._component._resizeObserver[methodName](this._component);
            }
        },

        elasticThreshold: {
            default: 0,
            range: [0, 1],
        },

        flipDurationMin: {
            cssPropFactor: 1e3,
            cssPropUnit: 'ms',
            default: 200,
            range: [0, Infinity],
        },

        flipProgressThreshold: {
            default: 0.5,
            range: [0, 1],
        },

        flipVelocityThreshold: {
            default: 0,
            range: [0, Infinity],
        },

        index: class Field extends this._Field {
            static _defaultValue = 0;
            static _externalFlag = true;


            _valueQueued = undefined;
            _valueRaw = undefined;


            _updateAfter() {
                if (
                    this._component._frameCurrentIndex == undefined
                    || !(this._component._flipDirection || this._component.implicitFlipping)
                ) {
                    this._component._frameCurrentIndex = this._value;
                }
                else if (!this._component._flipDirection) {
                    this._component._flipDirection =
                        ((this._component.looped ? this._valueRaw ?? this._value : this._value) - this._component._frameCurrentIndex)
                        % this._component.children.length
                    ;
                    this._component._frameNextIndex = this._value;
                }
                else if (this._value == this._component._frameCurrentIndex || this._value == this._component._frameNextIndex) {
                    this._component._animationManager.direction = this._value == this._component._frameCurrentIndex ? -1 : 1;
                }

                if (this._valuePrev == undefined) return;

                this._valueRaw = undefined;
                this._component._animationManager.start(true);
            }

            _updateBefore() {
                this._valueRaw = this._valueSimple;
                this._valueSimple = this._component._processIndex(this._valueSimple);

                if (
                    this._component._flipDirection
                    && this._component._frameCurrentIndex != undefined
                    && this._valueSimple != this._component._frameCurrentIndex
                    && this._valueSimple != this._component._frameNextIndex
                ) {
                    this._valueQueued = this._valueSimple;
                    this._valueSimple = undefined;
                    this._component._animationManager.duration = Math.min(this._component.flipDurationMin, this._component._animationManager._durationDefault);
                }
                else {
                    this._valueQueued = undefined;
                }
            }
        },
    };

    static _shadowOpts = {
        slotAssignment: 'manual',
    };


    static {
        this.init();
    }


    __frameCurrentIndex = undefined;
    __frameNextIndex = undefined;


    _animationManager = new AnimationManager();
    _flickDirection = 0;
    _flickVelocity = 0;
    _flipProgressExcess = 0;
    _flipProgressRange = [];
    _mutationObserver = new MutationObserver(this._mutationObserver_callback.bind(this));
    _resizeObserver = new ResizeObserver(this._resizeObserver_callback.bind(this));
    _sizeInline = 0;


    get _frameCurrentIndex() {
        return this.__frameCurrentIndex;
    }
    set _frameCurrentIndex(frameCurrentIndex) {
        this.__frameCurrentIndex = this._processIndex(frameCurrentIndex);
        this._assignFrame(this._elements.slotCurrent, this._frameCurrentIndex);
        this._defineFlipProgressRange();
    }

    get _frameNextIndex() {
        return this.__frameNextIndex;
    }
    set _frameNextIndex(frameNextIndex) {
        frameNextIndex = this._processIndex(frameNextIndex);
        this.__frameNextIndex = frameNextIndex != this._frameCurrentIndex ? frameNextIndex : undefined;
        this._assignFrame(this._elements.slotNext, this._frameNextIndex);
    }


    _assignFrame(frame, frameIndex) {
        let element = this.children[frameIndex];
        element ? frame.assign(element) : frame.assign();
    }

    _defineFlipProgressRange() {
        let elasticThreshold = Math.min(this.elasticThreshold, 1 - 1e-9);
        this._flipProgressRange[0] = -this._frameCurrentIndex - elasticThreshold;
        this._flipProgressRange[1] = -this._frameCurrentIndex + elasticThreshold + (this.children.length - 1);
    }

    _init() {
        this._animationManager.sync = true;
        this._animationManager.addElement(this._elements.frameCurrent);
        this._animationManager.addElement(this._elements.frameNext);
        this._mutationObserver.observe(this, {childList: true});
        EventManager.applyEventHandlers(this._eventHandlers.animationManager, this._animationManager);
    }

    _mutationObserver_callback() {
        this._animationManager.stop();
        this._frameCurrentIndex = undefined;
        this.refreshField('index');
    }

    _processIndex(index) {
        if (!this.children.length || index?.constructor != Number) return index;

        let f = this.looped ? Common.toRing : Common.toRange;

        return f(index, 0, this.children.length - 1);
    }

    _resizeObserver_callback() {
        this._refreshAuto();
    }


    bindElements(elements) {
        this._animationManager.addElements(elements);
    }

    refresh() {
        this._sizeInline = this.getSize('inline');
    }

    unbindElements(elements) {
        this._animationManager.deleteElements(elements);
    }
}
