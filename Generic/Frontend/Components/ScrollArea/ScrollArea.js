import {GestureArea} from '/$/Packages/Generic/Frontend/Components/GestureArea/GestureArea.js';
import {TrackBar} from '/$/Packages/Generic/Frontend/Components/TrackBar/TrackBar.js';

import {Renderer} from '/$/Packages/Generic/Frontend/Units/Renderer/Renderer.js';

import {Common} from '/$/Packages/Generic/Js/Common/Common.js';
import {Executor} from '/$/Packages/Generic/Js/Executor/Executor.js';
import {Vector2d} from '/$/Packages/Generic/Js/Vector2d/Vector2d.js';


export class ScrollArea extends GestureArea {
    static _components = [TrackBar];
    static _cssUrl = true;
    static _htmlUrl = true;
    static _url = import.meta.url;

    static _eventHandlerDescriptors = {
        elements: {
            display: {
                scroll: function () {
                    this._scrolling = true;
                    this._defineScrollEdges();
                    this._stickyX = this._scrollEdgeXEnd || !this._scrollWidth;
                    this._stickyY = this._scrollEdgeYEnd || !this._scrollHeight;
                    Executor.queueRendering(this._scrollBars_defineValuesBinded);
                    this.dispatchEvent('scroll');
                },

                wheel: {
                    opts: {
                        passive: true,
                    },


                    callback() {
                        this._renderer.stop();
                    },
                },
            },

            scrollBarX: {
                swipe: function () {
                    this.scrollX = this._scrollWidth * this._elements.scrollBarX.value;
                    this._renderer.stop();
                },
            },

            scrollBarY: {
                swipe: function () {
                    this.scrollY = this._scrollHeight * this._elements.scrollBarY.value;
                    this._renderer.stop();
                },
            },
        },

        host: {
            capture: function () {
                this._renderer.stop();

                if (this._checkSnag(this._pointer._target)) return;

                this._pointer.capture();
            },

            flick: function () {
                if (this._pointer._velocity.length < this.velocityMin || !this._pointer.checkCapture()) return;

                this._velocity.setVector(this._pointer._velocity).invert().toRangeLength(-this.velocityMax, this.velocityMax);
                this._acceleration.setVector(this._velocity).setLength(this.acceleration);
                this._jerk.setVector(this._velocity).setLength(this.jerk);

                this._scrollFractional.set(this.scrollX, this.scrollY);
                this._renderer.start();
            },

            swipe: function () {
                if (!this._pointer.checkCapture()) return;

                this.scrollX = this._scrollInitial.x - this._pointer._positionDeltaModified.x;
                this.scrollY = this._scrollInitial.y - this._pointer._positionDeltaModified.y;
            },

            swipeStart: function () {
                if (!this._pointer.checkCapture()) return;

                this._swiping = true;
                this._scrollInitial.set(this.scrollX, this.scrollY);
            },

            swipeStop: function () {
                if (!this._pointer.checkCapture()) return;

                this._swiping = false;
            },
        },
    };

    static _fieldDescriptors = {
        _scrollEdgeXEnd: false,
        _scrollEdgeXStart: false,
        _scrollEdgeYEnd: false,
        _scrollEdgeYStart: false,
        _scrollHeight: 0,
        _scrollWidth: 0,
        _swiping: false,

        _puckX_length: {
            cssPropUnit: 'px',
            default: 0,
        },

        _puckY_length: {
            cssPropUnit: 'px',
            default: 0,
        },

        _scrolling: {
            default: false,
            flash: true,
        },


        sticky: false,

        acceleration: {
            default: 0,
            range: [0, Infinity],
        },

        autoRefresh: class Field extends super._fieldDescriptors.autoRefresh {
            _updateAfter() {
                super._updateAfter();

                if (this._value) {
                    this._component._mutationObserver.observe(this._component, {childList: true, subtree: true});
                    this._component._resizeObserver.observe(this._component);
                }
                else {
                    this._component._mutationObserver.disconnect();
                    this._component._resizeObserver.disconnect();
                }
            }
        },

        jerk: {
            default: 0.5,
            range: [0, Infinity],
        },

        scrollBarsAreHidden: {
            default: false,

            updateAfter() {
                this._component._refreshAuto();
            },
        },

        scrollEdgeSize: {
            default: 1,
            range: [0, Infinity],
        },

        snag: {
            default: '',

            updateBefore(value) {
                if (!(value instanceof Node)) return;

                this._valueExtra = value;
            },
        },

        velocityMax: {
            default: Infinity,
            range: [0, Infinity],
        },

        velocityMin: {
            default: 0,
            range: [0, Infinity],
        },
    };


    static {
        this.init();
    }


    _acceleration = new Vector2d();
    _jerk = new Vector2d();
    _observers_callbackBinded = this._observers_callback.bind(this);
    _mutationObserver = new MutationObserver(this._observers_callbackBinded);
    _resizeObserver = new ResizeObserver(this._observers_callbackBinded);
    _scrollBars_defineValuesBinded = this._scrollBars_defineValues.bind(this);
    _scrollFractional = new Vector2d();
    _scrollInitial = new Vector2d();
    _scrollSaved = new Vector2d();
    _stickyX = true;
    _stickyY = true;
    _velocity = new Vector2d();

