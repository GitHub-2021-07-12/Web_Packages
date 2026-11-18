import {Component} from '/$/Packages/Generic/Frontend/Components/Component/Component.js';
import {GestureArea} from '/$/Packages/Generic/Frontend/Components/GestureArea/GestureArea.js';


export class Resizable extends GestureArea {
    static _cssUrl = true;
    static _htmlUrl = true;
    static _url = import.meta.url;

    static _eventHandlerDescriptors = {
        host: {
            capture: function (event) {
                if (event.target != this) return;

                this._defineEdgeTarget(this._pointer._target);

                if (!this._edgeTargetNames) return;

                this._pointer.capture();
            },

            swipe: function (event) {
                if (event.target != this || !this._pointer.checkCapture()) return;

                let positionDelta = this._pointer._positionDeltaModified;
                let rectDelta = {
                    bottom: this._edgeTargetNames.has('edgeBottom') ? positionDelta.y : undefined,
                    left: this._edgeTargetNames.has('edgeLeft') ? positionDelta.x : undefined,
                    right: this._edgeTargetNames.has('edgeRight') ? positionDelta.x : undefined,
                    top: this._edgeTargetNames.has('edgeTop') ? positionDelta.y : undefined,
                };

                if (this.keepProportions ^ event.detail.originalEvent.shiftKey) {
                    if (!Number.isFinite(rectDelta.bottom) && !Number.isFinite(rectDelta.right)) {
                        if (!Number.isFinite(rectDelta.top) || rectDelta.left < rectDelta.top * this._aspectRatio) {
                            rectDelta.top = rectDelta.left / this._aspectRatio;
                        }
                        else {
                            rectDelta.left = rectDelta.top * this._aspectRatio;
                        }
                    }
                    else if (!Number.isFinite(rectDelta.left) && !Number.isFinite(rectDelta.top)) {
                        if (!Number.isFinite(rectDelta.bottom) || rectDelta.right > rectDelta.bottom * this._aspectRatio) {
                            rectDelta.bottom = rectDelta.right / this._aspectRatio;
                        }
                        else {
                            rectDelta.right = rectDelta.bottom * this._aspectRatio;
                        }
                    }
                    else if (Number.isFinite(rectDelta.left)) {
                        if (rectDelta.left < -rectDelta.bottom * this._aspectRatio) {
                            rectDelta.bottom = -rectDelta.left / this._aspectRatio;
                        }
                        else {
                            rectDelta.left = -rectDelta.bottom * this._aspectRatio;
                        }
                    }
                    else if (Number.isFinite(rectDelta.right)) {
                        if (rectDelta.right > -rectDelta.top * this._aspectRatio) {
                            rectDelta.top = -rectDelta.right / this._aspectRatio;
                        }
                        else {
                            rectDelta.right = -rectDelta.top * this._aspectRatio;
                        }
                    }
                }

                this._pointer.updateRectDelta(rectDelta);
                this._updateSize();
                this._pointer.updateMagnetVector();

                if (!this.deferredMagnetism) {
                    this._updateSize(true);
                }

                this.dispatchEvent('resize', event.detail);
            },

            swipeStart: function (event) {
                if (event.target != this || !this._pointer.checkCapture()) return;

                this._heightInitial = this.constructor.getHeight(this.target, true);
                this._leftInitial = this.constructor.getLeft(this.target);
                this._resizing = true;
                this._topInitial = this.constructor.getTop(this.target);
                this._widthInitial = this.constructor.getWidth(this.target, true);
                this._aspectRatio = this._widthInitial / this._heightInitial;
                this._pointer.rectInitial = this.constructor.getDomRect(this.target, true);

                if (this.magnetism) {
                    this.refreshField('magnetAreas', true);
                }

                this.dispatchEvent('resizeStart', {...event.detail, targetNames: this._edgeTargetNames});
            },

            swipeStop: function (event) {
                if (event.target != this || !this._pointer.checkCapture()) return;

                if (this.deferredMagnetism) {
                    this._updateSize(true);
                }

                this._resizing = false;
                this.releaseField('magnetAreas');
                this.dispatchEvent('resizeStop', event.detail);
            },

            tap: function (event) {
                if (!this.resettable || event.detail.tapsCount < 2 || !this._pointer.checkCapture()) return;

                if (this._edgeTargetNames.has('edgeBottom')) {
                    this.resetHeight();
                }
                else if (this._edgeTargetNames.has('edgeTop')) {
                    this.resetHeight(true);
                }

                if (this._edgeTargetNames.has('edgeLeft')) {
                    this.resetWidth(true);
                }
                else if (this._edgeTargetNames.has('edgeRight')) {
                    this.resetWidth();
                }

                this.dispatchEvent('reset', {targetNames: this._edgeTargetNames});
            },
        },
    };

