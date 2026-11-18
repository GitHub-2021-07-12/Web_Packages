import {Component} from '/$/Packages/Generic/Frontend/Components/Component/Component.js';


export class CheckBox extends Component {
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

            if (instance?.checkBoxSuperior || instance?.checkBoxesInferior.size) return;

            this.instances.delete(name);
        }


        _checkBoxSuperior_isBlocked = false;
        _checkBoxesInferior_areBlocked = false;
        _name = '';


        checkBoxSuperior = null;
        checkBoxesInferior = new Set();


        constructor(name) {
            this._name = name;
        }

        checkBoxSuperior_defineState() {
            if (this._checkBoxSuperior_isBlocked || !this.checkBoxSuperior) return;

            let checkBoxesCheckedCount = 0;
            let checkBoxesUncheckedCount = 0;

            for (let checkBox of this.checkBoxesInferior) {
                checkBoxesCheckedCount += checkBox.state == 'checked';
                checkBoxesUncheckedCount += checkBox.state == 'unchecked';
            }

            this._checkBoxesInferior_areBlocked = true;
            this.checkBoxSuperior.state =
                checkBoxesCheckedCount == this.checkBoxesInferior.size
                    ? 'checked'
                    : (checkBoxesUncheckedCount == this.checkBoxesInferior.size ? 'unchecked' : 'indeterminate')
            ;
            this._checkBoxesInferior_areBlocked = false;
        }

        checkBoxesInferior_defineState() {
            if (this._checkBoxesInferior_areBlocked || !this.checkBoxSuperior || !this.checkBoxesInferior.size || this.checkBoxSuperior.state == 'indeterminate') return;

            this._checkBoxSuperior_isBlocked = true;

            for (let checkBox of this.checkBoxesInferior) {
                checkBox.state = this.checkBoxSuperior.state;
            }

            this._checkBoxSuperior_isBlocked = false;
        }
    };

    static _eventHandlerDescriptors = {
        host: {
            click: function () {
                this.toggle();
            },

            keydown: function (event) {
                switch (event.code) {
                    case 'Enter':
                    case 'Space': {
                        event.preventDefault();
                        this.toggle();

                        break;
                    }
                }
            },
        },
    };

    static _fieldDescriptors = {
        groupInferior: {
            default: '',

            updateAfter() {
                let Group = this._component.constructor._Group;
                let groupPrev = Group.instances.get(this._valuePrev);

                if (groupPrev) {
                    if (groupPrev.checkBoxSuperior != this._component) {
                        groupPrev.checkBoxSuperior?.resetField(this.constructor._name);
                    }

                    groupPrev.checkBoxSuperior = null;
                    groupPrev.checkBoxesInferior_defineState();
                    Group.reviseInstance(groupPrev._name);
                }

                if (this._component.state == 'indeterminate') {
                    this._component.state = 'unchecked';
                }

                if (this._isDefault) return;

                let group = Group.giveInstance(this._value);

                if (group.checkBoxSuperior != this._component) {
                    group.checkBoxSuperior?.resetField(this.constructor._name);
                }

                group.checkBoxSuperior = this._component;
                group.checkBoxesInferior_defineState();
            },
        },

        groupSuperior: {
            default: '',

            updateAfter() {
                let Group = this._component.constructor._Group;
                let groupPrev = Group.instances.get(this._valuePrev);

                if (groupPrev) {
                    groupPrev.checkBoxesInferior.delete(this._component);
                    groupPrev.checkBoxSuperior_defineState();
                    Group.reviseInstance(groupPrev._name);
                }

                if (this._isDefault) return;

                let group = Group.giveInstance(this._value);
                group.checkBoxesInferior.add(this._component);
                group.checkBoxSuperior_defineState();
            },
        },

        state: {
            default: 'unchecked',
            enum: ['checked', 'indeterminate', 'unchecked'],

            updateAfter() {
                if (this._value === this._valuePrev) return;

                let groups = this._component.constructor._Group.instances;
                groups.get(this._component.groupInferior)?.checkBoxesInferior_defineState();
                groups.get(this._component.groupSuperior)?.checkBoxSuperior_defineState();
            },
        },
    };


    static {
        this.init();
    }


    disconnectedCallback() {
        this.groupInferior = undefined;
        this.groupSuperior = undefined;
    }

    toggle() {
        this.state = this.state == 'unchecked' ? 'checked' : 'unchecked';
    }
}
