import {Component} from '/$/Packages/Generic/Frontend/Components/Component/Component.js';

import {EventManager} from '/$/Packages/Generic/Frontend/Units/EventManager/EventManager.js';
import {Model} from '/$/Packages/Generic/Frontend/Units/Model/Model.js';

import {Executor} from '/$/Packages/Generic/Js/Executor/Executor.js';


export class Repeater extends Component {
    static _eventHandlerDescriptors = {
        model: {
            add: function (event) {
                if (!this._condition) return;

                let itemRelative = this._items.get(event.detail.itemRelative);

                if (itemRelative && this.interpolationKey) {
                    this._defineItems();
                }
                else {
                    let items = this._createItems(event.detail.items);
                    itemRelative ? itemRelative.before(...items) : this.target.append(...items);
                    this._applyIndexes();
                }
            },

            clear: function () {
                this._clear();
            },

            delete: function (event) {
                if (this.interpolationKey) {
                    this._defineItems();
                }
                else {
                    for (let modelItem of event.detail.items) {
                        this._items.get(modelItem).remove();
                        this._items.delete(modelItem);
                    }

                    this._applyIndexes();
                }
            },

            filter: function () {
                for (let item of this._items.values()) {
                    item.Repeater_itemManager.refresh();
                }
            },

            order: function () {
                if (this.interpolationKey) {
                    this._defineItems();
                }
                else {
                    let items = this.model._items.map((modelItem) => this._items.get(modelItem));
                    this.target.textContent = '';
                    this.target.append(...items);
                    this._applyIndexes();
                }
            },

            update: function (event) {
                if (!this._condition) return;

                let item = this._items.get(event.detail.item);

                if (this.interpolationKey) {
                    item.replaceWith(this._createItem(event.detail.item));
                }

                item.Repeater_itemManager.applyData();
            },
        },
    };

    static _fieldDescriptors = {
        interpolationKey: {
            default: '',

            updateAfter() {
                this._component._refreshAuto();
            },
        },

        model: {
            default: 0,
            range: [0, Infinity],

            updateAfter() {
                this._component._refreshAuto();
                EventManager.applyEventHandlers(this._component._eventHandlers.model, this._value);
            },

            updateBefore(value) {
                switch (value?.constructor) {
                    case Array: {
                        let modelItems = value;
                        this._valueExtra = new Model();
                        this._valueExtra.add(modelItems);

                        break;
                    }
                    case Model: {
                        this._valueExtra = value;

                        break;
                    }
                    case Number: {
                        let modelItems = [];
                        let modelItemsCount = value;
                        this._valueExtra = new Model();

                        for (let i = 0; i < modelItemsCount; i++) {
                            modelItems.push(i + 1);
                        }

                        this._valueExtra.add(modelItems);

                        break;
                    }
                    default: {
                        this._valueExtra = null;
                    }
                }
            },
        },

        target: {
            default: '',

            updateAfter() {
                if (this._valuePrev instanceof Node) {
                    this._valuePrev.textContent = '';
                }

                this._component._refreshAuto();
            },

            updateBefore(value) {
                if (value instanceof Node) {
                    this._valueExtra = value;
                }
                else {
                    let rootNode = this._component.getRootNode(this._component);
                    let selector = value + '';

                    try {
                        this._valueExtra = rootNode.querySelector(selector);
                    }
                    catch {
                        this._valueExtra = null;
                    }

                    this._valueExtra ||= this._component;
                }
            },
        },
    };


    static ItemManager = class {
        static _eventHandlerDescriptors = {
            elements: {},
            item: {},
        };


        static init() {
            EventManager.normalizeEventHandlerDescriptors(this._eventHandlerDescriptors);
        }


        static {
            this.init();
        }


        _idAttribute = 'Repeater_element';
        _elements = {};
        _eventHandlers = null;
        _item = null;
        _model = null;
        _modelItem = null;


        _init() {}


        applyData() {}

        applyIndex() {}

        constructor(item, model, modelItem) {
            this._item = item;
            this._elements = Repeater.getElements(this._item, this._idAttribute);
            this._eventHandlers = EventManager.createEventHandlers({
                context: this,
                eventHandlerDescriptors: this.constructor._eventHandlerDescriptors,
                normalize: false,

                eventTarget: {
                    elements: this._elements,
                    item: this._item,
                },
            });
            this._model = model;
            this._modelItem = modelItem;
            this._init();
            this.applyData();
            this.applyIndex();
            this.refresh();
        }

        refresh() {
            Repeater.setAttribute(this._item, '_Repeater_excluded', this._modelItem.excluded ? '' : null);
        }

        updateData() {}
    };


    static {
        this.init();
    }


    __ItemManager = this.constructor.ItemManager;
    __delegate = null;


    _itemTemplate = document.createElement('template');
    _items = new Map();


    get _condition() {
        return !!(this.delegate && this.model && this.target);
    }


    get ItemManager() {
        return this.__ItemManager;
    }
    set ItemManager(ItemManager) {
        this.__ItemManager = ItemManager || this.constructor.ItemManager;
        this._refreshAuto();
    }

    get delegate() {
        return this.__delegate;
    }
    set delegate(delegate) {
        this.__delegate = delegate || null;
        this._refreshAuto();
    }


    _applyIndexes() {
        for (let item of this._items.values()) {
            item.Repeater_itemManager.applyIndex();
        }
    }

    _clear() {
        this.target.textContent = '';
        this._items.clear();
    }

    _createItem(modelItem) {
        if (!this._condition) return null;

        let item = null;

        if (this.interpolationKey) {
            this._itemTemplate.innerHTML = this.constructor.interpolate(this.delegate.outerHTML, this.interpolationKey, modelItem);
            item = this._itemTemplate.content.firstElementChild;
        }
        else {
            item = this.delegate.cloneNode(true);
        }

        item.Repeater_itemManager = new this.ItemManager(item, this.model, modelItem);
        this._items.set(modelItem, item);

        return item;
    }

    _createItems(modelItems = this.model._items) {
        if (!this._condition) return null;

        let items = [];

        for (let modelItem of modelItems) {
            items.push(this._createItem(modelItem));
        }

        return items;
    }

    _defineItems() {
        this._clear();

        if (!this._condition) return;

        this._createItems();
        this.target.append(...this._items.values());
    }

    _init() {
        let templateContent = this.querySelector('template')?.content;

        if (!templateContent) return;

        this.ItemManager = Executor.executeExpression(templateContent.querySelector('script[Repeater_ItemManager]')?.text, {Repeater: this.constructor});
        this.delegate = templateContent.querySelector('[Repeater_item]');
        this.model = Executor.executeExpression(templateContent.querySelector('script[Repeater_model]')?.text) || this.model;
    }


    refresh() {
        this._defineItems();
    }
}