    static _fieldDescriptors = {
        _resizing: false,


        frozen: false,
        keepProportions: false,
        resettable: false,
    };


    static {
        this.init();
    }

    connectedCallback() {
        this._build();
    }

    _aspectRatio = 0;
    _edgeTargetNames = null;
    _heightInitial = 0;
    _leftInitial = 0;
    _topInitial = 0;
    _widthInitial = 0;


    _defineEdgeTarget(eventTarget) {
        this._edgeTargetNames = null;

        switch (eventTarget) {
            case this._elements.cornerLeftBottom: {
                this._edgeTargetNames = new Set(['cornerLeftBottom', 'edgeBottom', 'edgeLeft']);

                break;
            }
            case this._elements.cornerLeftTop: {
                this._edgeTargetNames = new Set(['cornerLeftTop', 'edgeLeft', 'edgeTop']);

                break;
            }
            case this._elements.cornerRightBottom: {
                this._edgeTargetNames = new Set(['cornerRightBottom', 'edgeBottom', 'edgeRight']);

                break;
            }
            case this._elements.cornerRightTop: {
                this._edgeTargetNames = new Set(['cornerRightTop', 'edgeRight', 'edgeTop']);

                break;
            }
            case this._elements.edgeBottom: {
                this._edgeTargetNames = new Set(['edgeBottom']);

                break;
            }
            case this._elements.edgeLeft: {
                this._edgeTargetNames = new Set(['edgeLeft']);

                break;
            }
            case this._elements.edgeRight: {
                this._edgeTargetNames = new Set(['edgeRight']);

                break;
            }
            case this._elements.edgeTop: {
                this._edgeTargetNames = new Set(['edgeTop']);

                break;
            }
        }
    }

    _updateSize(withMagnetism = false) {
        let rectDelta = this._pointer._rectDelta;

        if (withMagnetism) {
            let magnetVector = this._pointer._magnetVector;
            this._pointer.updateRectDelta({
                bottom: rectDelta.bottom + magnetVector.y,
                left: rectDelta.left + magnetVector.x,
                right: rectDelta.right + magnetVector.x,
                top: rectDelta.top + magnetVector.y,
            });
        }

        let height = this._heightInitial + (rectDelta.bottom || 0) - (rectDelta.top || 0);
        let width = this._widthInitial + (rectDelta.right || 0) - (rectDelta.left || 0);
        this.constructor.setHeight(this.target, height, true);
        this.constructor.setWidth(this.target, width, true);
        let heightReal = this.constructor.getHeight(this.target, true);
        let widthReal = this.constructor.getWidth(this.target, true);
        let left = this._leftInitial + (Number.isFinite(rectDelta.left) ? this._widthInitial - widthReal : 0);
        let right = this._topInitial + (Number.isFinite(rectDelta.top) ? this._heightInitial - heightReal : 0);
        this.constructor.setLeft(this.target, left);
        this.constructor.setTop(this.target, right);

        if (!withMagnetism) {
            let heightDelta = heightReal - height;
            let widthDelta = widthReal - width;
            this._pointer.updateRectDelta({
                bottom: rectDelta.bottom + heightDelta,
                left: rectDelta.left - widthDelta,
                right: rectDelta.right + widthDelta,
                top: rectDelta.top - heightDelta,
            });
        }
    }


    resetHeight(fromTop = false) {
        if (fromTop) {
            let height = this.constructor.getHeight(this.target, true);
            this.constructor.setHeight(this.target, null);
            let top = this.constructor.getTop(this.target) + height - this.constructor.getHeight(this.target, true);
            this.constructor.setTop(this.target, top);
        }
        else {
            this.constructor.setHeight(this.target, null);
        }
    }

    resetWidth(fromLeft = false) {
        if (fromLeft) {
            let width = this.constructor.getWidth(this.target, true);
            this.constructor.setWidth(this.target, null);
            let left = this.constructor.getLeft(this.target) + width - this.constructor.getWidth(this.target, true);
            this.constructor.setLeft(this.target, left);
        }
        else {
            this.constructor.setWidth(this.target, null);
        }
    }
}
