import {ScrollArea} from '/$/Packages/Generic/Frontend/Components/ScrollArea/ScrollArea.js';
import {TextInput} from '/$/Packages/Generic/Frontend/Components/TextInput/TextInput.js';

import {Executor} from '/$/Packages/Generic/Js/Executor/Executor.js';


export class TextArea extends TextInput {
    static _components = [ScrollArea];
    static _cssUrl = true;
    static _htmlUrl = true;
    static _url = import.meta.url;

    static _fieldDescriptors = {
        spellCheck: {
            default: false,

            updateAfter() {
                this._component._inputElement.spellcheck = this._value;
            },
        },
    };


    static {
        this.init();
    }


    _updateSelectionBinded = super._updateSelection.bind(this);


    get _value() {
        return super._value;
    }
    set _value(value) {
        super._value = value;
        this._elements.root.refresh();
    }


    _init() {
        this._inputElement = this._elements.input;
        super._init();
    }

    _update() {
        if (this._inputMutationNew.rangeBefore[0] == this._inputMutationNew.rangeBefore[1] && this._inputMutationNew.type == 'deleteContentBackward') {
            this._setSelection(this._inputMutationNew.rangeBefore[0] - 1, this._inputMutationNew.rangeBefore[1]);
        }

        super._update();
    }

    _updateSelection() {
        this._inputMutationNew.type == 'insertFromPaste' ? super._updateSelection() : Executor.queueRendering(this._updateSelectionBinded);
    }
}
