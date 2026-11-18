import {GestureArea} from '/$/Packages/Generic/Frontend/Components/GestureArea/GestureArea.js';

import {Common} from '/$/Packages/Generic/Js/Common/Common.js';


export class TrackBar extends GestureArea {
    static _cssUrl = true;
    static _htmlUrl = true;
    static _url = import.meta.url;

    static _eventHandlerDescriptors = {
        host: {
            capture: function () {
                if (this.mode == 'normal' && this._pointer?._target != this._elements.puck) return;

                this._active = true;
                this._pointer.capture();

                if (this.mode == 'precise') {
                    this._defineValue();
                }
                else {
                    this._valueCaptured = this.value;
                }
            },

            keydown: function (event) {
                if (this._active) return;

                this._active = true;

                switch (event.key) {
                    case 'ArrowLeft':
                    case 'ArrowUp': {
                        event.preventDefault();
                        this.value -= this._valueStep;

                        break;
                    }
                    case 'ArrowDown':
                    case 'ArrowRight': {
                        event.preventDefault();
                        this.value += this._valueStep;

                        break;
                    }
                    case 'End': {
                        event.preventDefault();
                        this.value = Infinity;

                        break;
                    }
                    case 'Home': {
                        event.preventDefault();
                        this.value = -Infinity;

                        break;
                    }
                }

                this._active = false;
            },

            release: function () {
                if (!this._pointer.checkCapture()) return;

                this._active = false;
            },

            swipe: function () {
                if (!this._pointer.checkCapture()) return;

                this._defineValue();
            },
        },
    };

    static _fieldDescriptors = {
        _active: false,

        _filler_positionShift: {
            cssPropUnit: 'px',
            default: 0,
        },

        _puck_position: {
            cssPropUnit: 'px',
            default: 0,
        },


        discrete: {
            default: false,

            updateAfter() {
                if (!this._value) return;

                this._component.refreshField('value');
            },
        },

        mode: {
            default: 'normal',
            enum: ['precise', 'progressive', 'normal'],
        },

        range: {
            default: [0, 0],

            updateAfter() {
                this._component.refreshField('value');
            },

            updateBefore() {
                this._valueSimple[0] = Math.round(this._valueSimple[0]);
                this._valueSimple[1] = Math.round(this._valueSimple[1]);

                if (!Common.inRangeStrict(this._valueSimple[1] - this._valueSimple[0], 0, this._component._freeSpaceLength)) {
                    this._valueSimple = undefined;
                }
            },
        },

        value: {
            default: 0,
            externalFlag: true,

            updateAfter() {
                this._component._puck_definePosition();
            },

            updateBefore() {
                if (this._component.range[0] < this._component.range[1]) {
                    this._valueSimple = Common.toRange(Math.round(this._valueSimple), ...this._component.range);
                }
                else {
                    if (this._component.discrete) {
                        this._valueSimple = Math.round(this._component._freeSpaceLength * this._valueSimple) / this._component._freeSpaceLength;
                    }

                    this._valueSimple = Common.toRange(this._valueSimple, 0, 1);
                }
            },
        },
    };


    static {
        this.init();
    }


    _freeSpaceLength = 0;
    _puck_positionShift = 0;
    _valueCaptured = 0;
    _valueStep = 0;


    _defineValue() {
        let rangeLength = (this.range[1] - this.range[0]) || 1;
        let value = undefined;

        if (this.mode == 'precise') {
            let pointerPosition = this._pointer._positionInnerInitial.x + this._pointer._positionDeltaModified.x + this._puck_positionShift;
            value = this.range[0] + rangeLength * pointerPosition / this._freeSpaceLength;
        }
        else {
            value = this._valueCaptured + rangeLength * this._pointer._positionDeltaModified.x / this._freeSpaceLength;
        }

        if (this.discrete) {
            value = Math.round(this._freeSpaceLength * value) / this._freeSpaceLength;
        }

        this.value = value;
    }

    _init() {
        this.calcMetrics();
    }

    _puck_definePosition() {
        let rangeLength = this.range[1] - this.range[0];
        let puck_position =
            rangeLength
                ? this._freeSpaceLength / rangeLength * (this.value - this.range[0])
                : this._freeSpaceLength * this.value
        ;

        if (this.discrete) {
            puck_position = Math.round(puck_position);
        }

        this._puck_position = puck_position;
    }


    calcMetrics() {
        let puck_length = this.constructor.getSize(this._elements.puck, 'inline', true);
        let puck_lengthHalf = puck_length / 2;
        let track_length = this.constructor.getSize(this._elements.track, 'inline', true);
        this._filler_positionShift =
            this.constructor.getCssPropNumber(this._elements.track, 'border-inline-start-width')
            + this.constructor.getCssPropNumber(this._elements.track, 'margin-inline-start')
            + this.constructor.getCssPropNumber(this._elements.track, 'padding-inline-start')
            - puck_lengthHalf
        ;
        this._freeSpaceLength = track_length - puck_length;
        this._puck_positionShift = -this.getCssPropNumber('padding-inline-start') - puck_lengthHalf;
        this._valueStep = this.range[0] < this.range[1] ? 1 : 1 / this._freeSpaceLength;
    }

    refresh() {
        this.calcMetrics();
        this.refreshField('range');
    }
}
