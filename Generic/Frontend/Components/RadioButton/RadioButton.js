import {Component} from '/$/Packages/Generic/Frontend/Components/Component/Component.js';


export class RadioButton extends Component {
    static _cssUrl = true;
    static _htmlUrl = true;
    static _url = import.meta.url;

    static _Group = class {
        static instances = new Map();


        static giveInstance(name) {
            let instance = this.instances.get(name);

            if (!instance) {
                instance = new this(name);
                this.instances.set(instance._name, instance);
            }

            return instance;
        }

        static reviseInstance(name) {
            let instance = this.instances.get(name);

            if (instance?.radioButtons.size) return;

            this.instances.delete(name);
        }


        __radioButtonChecked = null;


        _name = '';


        radioButtons = new Set();


        get radioButtonChecked() {
            return this.__radioButtonChecked;
        }
        set radioButtonChecked(radioButtonChecked) {
            this.__radioButtonChecked = radioButtonChecked;

            for (let radioButton of this.radioButtons) {
                if (radioButton == this.radioButtonChecked) continue;

                radioButton.checked = false;
            }
        }


        constructor(name) {
            this._name = name;
        }
    };

    static _eventHandlerDescriptors = {
        host: {
            click: function () {
                this.checked = true;
            },

            keydown: function (event) {
                switch (event.code) {
                    case 'Enter':
                    case 'Space': {
                        event.preventDefault();
                        this.checked = true;

                        break;
                    }
                }
            },
        },
    };

    static _fieldDescriptors = {
        checked: {
            default: false,

            updateAfter() {
                if (this._isDefault) return;

                let group = this._component.constructor._Group.instances.get(this._component.group);

                if (!group) return;

                group.radioButtonChecked = this._component;
            },
        },

        group: {
            default: '',

            updateAfter() {
                let Group = this._component.constructor._Group;
                let groupPrev = Group.instances.get(this._valuePrev);

                if (groupPrev) {
                    groupPrev.radioButtons.delete(this._component);
                    groupPrev.radioButtonChecked = null;
                    Group.reviseInstance(groupPrev._name);
                }

                if (this._isDefault) return;

                let group = Group.giveInstance(this._value);
                group.radioButtons.add(this._component);
                group.radioButtonChecked = null;
            },
        },
    };


    static {
        this.init();
    }


    disconnectedCallback() {
        this.group = undefined;
    }
}
