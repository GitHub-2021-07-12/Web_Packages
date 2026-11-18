import {Component} from '/$/Packages/Generic/Frontend/Components/Component/Component.js';

import {EventManager} from '/$/Packages/Generic/Frontend/Units/EventManager/EventManager.js';

import {RichString} from '/$/Packages/Generic/Js/RichString/RichString.js';


export class TextInput extends Component {
    static _InputMutation = class {
        inputMutationAfter = null;
        inputMutationBefore = null;
        passing = false;
        positionAfter = 0;
        rangeBefore = [0, 0];
        stringAfter = new RichString();
        stringBefore = new RichString();
        type = '';


        apply(string, reversal = false) {
            let subString = reversal ? this.stringBefore : this.stringAfter;
            let subStringPrevIndex = Math.min(this.positionAfter, this.rangeBefore[0]);
            let subStringPrevLength = reversal ? this.stringAfter.length : this.stringBefore.length;
            string = string.replace(subStringPrevIndex, subStringPrevLength, subString);

            if (reversal) {
                if (this.inputMutationBefore?.passing) {
                    return this.inputMutationBefore.apply(string, reversal);
                }
            }
            else {
                if (this.passing && this.inputMutationAfter) {
                    return this.inputMutationAfter.apply(string, reversal);
                }
            }

            let inputMutationCurrent = reversal ? this.inputMutationBefore : this;

            return [string, inputMutationCurrent];
        }

        continue(inputMutation) {
            if (inputMutation.inputMutationBefore) {
                inputMutation.inputMutationBefore.inputMutationAfter = null;
            }

            if (this.inputMutationAfter) {
                this.inputMutationAfter.inputMutationBefore = null;
            }

            inputMutation.inputMutationBefore = this;
            this.inputMutationAfter = inputMutation;
        }

        extend(inputMutation) {
            if (TextInput._inputTypesAllowed.insert.has(this.type)) {
                this.positionAfter += inputMutation.stringAfter.length;
                this.stringAfter.value += inputMutation.stringAfter;
            }
            else {
                let b = this.type == 'deleteContentBackward';
                this.positionAfter -= inputMutation.stringBefore.length * b;
                this.stringBefore.value = b ? inputMutation.stringBefore + this.stringBefore : this.stringBefore + inputMutation.stringBefore;
            }
        }
    };

    static _eventHandlerDescriptors = {
        inputElement: {
            beforeinput: function (event) {
                this._inputMutationNew.rangeBefore[0] = this._inputElement_value.getIndex(this._inputElement.selectionStart);
                this._inputMutationNew.rangeBefore[1] =
                    this._inputElement.selectionStart == this._inputElement.selectionEnd
                        ? this._inputMutationNew.rangeBefore[0]
                        : this._inputElement_value.getIndex(this._inputElement.selectionEnd)
                ;
                this._inputMutationNew.type = event.inputType;

                let inputTypesAllowed = this.constructor._inputTypesAllowed;

                if (
                    event.inputType == 'insertCompositionText'
                    || !(inputTypesAllowed.delete.has(event.inputType) || inputTypesAllowed.insert.has(event.inputType))
                ) {
                    event.preventDefault();
                }
            },

            compositionend: function (event) {
                if (!event.data) return;

                this._updateInputMutationNew(event.data);
                this._update();
            },

            dragend: function () {
                this._dragTarget = null;
            },

            dragstart: function (event) {
                if (!this.dragAndDrop) {
                    event.preventDefault();

                    return;
                }

                this._dragTarget = event.target;
            },

            drop: function (event) {
                this._inputMutationNew.passing = event.target == this._dragTarget;
            },

            input: function (event) {
                event.stopPropagation();

                if (event.inputType != 'insertCompositionText') {
                    this._updateInputMutationNew(this._inputMutationNew.type == 'insertLineBreak' ? '\n' : event.data || '');
                    this._update();
                }

                this.dispatchEvent('mutation');
            },

            keydown: function (event) {
                if (!event.ctrlKey) return;

                switch (event.code) {
                    case 'KeyY': {
                        this.redo();
                        this.dispatchEvent('mutation');

                        break;
                    }
                    case 'KeyZ': {
                        event.shiftKey ? this.redo() : this.undo();
                        this.dispatchEvent('mutation');

                        break;
                    }
                }
            },

            pointerdown: function (event) {
                if (this.dragAndDrop && !event.ctrlKey) return;

                this._inputElement.setSelectionRange(0, 0);
            },
        },
    };

    static _fieldDescriptors = {
        _nonEmpty: false,


        dragAndDrop: false,

        disabled: class Field extends super._fieldDescriptors.disabled {
            _updateAfter() {
                this._component._inputElement.disabled = this._value;
            }
        },

        historyIsDisabled: {
            default: false,

            updateAfter() {
                if (!this._value) return;

                this._component.commit();
            },
        },

        historyTimeInterval: {
            cssPropFactor: 1e3,
            cssPropUnit: 'ms',
            default: 1e3,
            range: [0, Infinity],
        },

        lengthMax: {
            default: Infinity,
            range: [0, Infinity],

            updateAfter() {
                this._component.value = this._component._value.slice(0, this._value);
            },
        },

        placeholder: {
            default: '',

            updateAfter() {
                this._component._inputElement.placeholder = this._value;
            },
        },
    };

