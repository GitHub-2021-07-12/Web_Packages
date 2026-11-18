import {EventManager} from '/$/Packages/Generic/Frontend/Units/EventManager/EventManager.js';

import {Executor} from '/$/Packages/Generic/Js/Executor/Executor.js';
import {ObjectManager} from '/$/Packages/Generic/Js/ObjectManager/ObjectManager.js';


export class Renderer extends EventTarget {
    _active = false;
    _dt = 0;
    _elapsedTime = 0;
    _renderLoopedBinded = this._renderLooped.bind(this);
    _timeStamp = 0;
    _timeStampStart = 0;


    _getRenderCondition() {
        return true;
    }

    _render() {}

    _renderLooped() {
        let timeStamp = performance.now();
        this._dt = (timeStamp - this._timeStamp) / 1e3;
        this._timeStamp = timeStamp;
        this._elapsedTime = this._timeStamp - this._timeStampStart;

        if (!this._active || !this._getRenderCondition()) {
            this.stop();

            return;
        }

        this._render();
        Executor.queueRendering(this._renderLoopedBinded);
    }


    init({
        getRenderCondition = undefined,
        render = undefined,
    } = {}) {
        ObjectManager.assignProps(
            this,
            {
                _getRenderCondition: getRenderCondition,
                _render: render,
            },
        );

        return this;
    }

    start(resume = false) {
        if (this._active) return;

        if (!this._getRenderCondition()) {
            this.stop();

            return;
        }

        if (!resume) {
            this._elapsedTime = 0;
        }

        this._active = true;
        this._timeStamp = performance.now();
        this._timeStampStart = this._timeStamp - this._elapsedTime;
        Executor.queueRendering(this._renderLoopedBinded);
        EventManager.dispatchEvent(this, 'start');
    }

    stop(pause = false) {
        if (!this._active) return;

        this._active = false;
        Executor.cancelRendering(this._renderLoopedBinded);

        if (pause && this._getRenderCondition()) return;

        EventManager.dispatchEvent(this, 'stop');
    }
}
