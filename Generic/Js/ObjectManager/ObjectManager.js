export class ObjectManager {
    static propSeparator = '.';


    static assignProps(object, props) {
        for (let k in props) {
            let propValue = props[k];

            if (propValue === undefined || propValue === object[k]) continue;

            object[k] = propValue;
        }
    }

    static checkOwnProp(object, propName, propValue = undefined) {
        return (propValue === undefined ? object[propName] : object[propName] === propValue) && Object.hasOwn(object, propName);
    }

    static copyClass(TargetClass, SourceClass) {
        let propDescriptors = Object.getOwnPropertyDescriptors(SourceClass.prototype);
        let propDescriptorsStatic = Object.getOwnPropertyDescriptors(SourceClass);
        delete propDescriptorsStatic.prototype;

        Object.defineProperties(TargetClass, propDescriptorsStatic);
        Object.defineProperties(TargetClass.prototype, propDescriptors);
    }

    static extendObject(object, prototype) {
        let objectConstructor = object?.constructor;

        if (
            objectConstructor != prototype?.constructor
            || objectConstructor != Array && objectConstructor != Object
        ) return object;

        let objectExtended = null;

        if (objectConstructor == Array) {
            objectExtended = [...prototype, ...object];
        }
        else {
            objectExtended = {...prototype};

            for (let key of Object.keys(object)) {
                objectExtended[key] = this.extendObject(object[key], prototype[key]);
            }
        }

        return objectExtended;
    }

    static extendProps(object, propNames, prototype = null) {
        prototype ??= Object.getPrototypeOf(object);

        for (let propName of propNames) {
            object[propName] = this.extendObject(object[propName], prototype[propName]);
        }
    }

    static getProp(object, path) {
        let aim = object;

        if (!(path instanceof Array)) {
            path = path.split(this.propSeparator);
        }

        for (let propName of path) {
            if (!(aim instanceof Object)) return undefined;

            aim = aim[propName];
        }

        return aim;
    }

    static getPropDescriptor(object, prop) {
        let owner = null;
        let propDescriptor = null;
        let prototypeChain = this.getPrototypeChain(object);

        for (let object of prototypeChain) {
            propDescriptor = Object.getOwnPropertyDescriptor(object, prop);

            if (propDescriptor) {
                owner = object;

                break;
            }
        }

        return {owner, propDescriptor};
    }

    static getPrototypeChain(object, countMax = Infinity) {
        let prototypeChain = [];

        while (object && prototypeChain.length < countMax) {
            prototypeChain.push(object);
            object = Object.getPrototypeOf(object);
        }

        return prototypeChain;
    }

    static getPrototypeDepth(object, prototype) {
        let prototypeDepth = 0;

        while (object != prototype) {
            object = Object.getPrototypeOf(object);

            if (object == null) return -1;

            prototypeDepth++;
        }

        return prototypeDepth;
    }

    static init(object) {
        object[Symbol.for('_ObjectManager_inited')] = true;
    }

    static isInited(object, init = true, own = true) {
        let inited = own ? Object.hasOwn(object, Symbol.for('_ObjectManager_inited')) : object[Symbol.for('_ObjectManager_inited')];

        if (init) {
            this.init(object);
        }

        return inited;
    }

    static mix(Class, ...mixins) {
        for (let mixin of mixins) {
            if (!(mixin instanceof Array)) {
                mixin = [mixin, 1];
            }

            let prototypeChain = this.getPrototypeChain(...mixin).reverse();

            for (let Prototype of prototypeChain) {
                Class = class Mixin extends Class {};
                this.copyClass(Class, Prototype);
            }
        }

        return Class;
    }

    static setProp(object, path, value) {
        if (!(path instanceof Array)) {
            path = path.split(this.propSeparator);
        }

        for (let i = 0, iMax = path.length - 1; i < iMax; i++) {
            let propName = path[i];

            if (!(object[propName] instanceof Object)) {
                object[propName] = {};
            }

            object = object[propName];
        }

        object[path.at(-1)] = value;
    }
}