    static _inputTypesAllowed = {
        delete: new Set(['deleteByCut', 'deleteByDrag', 'deleteContentBackward', 'deleteContentForward']),
        insert: new Set(['insertCompositionText', 'insertFromDrop', 'insertFromPaste', 'insertLineBreak', 'insertText']),
    };

    static _shadowOpts = {
        delegatesFocus: true,
    };


    static {
        this.init({abstract: true});
    }


    __inputElement = null;
    __inputElement_value = new RichString();
    __value = new RichString();


    _dragTarget = null;
    _inputMutationCurrent = new this.constructor._InputMutation();
    _inputMutationNew = new this.constructor._InputMutation();
    _inputMutationTimeStamp = -Infinity;


    get _inputElement() {
        return this.__inputElement;
    }
    set _inputElement(inputElement) {
        this.__inputElement = inputElement;
        this._inputElement.placeholder = '';
        EventManager.applyEventHandlers(this._eventHandlers.inputElement, this._inputElement);
    }

    get _inputElement_value() {
        return this.__inputElement_value;
    }
    set _inputElement_value(inputElement_value) {
        this.__inputElement_value.value = inputElement_value;
        this._inputElement.value = this._inputElement_value;
    }

    get _value() {
        return this.__value;
    }
    set _value(value) {
        this.__value.value = value + '';
        this._inputElement_value = this.value;
        this._nonEmpty = !!this.value;
    }


    get value() {
        return this._value.value;
    }
    set value(value) {
        this._value = new RichString(value).slice(0, this.lengthMax);
        this.commit();
    }


    _setSelection(rangeStart, rangeEnd = rangeStart) {
        this._inputElement.selectionStart = this._inputElement_value.getIndexByte(rangeStart);
        this._inputElement.selectionEnd =
            rangeStart == rangeEnd
                ? this._inputElement.selectionStart
                : this._inputElement_value.getIndexByte(rangeEnd)
        ;
    }

    _update() {
        if (!this._inputMutationNew.stringAfter.value && !this._inputMutationNew.stringBefore.value) {
            this._value = this.value;
            this._setSelection(this._inputMutationNew.rangeBefore[0]);

            return;
        }

        let timeStamp = performance.now();

        if (
            this._inputMutationNew.type == this._inputMutationCurrent.type
            && this._inputMutationNew.rangeBefore[0] == this._inputMutationCurrent.positionAfter
            && this._inputMutationNew.rangeBefore[1] == this._inputMutationCurrent.positionAfter
            && timeStamp - this._inputMutationTimeStamp < this.historyTimeInterval
        ) {
            this._inputMutationCurrent.extend(this._inputMutationNew);
            [this._value] = this._inputMutationNew.apply(this._value);
        }
        else {
            this._inputMutationTimeStamp = timeStamp;
            this._inputMutationCurrent.continue(this._inputMutationNew);
            [this._value, this._inputMutationCurrent] = this._inputMutationNew.apply(this._value);
        }

        this._updateSelection();
        this._inputMutationNew = new this.constructor._InputMutation();

        if (this.historyIsDisabled) {
            this.commit();
        }
    }

    _updateInputMutationNew(string) {
        this._inputMutationNew.positionAfter = this._inputMutationNew.rangeBefore[0];

        if (this.constructor._inputTypesAllowed.insert.has(this._inputMutationNew.type)) {
            let rangeBeforeLength = this._inputMutationNew.rangeBefore[1] - this._inputMutationNew.rangeBefore[0];
            let subStringLength = this.lengthMax - this._value.length + rangeBeforeLength;
            this._inputMutationNew.stringAfter.value = new RichString(string).slice(0, subStringLength);
            this._inputMutationNew.stringBefore.value = this._value.slice(this._inputMutationNew.rangeBefore[0], rangeBeforeLength);
            this._inputMutationNew.positionAfter += this._inputMutationNew.stringAfter.length;
        }
        else if (this._inputMutationNew.rangeBefore[0] == this._inputMutationNew.rangeBefore[1]) {
            let b = this._inputMutationNew.type == 'deleteContentBackward';
            this._inputMutationNew.stringBefore.value = this._value.slice(this._inputMutationNew.rangeBefore[0] - b, 1);
            this._inputMutationNew.positionAfter -= this._inputMutationNew.stringBefore.length * b;
        }
        else {
            this._inputMutationNew.stringBefore.value = this._value.slice(
                this._inputMutationNew.rangeBefore[0], this._inputMutationNew.rangeBefore[1] - this._inputMutationNew.rangeBefore[0],
            );
        }
    }

    _updateSelection() {
        this._setSelection(this._inputMutationCurrent.positionAfter);
    }


    commit() {
        this._inputMutationCurrent.inputMutationAfter = null;
        this._inputMutationCurrent.inputMutationBefore = null;
    }

    redo() {
        if (!this._inputMutationCurrent.inputMutationAfter) return;

        this._inputMutationTimeStamp = -Infinity;
        [this._value, this._inputMutationCurrent] = this._inputMutationCurrent.inputMutationAfter.apply(this._value);
        this._setSelection(this._inputMutationCurrent.positionAfter);
    }

    undo() {
        if (!this._inputMutationCurrent.inputMutationBefore) return;

        this._inputMutationTimeStamp = -Infinity;
        [this._value, this._inputMutationCurrent] = this._inputMutationCurrent.apply(this._value, true);
        let inputMutationAfter = this._inputMutationCurrent.inputMutationAfter;
        this._setSelection(...inputMutationAfter.rangeBefore);
    }
}
