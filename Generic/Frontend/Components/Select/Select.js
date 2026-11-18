import {Popup} from '/$/Packages/Generic/Frontend/Components/Popup/Popup.js';
import {Repeater} from '/$/Packages/Generic/Frontend/Components/Repeater/Repeater.js';
import {ScrollArea} from '/$/Packages/Generic/Frontend/Components/ScrollArea/ScrollArea.js';
import {TextField} from '/$/Packages/Generic/Frontend/Components/TextField/TextField.js';

import {Common} from '/$/Packages/Generic/Js/Common/Common.js';


export class Select extends Repeater {
    static _components = [Popup, ScrollArea, TextField];
    static _cssUrl = true;
    static _htmlUrl = true;
    static _url = import.meta.url;

    static _eventHandlerDescriptors = {
        elements: {
            buttonClear: {
                click: function () {
                    this.index = null;
                    this._refreshItems();
                },

                pointerdown: function (event) {
                    event.preventDefault();
                },
            },

            scrollArea: {
                tap: function (event) {
                    let modelItem = event.detail.pointer._target.Repeater_itemManager?._modelItem;

                    if (!modelItem || modelItem.excluded) return;

                    this.index = modelItem.index;
                    this.blur();
                },
            },

            textField: {
                mutation: function () {
                    this._refreshItems();
                },
            },
        },

        host: {
            blur: function (event) {
                this._invalid = false;
                this._open = false;
                this.refreshField('index');
            },

            domSubtree: function (event) {
                if (event.detail.key != 'popup') return;

                this.delegate ||= this._shadow.querySelector('template').content.firstElementChild;
            },

            field: function (event) {
                if (event.detail.name != 'model') return;

                this.refreshField('index');
            },

            focus: function (event) {
                this._open = true;
            },

            keydown: function (event) {
                switch (event.code) {
                    case 'ArrowDown': {
                        event.preventDefault();
                        this._indexFilteredHighlightedIndex++;

                        break;
                    }
                    case 'ArrowUp': {
                        event.preventDefault();
                        this._indexFilteredHighlightedIndex--;

                        break;
                    }
                    case 'Enter': {
                        this.index = this._invalid ? null : this._indexHighlighted;
                        this.blur();

                        break;
                    }
                    case 'Escape': {
                        this.blur();

                        break;
                    }
                }
            },
        },

        shadow: {
            focusin: function (event) {
                this.editable ? this._elements.textField.focus() : this._elements.root.focus();
            },

            pointerdown: function (event) {
                if (!this._open || event.target != this._elements.root) return;

                event.preventDefault();
                this.blur();
            },
        },
    };

    static _fieldDescriptors = {
        _invalid: false,

        _open: {
            default: false,

            updateAfter() {
                if (this._value) {
                    if (this._valuePrev) return;

                    this._component._releaseDomSubtree('popup');
                    this._elements.popup.open = true;
                    this._component.offsetParent;
                    this._component._refreshItems();
                }
                else if (this._valuePrev) {
                    this._elements.popup.open = false;
                }
            },

            updateBefore() {
                this._valueSimple &&= !!this._component.model._items.length;
            },
        },


        buttonClear: false,
        interpolationKey: 'repeater',
        looped: false,
        placeholder: '',
        valueProp: 'value',

        editable: {
            default: false,

            updateAfter() {
                this._elements.textField.inert = !this._value;
                this._component._indexesFiltered.length = 0;
                this._elements.root.setAttribute('tabIndex', -this._value);
            },
        },

        index: {
            default: -1,
            range: [-1, Infinity],

            updateAfter() {
                this._elements.textField.value = this._component.model._items[this._value]?.data[this._component.valueProp] ?? '';
            },

            updateBefore() {
                this._valueSimple = Math.min(this._valueSimple, this._component.model._items.length - 1);
            },
        },
    };

    static _shadowOpts = {
        delegatesFocus: true,
    };


    static {
        this.init();
    }


    __indexFilteredHighlightedIndex = 0;


    _indexHighlighted = -1;
    _indexesFiltered = [];


    get _indexFilteredHighlightedIndex() {
        return this.__indexFilteredHighlightedIndex;
    }
    set _indexFilteredHighlightedIndex(indexFilteredHighlightedIndex) {
        if (!this.model._items.length) {
            this.__indexFilteredHighlightedIndex = -1;
            this._indexHighlighted = -1;
            this._indexesFiltered.length = 0;

            return;
        }

        let f = this.looped ? Common.toRing : Common.toRange;
        this.__indexFilteredHighlightedIndex = f(indexFilteredHighlightedIndex, 0, (this._indexesFiltered.length || this.model._items.length) - 1);

        let itemHighlighted = this._items.get(this.model._items[this._indexHighlighted]);

        if (itemHighlighted) {
            this.constructor.setAttribute(itemHighlighted, '_Select_highlighted', null);
        }

        this._indexHighlighted = this._indexesFiltered[this._indexFilteredHighlightedIndex] ?? this._indexFilteredHighlightedIndex;
        itemHighlighted = this._items.get(this.model._items[this._indexHighlighted]);
        this.constructor.setAttribute(itemHighlighted, '_Select_highlighted', '');
        this._elements.scrollArea.scrollToElement(itemHighlighted, {block: 'center', container: 'nearest'});
    }


    _refreshItems() {
        if (!this._open) return;

        if (this.editable) {
            let regExpString = this._elements.textField.value
                .trim()
                .split('')
                .map((char) => char.replace(/[$()*+.?[^{|}\\\]]/, '\\$&'))
                .join('.*?')
            ;
            this.model.filterRegExp = new RegExp(regExpString, 'i');
        }
        else {
            this.model.filterRegExp = null;
        }

        this.model.filter();

        if (this.editable) {
            this._indexesFiltered = this.model._items.filter((item) => !item.excluded).map((item) => item.index);
            this._indexFilteredHighlightedIndex = 0;
            this._invalid = !this._indexesFiltered.length;
        }
        else {
            this._indexFilteredHighlightedIndex = Math.max(this.index, 0);
            this._indexesFiltered.length = 0;
        }

        this._elements.scrollArea.refresh();
    }
}
