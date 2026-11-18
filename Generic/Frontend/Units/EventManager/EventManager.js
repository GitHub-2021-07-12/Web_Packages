import {ObjectManager} from '/$/Packages/Generic/Js/ObjectManager/ObjectManager.js';


export class EventManager {
    static _EventHandler = class {
        static _callback = function (event) {};
        static _disabled = false;
        static _eventNames = [];
        static _opts = null;


        __disabled = this.constructor._disabled;
        __eventTarget = null;


        _callback = null;


        get disabled() {
            return this.__disabled;
        }
        set disabled(disabled) {
            if (disabled == this.disabled) return;

            this.__disabled = !!disabled;

            if (!this.eventTarget) return;

            let methodName = this.disabled ? 'removeEventListener' : 'addEventListener';

            for (let eventName of this.constructor._eventNames) {
                this.eventTarget[methodName](eventName, this._callback, this.constructor._opts);
            }
        }

        get eventTarget() {
            return this.__eventTarget;
        }
        set eventTarget(eventTarget) {
            if (eventTarget == this.eventTarget) return;

            if (this.eventTarget) {
                for (let eventName of this.constructor._eventNames) {
                    this.eventTarget.removeEventListener(eventName, this._callback, this.constructor._opts);
                }
            }

            this.__eventTarget = eventTarget instanceof EventTarget ? eventTarget : null;

            if (this.disabled || !this.eventTarget) return;

            for (let eventName of this.constructor._eventNames) {
                this.eventTarget.addEventListener(eventName, this._callback, this.constructor._opts);
            }
        }


        constructor(context = undefined, eventTarget = null) {
            this._callback = context === undefined ? this.constructor._callback : this.constructor._callback.bind(context);
            this.eventTarget = eventTarget;
        }
    };


    static _preventDefault(event) {
        event.preventDefault();
    }

    static _stopPropagation(event) {
        event.stopPropagation();
    }


    static applyDefaultAction(eventTarget, enabled, ...eventNames) {
        let methodName = enabled ? 'removeEventListener' : 'addEventListener';
        let opts = {passive: false};

        for (let eventName of eventNames) {
            eventTarget[methodName](eventName, this._preventDefault, opts);
        }
    }

    static applyEventHandlers(eventHandlers, eventTarget) {
        for (let k in eventHandlers) {
            let eventHandler = eventHandlers[k];

            if (eventHandler instanceof this._EventHandler) {
                eventHandler.eventTarget = eventTarget;
            }
            else {
                if (eventTarget?.constructor == Object && !(k in eventTarget)) continue;

                this.applyEventHandlers(eventHandler, eventTarget?.[k]);
            }
        }
    }

    static applyPropagation(eventTarget, enabled, ...eventNames) {
        let methodName = enabled ? 'removeEventListener' : 'addEventListener';

        for (let eventName of eventNames) {
            eventTarget[methodName](eventName, this._stopPropagation);
        }
    }

    static createEventHandlers({
        context = undefined,
        eventHandlerDescriptors,
        eventTarget = undefined,
        normalize = true,
    }) {
        if (eventHandlerDescriptors?.constructor != Object) return null;

        let eventHandlers = {};

        if (normalize) {
            this.normalizeEventHandlerDescriptors(eventHandlerDescriptors);
        }

        for (let k in eventHandlerDescriptors) {
            let eventHandlerDescriptor = eventHandlerDescriptors[k];

            if (ObjectManager.getPrototypeDepth(eventHandlerDescriptor, this._EventHandler) > 0) {
                let EventHandler = eventHandlerDescriptor;
                eventHandlers[k] = new EventHandler(context, eventTarget);
            }
            else {
                let eventHandler = this.createEventHandlers({
                    context,
                    eventHandlerDescriptors: eventHandlerDescriptor,
                    eventTarget: eventTarget?.[k] || eventTarget,
                    normalize: false,
                });

                if (!eventHandler) continue;

                eventHandlers[k] = eventHandler;
            }
        }

        return eventHandlers;
    }

    static dispatchEvent(eventTarget, eventName, eventDetail = null) {
        let eventOpts = {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail: eventDetail,
        };
        let event = new CustomEvent(eventName, eventOpts);

        return EventTarget.prototype.dispatchEvent.call(eventTarget, event);
    }

    static dispatchEventAsync(eventTarget, eventName, eventDetail = null) {
        setTimeout(() => this.dispatchEvent(eventTarget, eventName, eventDetail));
    }

    static normalizeEventHandlerDescriptors(eventHandlerDescriptors) {
        for (let k in eventHandlerDescriptors) {
            let eventHandlerDescriptor = eventHandlerDescriptors[k];

            if (ObjectManager.getPrototypeDepth(eventHandlerDescriptor, this._EventHandler) > 0) continue;

            if (eventHandlerDescriptor instanceof Function) {
                eventHandlerDescriptor = class EventHandler extends this._EventHandler {
                    static _callback = eventHandlerDescriptor;
                    static _eventNames = [k];
                };
            }
            else if (eventHandlerDescriptor?.callback instanceof Function) {
                eventHandlerDescriptor = class EventHandler extends this._EventHandler {
                    static _callback = eventHandlerDescriptor.callback;
                    static _disabled = !!eventHandlerDescriptor.disabled;
                    static _eventNames = eventHandlerDescriptor.eventNames?.length ? eventHandlerDescriptor.eventNames : [k];
                    static _opts = eventHandlerDescriptor.opts;
                };
            }
            else if (eventHandlerDescriptor?.constructor == Object) {
                this.normalizeEventHandlerDescriptors(eventHandlerDescriptor);
            }
            else {
                eventHandlerDescriptor = null;
            }

            eventHandlerDescriptors[k] = eventHandlerDescriptor;
        }
    }
}
