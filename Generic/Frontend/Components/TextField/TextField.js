import {TextInput} from '/$/Packages/Generic/Frontend/Components/TextInput/TextInput.js';

import {RichString} from '/$/Packages/Generic/Js/RichString/RichString.js';


export class TextField extends TextInput {
    static _cssUrl = true;
    static _htmlUrl = true;
    static _url = import.meta.url;

    static _eventHandlerDescriptors = {
        elements: {
            buttonClear: {
                click: function () {
                    this.value = '';
                    this.dispatchEvent('clear');
                    this.dispatchEvent('mutation');
                },
            },

            buttonMask: {
                click: function () {
                    this.masked = !this.masked;
                    this._updateSelection();
                    this.dispatchEvent('mask');
                },
            },
        },

        shadow: {
            pointerdown: function (event) {
                if (!event.target.classList.contains('_TextField_button')) return;

                event.preventDefault();
            },
        },
    };

    static _fieldDescriptors = {
        _invalid: false,


        buttons: {
            default: new Set(),
            enum: ['buttonClear', 'buttonMask'],
        },

        maskChar: {
            default: '●',

            updateAfter() {
                if (!this._component.masked) return;

                this._component._value = this._component.value;
            },

            updateBefore() {
                this._valueSimple = this._valueSimple ? new RichString(this._valueSimple).slice(0, 1).value : undefined;
            },
        },

        masked: {
            default: false,

            updateAfter() {
                this._component._value = this._component.value;
            },
        },

        regExp: {
            default: '',

            updateBefore() {
                this._valueExtra = new RegExp(this._valueSimple);
            },
        },
    };


    static {
        this.init();
    }


    get _value() {
        return super._value;
    }
    set _value(value) {
        super._value = value;
        this._inputElement_value = this.masked ? this.maskChar.repeat(this._value.length) : this.value;
        this._invalid = false;
    }


    _init() {
        this._inputElement = this._elements.input;
        super._init();
    }


    validate() {
        let valid = this.regExp.test(this.value);
        this._invalid = !valid;

        return valid;
    }
}
