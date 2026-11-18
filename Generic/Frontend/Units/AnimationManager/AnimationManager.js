import {EventManager} from '/$/Packages/Generic/Frontend/Units/EventManager/EventManager.js';
import {Renderer} from '/$/Packages/Generic/Frontend/Units/Renderer/Renderer.js';

import {Common} from '/$/Packages/Generic/Js/Common/Common.js';
import {ObjectManager} from '/$/Packages/Generic/Js/ObjectManager/ObjectManager.js';


export class AnimationManager extends Renderer {
    static durationMax = 1e10;


    __direction = 1;
    __duration = 0;
    __progress = 0;
    __sync = false;


    _animations = new Set();
    _durationDefault = 0;
    _eventHandlers = new Map();


    gain = 1;


    get direction() {
        return this.__direction;
    }
    set direction(direction) {
        this.__direction = Math.sign(direction) || 1;
    }

    get duration() {
        return this.__duration;
    }
    set duration(duration) {
        this.__duration = Math.max(0, duration) || this._durationDefault;
    }

    get progress() {
        return this.__progress;
    }
    set progress(progress) {
        this.__progress = Common.toRange(progress, 0, 1);
        this._updateProgress();
    }

    get sync() {
        return this.__sync;
    }
    set sync(sync) {
        this.__sync = sync;
        this._processTiming();
    }


    _getRenderCondition() {
        return this._animations.size && (this.direction > 0 ? this.progress < 1 : this.progress > 0);
    }

    _processTiming() {
        if (!this._animations.size) return;

        this._durationDefault = 0;

        for (let animation of this._animations) {
            this._durationDefault = Math.max(this._durationDefault, animation._AnimationManager_data.durationTotal);
        }

        let durationFactor = this.constructor.durationMax / this._durationDefault;

        for (let animation of this._animations) {
            if (this.sync) {
                durationFactor = this.constructor.durationMax / animation._AnimationManager_data.durationTotal;
            }

            animation.effect.updateTiming({
                delay: animation._AnimationManager_data.delay * durationFactor,
                duration: animation._AnimationManager_data.duration * durationFactor,
                fill: 'both',
            });
        }
    }

    _render() {
        this.progress += this._dt * 1e3 / this.duration * this.direction * this.gain;
    }

    _updateProgress() {
        for (let animation of this._animations) {
            animation.currentTime = this.constructor.durationMax * this.progress;
        }
    }


    addElement(element, eventHandlerDescriptors = null) {
        let eventHandlers = EventManager.createEventHandlers({
            context: element,
            eventHandlerDescriptors,
            eventTarget: this,
        });
        this._eventHandlers.set(element, eventHandlers);
    }

    clear() {
        EventManager.dispatchEvent(this, 'clearing');

        for (let animation of this._animations) {
            animation.cancel();
        }

        this._animations.clear();
    }

    deleteElement(element) {
        let eventHandlers = this._eventHandlers.get(element);
        EventManager.applyEventHandlers(eventHandlers, null);
        this._eventHandlers.delete(element);
    }

    init({
        direction = undefined,
        duration = undefined,
        gain = undefined,
    } = {}) {
        ObjectManager.assignProps(
            this,
            {
                direction,
                duration,
                gain,
            },
        );

        return this;
    }

    prepare() {
        this._durationDefault = 0;
        this.clear();
        EventManager.dispatchEvent(this, 'preparing');

        for (let element of this._eventHandlers.keys()) {
            let animations = element.getAnimations();

            for (let animation of animations) {
                if (!animation._AnimationManager_data) {
                    animation.pause();

                    let timing = animation.effect.getComputedTiming();
                    animation._AnimationManager_data = {
                        delay: timing.delay,
                        duration: timing.duration,
                        durationTotal: Math.max(timing.activeDuration, timing.endTime),
                    };
                }

                this._durationDefault = Math.max(this._durationDefault, animation._AnimationManager_data.durationTotal);
                this._animations.add(animation);
            }
        }

        this.duration ||= this._durationDefault;
        this._processTiming();
        this._updateProgress();
    }

    start(resume = false) {
        if (!resume) {
            this.progress = +(this.direction < 0);
        }

        super.start(resume);
    }
}