    _renderer = new Renderer().init({
        getRenderCondition: this._renderer_getRenderCondition.bind(this),
        render: this._renderer_render.bind(this),
    });


    get scrollX() {
        return this._elements.display.scrollLeft;
    }
    set scrollX(scrollX) {
        scrollX = Math.round(scrollX);
        this._elements.display.scrollLeft = Math.min(scrollX, Number.MAX_SAFE_INTEGER);
    }

    get scrollY() {
        return this._elements.display.scrollTop;
    }
    set scrollY(scrollY) {
        scrollY = Math.round(scrollY);
        this._elements.display.scrollTop = Math.min(scrollY, Number.MAX_SAFE_INTEGER);
    }


    _checkSnag(target) {
        let snag = null;

        try {
            snag = this.snag instanceof Node ? this.snag : target.closest(this.snag);
        }
        catch {
            return false;
        }

        return this.contains(snag) && snag.contains(target);
    }

    _defineScrollEdges() {
        this._scrollEdgeXEnd = this._scrollWidth && this._scrollWidth - this.scrollX <= this.scrollEdgeSize;
        this._scrollEdgeXStart = this._scrollWidth && this.scrollX <= this.scrollEdgeSize;
        this._scrollEdgeYEnd = this._scrollHeight && this._scrollHeight - this.scrollY <= this.scrollEdgeSize;
        this._scrollEdgeYStart = this._scrollHeight && this.scrollY <= this.scrollEdgeSize;
    }

    _init() {
        this.resetScroll();
    }

    _observers_callback() {
        this._refreshAuto();
    }

    _renderer_getRenderCondition() {
        return (
            this._velocity.length >= this.velocityMin
            && (Common.inRange(this.scrollX, 0, this._scrollWidth) || Common.inRange(this.scrollY, 0, this._scrollHeight))
            && (this._acceleration.isZero() || this._velocity.getCos(this._acceleration) > 0)
        );
    }

    _renderer_render() {
        this._scrollFractional.x += this._velocity.x * this._renderer._dt;
        this._scrollFractional.y += this._velocity.y * this._renderer._dt;
        this.scrollX = this._scrollFractional.x;
        this.scrollY = this._scrollFractional.y;
        this._acceleration.sum(this._jerk);
        this._velocity.sub(this._acceleration);
    }

    _scrollBars_defineValues() {
        if (this._scrollWidth && !this._elements.scrollBarX._active) {
            this._elements.scrollBarX.value = this.scrollX / this._scrollWidth;
        }

        if (this._scrollHeight && !this._elements.scrollBarY._active) {
            this._elements.scrollBarY.value = this.scrollY / this._scrollHeight;
        }
    }

    _scrollBars_refresh() {
        this._scrollHeight = this._elements.display.scrollHeight - this._elements.display.clientHeight;
        this._scrollWidth = this._elements.display.scrollWidth - this._elements.display.clientWidth;
        this._scrollHeight = this._elements.display.scrollHeight - this._elements.display.clientHeight;

        if (this._scrollWidth) {
            let scrollBarX_length = this._elements.scrollBarX.getSize('inline');
            this._puckX_length = Math.round(this._elements.display.clientWidth / this._elements.display.scrollWidth * scrollBarX_length);
            this._elements.scrollBarX.calcMetrics();
            this._elements.scrollBarX.refreshField('range');
        }
        else {
            this._puckX_length = null;
        }

        if (this._scrollHeight) {
            let scrollBarY_length = this._elements.scrollBarY.getSize('inline');
            this._puckY_length = Math.round(this._elements.display.clientHeight / this._elements.display.scrollHeight * scrollBarY_length);
            this._elements.scrollBarY.calcMetrics();
            this._elements.scrollBarY.refreshField('range');
        }
        else {
            this._puckY_length = null;
        }
    }


    refresh() {
        this._scrollBars_refresh();
        this._defineScrollEdges();

        if (this.sticky) {
            if (this._stickyX) {
                this.scrollX = this._scrollWidth;
            }

            if (this._stickyY) {
                this.scrollY = this._scrollHeight;
            }
        }

        this._scrollBars_defineValues();
    }

    resetScroll() {
        this.scrollX = 0;
        this.scrollY = 0;
    }

    restoreScroll() {
        this.scrollX = this._scrollSaved.x;
        this.scrollY = this._scrollSaved.y;
    }

    saveScroll() {
        this._scrollSaved.set(this.scrollX, this.scrollY);
    }

    scrollToElement(element, opts = null) {
        element.scrollIntoView(opts);

        // Executor.queueRendering(() => {
        //     element.scrollIntoView(opts);
        //     document.scrollingElement.scrollTop = 0;
        // });
    }
}
