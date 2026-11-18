import {GestureArea} from '/$/Packages/Generic/Frontend/Components/GestureArea/GestureArea.js';

import {Vector2d} from '/$/Packages/Generic/Js/Vector2d/Vector2d.js';


export class Draggable extends GestureArea {
    static _eventHandlerDescriptors = {
        host: {
            swipe: function (event) {
                if (event.target != this || !this._pointer.checkCapture()) return;

                let positionDelta = this._pointer._positionDeltaModified;
                this._detectDropAreaTarget();
                this._pointer.updatePositionDeltaModified();
                this._pointer.updateRectDelta({
                    bottom: positionDelta.y,
                    left: positionDelta.x,
                    right: positionDelta.x,
                    top: positionDelta.y,
                });
                this._pointer.updateMagnetVector();
                this._updatePosition(!this.deferredMagnetism);
                this.dispatchEvent('drag', event.detail);
            },

            swipeStart: function (event) {
                if (event.target != this || !this._checkHandle(this._pointer._target)) return;

                this._pointer.capture();

                if (!this._pointer.checkCapture()) return;

                this._dragging = true;
                this._pointer.rectInitial = this.constructor.getDomRect(this.target, true);
                this._positionInitial.set(this.constructor.getLeft(this.target), this.constructor.getTop(this.target));

                if (this.magnetism) {
                    this.refreshField('dropAreas', true);
                    this.refreshField('magnetAreas', true);
                }

                this.dispatchEvent('dragStart', event.detail);
            },

            swipeStop: function (event) {
                if (event.target != this || !this._pointer.checkCapture()) return;

                if (this.deferredMagnetism) {
                    this._pointer.updatePositionDeltaModified();
                    this._updatePosition(true);
                }

                this._dragging = false;
                this.releaseField('dropAreas');
                this.releaseField('magnetAreas');

                if (this.springy) {
                    this._position = this._positionInitial;
                }

                this.dispatchEvent('dragStop', event.detail);
                this._dropAreaTarget = null;
            },
        },
    };

    static _fieldDescriptors = {
        _dragging: false,


        springy: false,
        wideDrop: false,

        dropAreas: class Field extends super._fieldDescriptors.magnetAreas {
            _updateAfter() {
                this._component._defineDropAreaDomRects();
            }
        },

        handle: {
            default: '',

            updateBefore(value) {
                if (!(value instanceof Node)) return;

                this._valueExtra = value;
            },
        },
    };


    static getIntersectionSquare(rect1, rect2) {
        let height = Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top);
        let width = Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left);

        return height > 0 && width > 0 ? height * width : 0;
    }


    static {
        this.init();
    }


    __dropAreaTarget = null;


    _dropAreaDomRects = new Map();
    _dropAreaTargetPrev = null;
    _positionInitial = new Vector2d();


    get _dropAreaTarget() {
        return this.__dropAreaTarget;
    }
    set _dropAreaTarget(dropAreaTarget) {
        this._dropAreaTargetPrev = this._dropAreaTarget;
        this.__dropAreaTarget = dropAreaTarget;

        if (this._dropAreaTarget == this._dropAreaTargetPrev) return;

        this._dropAreaTargetPrev?.removeAttribute('_Draggable_dropAreaTarget');
        this._dropAreaTarget?.setAttribute('_Draggable_dropAreaTarget', '');
    }


    _checkHandle(target) {
        let handle = null;

        try {
            handle = this.handle instanceof Node ? this.handle : target.closest(this.handle);
        }
        catch {
            return true;
        }

        return this.target.contains(handle) && handle.contains(target);
    }

    _defineDropAreaDomRects() {
        if (!this.wideDrop || this.dropAreas?.constructor != Set) return;

        this._dropAreaDomRects.clear();

        for (let dropArea of this.dropAreas) {
            this._dropAreaDomRects.set(dropArea, this.constructor.getDomRect(dropArea, true));
        }
    }

    _detectDropAreaTarget() {
        if (this.dropAreas?.constructor != Set) return;

        if (this.wideDrop) {
            let domRect = this.constructor.getDomRect(this, true);
            let dropAreaTarget = null;
            let intersectionSquareMax = 0;

            for (let dropArea of this.dropAreas) {
                let intersectionSquare = this.constructor.getIntersectionSquare(domRect, this._dropAreaDomRects.get(dropArea));

                if (intersectionSquare <= intersectionSquareMax) continue;

                dropAreaTarget = dropArea;
                intersectionSquareMax = intersectionSquare;
            }

            this._dropAreaTarget = dropAreaTarget;
        }
        else {
            let positionOuter = this._pointer._positionOuter;
            let nodes = document.elementsFromPoint(
                positionOuter.x - document.scrollingElement.scrollLeft,
                positionOuter.y - document.scrollingElement.scrollTop,
            );
            this._dropAreaTarget = nodes.find((node) => this.dropAreas.has(node));
        }

        if (this._dropAreaTarget != this._dropAreaTargetPrev) {
            this.dispatchEvent('dropAreaTarget', event.detail);
        }
    }

    _updatePosition(withMagnetism = false) {
        let positionDelta = this._pointer._positionDeltaModified;

        if (withMagnetism) {
            this._pointer.updatePositionDeltaModified(positionDelta.clone().sum(this._pointer._magnetVector));
        }

        this.constructor.setLeft(this.target, this._positionInitial.x + positionDelta.x);
        this.constructor.setTop(this.target, this._positionInitial.y + positionDelta.y);
    }


    reset() {
        this.constructor.setLeft(this.target, null);
        this.constructor.setTop(this.target, null);
    }
}
