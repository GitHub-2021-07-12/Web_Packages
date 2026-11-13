import {EventManager} from '/Packages/Generic/Frontend/Units/EventManager/EventManager.js';

import {Common} from '/Packages/Generic/Js/Common/Common.js';
import {Executor} from '/Packages/Generic/Js/Executor/Executor.js';
import {ExternalPromise} from '/Packages/Generic/Js/ExternalPromise/ExternalPromise.js';
import {HttpClient} from '/Packages/Generic/Js/HttpClient/HttpClient.js';
import {ObjectManager} from '/Packages/Generic/Js/ObjectManager/ObjectManager.js';


export class Component extends HTMLElement {
    static _components = [];
    static _css = '';
    static _cssUrl = '';
    static _defined = null;
    static _dom = null;
    static _domSubtrees = {};
    static _fieldNamesByExternals = {};
    static _fieldsDeferred = [];
    static _html = '';
    static _htmlUrl = '';
    static _httpClient = null;
    static _idAttribute = 'id';
    static _interpolationArgs = {};
    static _interpolationKey = this.name;
    static _interpolationRegExp = /{{\s*(?<key>.*?)\s*:\s*(?<value>.*?)\s*}}/g;
    static _propsExtended = ['_eventHandlerDescriptors', '_fieldDescriptors', '_fieldNamesByExternals', '_fieldsDeferred', '_shadowOpts'];
    static _rootTag = 'slot';
    static _styleSheet = null;
    static _styleSheetDescriptors = {};
    static _styleSheets = {};
    static _styleSheetsExternal = {};
    static _tag = '';
    static _tagPrefix = 'x';
    static _url = import.meta.url;
    static _useStyleSheetsExternal = false;

    static _Field = class {
        static _ItemConstructor = String;
        static _attributeName = '';
        static _cssPropDefaultValue = '';
        static _cssPropFactor = 1;
        static _cssPropName = '';
        static _cssPropStringRegExp = /^url\(\s*(?<quote>["'])#{(?<value>.*)}\k<quote>\s*\)$/i;
        static _cssPropUnit = '';
        static _defaultValue = undefined;
        static _enum = null;
        static _externalFlag = undefined;
        static _flash = false;
        static _name = '';
        static _protected = undefined;
        static _range = null;

        static _converters = {
            array: {
                fromAttribute(ItemConstructor, string) {
                    if (string == null) return undefined;

                    string = string.trim();
                    let items = string ? string.split(/\s+/) : [];

                    if (items.length && ItemConstructor == Number) {
                        items = items.map((item) => parseFloat(item));
                    }

                    return items;
                },

                fromCssProp(ItemConstructor, string) {
                    let items = string != 'none' ? string.split(/\s+/) : [];

                    if (items.length && ItemConstructor == Number) {
                        items = items.map((item) => parseFloat(item));
                    }

                    return items;
                },

                toAttribute(value) {
                    return value?.join(' ') || null;
                },

                toCssProp(value) {
                    return this._converters.array.toAttribute(value);
                },
            },

            boolean: {
                fromAttribute(string) {
                    return string == 'false' ? false : string === '' || !!string || undefined;
                },

                fromCssProp(string) {
                    return string == 'true';
                },

                toAttribute(value) {
                    return value ? '' : null;
                },

                toCssProp(value) {
                    return value !== undefined ? !!value + '' : null;
                },
            },

            entity: {
                fromAttribute(string) {
                    return string || undefined;
                },

                fromCssProp(string) {
                    return this._converters.entity.fromAttribute(string);
                },

                toAttribute(value) {
                    return value || value === 0 ? value + '' : null;
                },

                toCssProp(value) {
                    return this._converters.entity.toAttribute(value);
                },
            },

            number: {
                fromAttribute(string) {
                    return string ? parseFloat(string) : undefined;
                },

                fromCssProp(factor, string) {
                    return string ? parseFloat(string) * factor : undefined;
                },

                toAttribute(value) {
                    return value || value === 0 || Number.isNaN(value) ? value + '' : null;
                },

                toCssProp(unit, value) {
                    return value || value === 0 || Number.isNaN(value) ? value + (Number.isFinite(value) ? unit : '') : null;
                },
            },

            set: {
                fromAttribute(ItemConstructor, string) {
                    let items = this._converters.array.fromAttribute(ItemConstructor, string);

                    return items ? new Set(items) : undefined;
                },

                fromCssProp(ItemConstructor, string) {
                    let items = this._converters.array.fromCssProp(ItemConstructor, string);

                    return items ? new Set(items) : undefined;
                },

                toAttribute(value) {
                    return value ? [...value].join(' ') : null;
                },

                toCssProp(value) {
                    return value ? [...value].join(' ') || 'none' : null;
                },
            },

            string: {
                fromAttribute(string) {
                    return string ?? undefined;
                },

                fromCssProp(string) {
                    return string?.match(this._cssPropStringRegExp)?.groups.value.replace(/\\\\/g, '\\') ?? undefined;
                },

                toAttribute(value) {
                    return value !== undefined ? value + '' : null;
                },

                toCssProp(value) {
                    return value !== undefined ? `url('#{${(value + '').replace(/\\/g, '\\\\')}}')` : null;
                },
            },
        };


        static _assignConverters() {
            let converters = this._converters.string;
            let convertersBinded = {};

            switch (this._defaultValue?.constructor) {
                case Array: {
                    this._ItemConstructor = this._defaultValue[0]?.constructor || this._ItemConstructor;
                    converters = this._converters.array;
                    convertersBinded.fromAttribute = converters.fromAttribute.bind(this, this._ItemConstructor);
                    convertersBinded.fromCssProp = converters.fromCssProp.bind(this, this._ItemConstructor);

                    break;
                }
                case Boolean: {
                    converters = this._converters.boolean;

                    break;
                }
                case Number: {
                    converters = this._converters.number;
                    convertersBinded.fromCssProp = converters.fromCssProp.bind(this, this._cssPropFactor);
                    convertersBinded.toCssProp = converters.toCssProp.bind(this, this._cssPropUnit);

                    break;
                }
                case Set: {
                    this._ItemConstructor = this._defaultValue.values().next().value?.constructor || this._ItemConstructor;
                    converters = this._converters.set;
                    convertersBinded.fromAttribute = converters.fromAttribute.bind(this, this._ItemConstructor);
                    convertersBinded.fromCssProp = converters.fromCssProp.bind(this, this._ItemConstructor);

                    break;
                }
                case String: {
                    if (this._enum) {
                        converters = this._converters.entity;
                    }

                    break;
                }
            }

            this._fromAttribute = convertersBinded.fromAttribute || converters.fromAttribute.bind(this);
            this._fromCssProp = convertersBinded.fromCssProp || converters.fromCssProp.bind(this);
            this._toAttribute = converters.toAttribute.bind(this);
            this._toCssProp = convertersBinded.toCssProp || converters.toCssProp.bind(this);
        }

        static _fromAttribute() {}

        static _fromCssProp() {}

        static _registerCssProp() {
            let cssPropDescriptor = {
                inherits: true,
                initialValue: this._cssPropDefaultValue,
                name: this._cssPropName,
                syntax: '<url>',
            };

            switch (this._defaultValue?.constructor) {
                case Array:
                case Set: {
                    cssPropDescriptor.syntax = 'none | <number>+ | <angle>+ | <length-percentage>+ | <resolution>+ | <time>+ | <custom-ident>+';

                    break;
                }
                case Boolean: {
                    cssPropDescriptor.syntax = 'false | true';

                    break;
                }
                case Number: {
                    cssPropDescriptor.syntax = '<number> | <angle> | <length-percentage> | <resolution> | <time> | <custom-ident>';

                    break;
                }
                case String: {
                    if (this._enum) {
                        cssPropDescriptor.syntax = [...this._enum].join(' | ');
                    }

                    break;
                }
            }

            try {
                CSS.registerProperty(cssPropDescriptor);
            }
            catch (error) {
                console.warn(new Error(this._cssPropName, {cause: error}));
            }
        }

        static _toAttribute() {}

        static _toCssProp() {}


        static init({
            ItemConstructor = undefined,
            cssPropFactor = undefined,
            cssPropNamePrefix,
            cssPropUnit = undefined,
            default: defaultValue = undefined,
            enum: enum_ = undefined,
            externalFlag = undefined,
            flash = undefined,
            getInitialValue = undefined,
            name,
            range = undefined,
            updateAfter = undefined,
            updateBefore = undefined,
        }) {
            ObjectManager.assignProps(
                this,
                {
                    _ItemConstructor: ItemConstructor,
                    _cssPropFactor: cssPropFactor,
                    _cssPropUnit: cssPropUnit,
                    _defaultValue: defaultValue,
                    _enum: enum_?.[Symbol.iterator] && new Set(enum_),
                    _externalFlag: externalFlag,
                    _flash: flash,
                    _name: name,
                    _range: range,
                },
            );
            ObjectManager.assignProps(
                this.prototype,
                {
                    _getInitialValue: getInitialValue,
                    _updateAfter: updateAfter,
                    _updateBefore: updateBefore,
                },
            );

            this._attributeName = this._name;
            this._protected = this._name.startsWith('_');
            this._cssPropName = (this._protected ? `--_${cssPropNamePrefix}` : `--${cssPropNamePrefix}_`) + this._name;
            this._assignConverters();
            this._cssPropDefaultValue = this._toCssProp(this._defaultValue ?? '');
            this._registerCssProp();
        }


        _attributeIsBlocked = false;
        _checkItemBinded = this._checkItem.bind(this);
        _component = null;
        _cssPropValue = undefined;
        _elements = null;
        _freeForCss = true;
        _isDefault = true;
        _resetBinded = this.constructor._flash ? this.reset.bind(this) : null;
        _value = undefined;
        _valueExtra = undefined;
        _valuePrev = undefined;
        _valueSimple = undefined;


        _check() {
            let defaultValue = this.constructor._defaultValue;
            let defaultValueConstructor = defaultValue?.constructor;
            let valid = false;

            if (defaultValueConstructor && this._valueSimple?.constructor == defaultValueConstructor) {
                switch (defaultValueConstructor) {
                    case Array: {
                        valid =
                            (!defaultValue.length || this._valueSimple.length == defaultValue.length)
                            && this._valueSimple.every(this._checkItemBinded)
                            && !Common.compare(this._valueSimple, defaultValue)
                        ;

                        break;
                    }
                    case Set: {
                        let subSet = defaultValue.symmetricDifference(this._valueSimple);
                        valid = subSet.size && subSet.values().every(this._checkItemBinded);

                        break;
                    }
                    default: {
                        valid = !Common.compare(this._valueSimple, defaultValue) && (!this.constructor._enum || this.constructor._enum.has(this._valueSimple));
                    }
                }
            }

            this._isDefault = !valid;

            if (this._isDefault) {
                this._valueSimple = structuredClone(defaultValue);
            }
        }

        _checkItem(item) {
            return item !== '' && item?.constructor == this.constructor._ItemConstructor && (!this.constructor._enum || this.constructor._enum.has(item));
        }

        _dispatchEvent() {
            if (this._value === this._valuePrev) return;

            let eventDetail = {
                value: this._value,
                valuePrev: this._valuePrev,
            };
            this._component.dispatchEvent(`field.${this.constructor._name}`, eventDetail);
        }

        _fromAttribute() {
            return this.constructor._fromAttribute(this._component.getAttribute(this.constructor._attributeName));
        }

        _fromCssProp() {
            this._component.constructor.setCssProp(this._component, this.constructor._cssPropName, null);

            return this.constructor._fromCssProp(this._component.constructor.getCssProp(this._component, this.constructor._cssPropName));
        }

        _getInitialValue() {
            return undefined;
        }

        _initValue() {
            let value = this._getInitialValue();

            if (value === undefined && !this.constructor._protected) {
                value = this._fromAttribute();
            }

            this._freeForCss = !this.constructor._flash && !this.constructor._protected && value === undefined;

            if (this._freeForCss) {
                value = this._fromCssProp();
            }

            this._valueSimple = value;
            this._value = this._valueSimple;
        }

        _update(value) {
            if (value?.constructor == Array) {
                if (this.constructor._range) {
                    value = value.map((item) => Common.toRange(item, ...this.constructor._range));
                }

                if (this.constructor._defaultValue?.constructor == Set) {
                    value = new Set(value);
                }
            }
            else if (this.constructor._range) {
                value = Common.toRange(value, ...this.constructor._range);
            }

            this._valueExtra = undefined;
            this._valueSimple = value;
            this._check();
            this._updateBefore(value);

            if (this._valueSimple === undefined) return;

            if (this._valueSimple !== value) {
                this._check();
            }

            this._value = this._valueExtra !== undefined ? this._valueExtra : this._valueSimple;
            this._valueExtra = undefined;
            this._updateExternals();
            this._updateAfter();

            if (!this.constructor._flash) return;

            Executor.cancelTask(this._resetBinded);

            if (this._isDefault) return;

            Executor.queueTask(this._resetBinded, this._component.flashDuration);
        }

        _updateAfter() {}

        _updateBefore(value) {}

        _updateExternals() {
            let attributeValue =
                this.constructor._externalFlag !== false
                && this._valueSimple?.constructor == this.constructor._defaultValue?.constructor
                && (!this._isDefault || this.constructor._externalFlag === true || this._valueSimple === true)
                    ? this._valueSimple
                    : undefined
            ;
            this._attributeIsBlocked = true;
            this._component.setAttribute(this.constructor._attributeName, this.constructor._toAttribute(attributeValue));
            this._attributeIsBlocked = false;

            let cssPropValue = !this._freeForCss ? attributeValue : undefined;
            this._component.constructor.setCssProp(this._component, this.constructor._cssPropName, this.constructor._toCssProp(cssPropValue));
            this._cssPropValue = this._component.constructor.getCssProp(this._component, this.constructor._cssPropName);
        }


        constructor(component) {
            this._component = component;
            this._elements = this._component._elements;
            this._initValue();
        }

        refresh(simple = false) {
            this._update(simple ? this._valueSimple : this._value);
        }

        release() {
            this._value = this._valueSimple;
        }

        reset(withEvent = true) {
            this._valuePrev = this._value;

            if (this.constructor._flash || this.constructor._protected) {
                this._update(undefined);
            }
            else {
                this._freeForCss = true;
                this._update(this._fromCssProp());
            }

            if (withEvent) {
                this._dispatchEvent();
            }

            this._valuePrev = undefined;
        }

        set(value, withEvent = true) {
            if (this.constructor._flash && !this._component.flashDuration) return;

            this._freeForCss = false;
            this._valuePrev = this._value;
            this._update(value);

            if (withEvent) {
                this._dispatchEvent();
            }

            this._valuePrev = undefined;
        }

        updateByAttribute() {
            if (this._attributeIsBlocked || this.constructor._protected) return;

            this.set(this._fromAttribute());
        }

        updateByCssProp() {
            if (
                this.constructor._protected
                || !this._freeForCss
                || this._component.constructor.getCssProp(this._component, this.constructor._cssPropName, true)
                || this._component.constructor.getCssProp(this._component, this.constructor._cssPropName) == this._cssPropValue
            ) return;

            this.reset();
        }
    };

    static _eventHandlerDescriptors = {
        elements: {},
        host: {},
        shadow: {},

        fieldObserver: {
            transitionrun: function (event) {
                this._fields[this.constructor._fieldNamesByExternals[event.propertyName]].updateByCssProp();
            },
        },
    };

    static _fieldDescriptors = {
        autoRefresh: {
            default: false,

            updateAfter() {
                this._component._refreshAuto();
            },
        },

        disabled: {
            default: false,

            updateAfter() {
                this._component._face.inert = this._value;
            },
        },

        eventsWithoutDefaultAction: {
            default: new Set(),

            updateAfter() {
                if (this._valuePrev) {
                    EventManager.applyDefaultAction(this._component, true, ...this._valuePrev);
                }

                EventManager.applyDefaultAction(this._component, false, ...this._value);
            },
        },

        eventsWithoutPropagation: {
            default: new Set(),

            updateAfter() {
                if (this._valuePrev) {
                    EventManager.applyPropagation(this._component, true, ...this._valuePrev);
                }

                EventManager.applyPropagation(this._component, false, ...this._value);
            },
        },

        flashDuration: {
            cssPropFactor: 1e3,
            cssPropUnit: 'ms',
            default: 0,
        },
    };

    static _shadowOpts = {
        mode: 'closed',
    };


    static observedAttributes = [];


    static async _awaitComponents() {
        let promises = [...this._components].map((component) => component._defined);
        promises.push(Object.getPrototypeOf(this)._defined);
        await Promise.all(promises);
    }

    static async _createDom() {
        let css = '';
        let fieldDescriptors = [...Object.values(this._fieldDescriptors)].filter((Field) => !Field._protected);
        let html = '';
        let root = null;
        this._dom = new DocumentFragment();
        this._styleSheet = new CSSStyleSheet({baseURL: this._url});

        if (this._css) {
            css = this._css;
        }
        else if (this._cssUrl) {
            let cssUrl = this._cssUrl === true ? `./${this.name}.css` : this._cssUrl;
            css = this._httpClient.fetchText(cssUrl);
        }

        if (this._html) {
            html = this._html;
        }
        else if (this._htmlUrl) {
            let htmlUrl = this._htmlUrl === true ? `./${this.name}.html` : this._htmlUrl;
            html = this._httpClient.fetchText(htmlUrl);
        }

        [css, html] = await Promise.all([css, html]);

        if (css) {
            css = this.interpolate(css, this._interpolationKey, this._interpolationArgs);
            await this._styleSheet.replace(css);
        }

        if (html) {
            html = this.interpolate(html, this._interpolationKey, this._interpolationArgs);
            root = this.createDom(html);
        }
        else {
            root = document.createElement(this._rootTag);
            root.setAttribute(this._idAttribute, 'root');
        }

        this._dom.append(root);
        this._extractDomSubtrees();
        this._styleSheet.insertRule(`
            @layer {
                :host {
                    --Component_display: initial;
                    --Component_displayInner: flow-root;
                    --Component_displayOuter: block;
                    ${fieldDescriptors.map((Field) => `${Field._cssPropName}: ${Field._cssPropDefaultValue};`).join(' ')}

                    display: var(--Component_display, var(--Component_displayOuter) var(--Component_displayInner)) !important;
                }
                :host([hidden]) {
                    display: none !important;
                }


                [_Component_fieldObserver] {
                    display: contents !important;
                    transition: allow-discrete 1ms !important;
                    transition-property: ${fieldDescriptors.map((Field) => Field._cssPropName).join(', ')} !important;
                }


                #root {
                    display: contents;
                }
            }
        `);
    }

    static _createFieldAccessors() {
        for (let Field of Object.values(this._fieldDescriptors)) {
            let {propDescriptor = {}} = ObjectManager.getPropDescriptor(this.prototype, Field._name);

            if (propDescriptor.get && propDescriptor.set) continue;

            propDescriptor = {
                get: propDescriptor.get,
                set: propDescriptor.set,
            };
            propDescriptor.get ||= Executor.executeExpression(`
                function () {
                    return this._fields.${Field._name}._value;
                }
            `);
            propDescriptor.set ||= Executor.executeExpression(`
                function (value) {
                    this.setField('${Field._name}', value);
                }
            `);
            Object.defineProperty(this.prototype, Field._name, propDescriptor);
        }
    }

    static async _createStyleSheets() {
        if (!Object.hasOwn(this, '_styleSheetDescriptors')) return;

        this._styleSheets = await this.createStyleSheets(this._styleSheetDescriptors);
    }

    static async _createStyleSheetsExternal() {
        if (!ObjectManager.checkOwnProp(this, '_useStyleSheetsExternal')) return;

        let styleSheetDescriptors = {};
        let urls = new Set([...document.querySelectorAll(`link[${this.name}_styleSheet]`)].map((link) => link.href));

        for (let styleSheet of document.styleSheets) {
            if (!urls.has(styleSheet.href)) continue;

            styleSheetDescriptors[styleSheet.href] = {
                text: [...styleSheet.cssRules].map((cssRule) => cssRule.cssText).join(' '),
                url: styleSheet.href,
            };
        }

        this._styleSheetsExternal = await this.createStyleSheets(styleSheetDescriptors);
    }

    static _extractDomSubtrees() {
        this._domSubtrees = {};
        let domSubtrees = this._dom.querySelectorAll('[Component_subtree]');

        for (let domSubtree of domSubtrees) {
            let domSubtreeKey = domSubtree.getAttribute('Component_subtree');
            this._domSubtrees[domSubtreeKey] = domSubtree;

            let domPlug = document.createElement('meta');
            domPlug.setAttribute('_Component_plug', domSubtreeKey);
            domSubtree.replaceWith(domPlug);
        }
    }

    static _mapExternals() {
        if (!Object.hasOwn(this, '_fieldDescriptors')) return;

        this._fieldNamesByExternals = {};
        this.observedAttributes = [...this.observedAttributes];

        for (let Field of Object.values(this._fieldDescriptors)) {
            if (Field._protected) continue;

            let attributeNameLowerCase = Field._attributeName.toLowerCase();
            this._fieldNamesByExternals[attributeNameLowerCase] = Field._name;
            this._fieldNamesByExternals[Field._cssPropName] = Field._name;
            this.observedAttributes.push(attributeNameLowerCase);
        }
    }

    static _normalizeFieldDescriptors() {
        if (!Object.hasOwn(this, '_fieldDescriptors')) return;

        for (let [fieldName, fieldDescriptor] of Object.entries(this._fieldDescriptors)) {
            let Field = null;

            if (ObjectManager.getPrototypeDepth(fieldDescriptor, this._Field) > 0) {
                Field = fieldDescriptor;

                if (Field._name == fieldName) continue;
            }
            else {
                Field = class Field extends this._Field {};

                if (fieldDescriptor?.constructor != Object) {
                    fieldDescriptor = {default: fieldDescriptor};
                }
            }

            Field.init({
                cssPropNamePrefix: this.name,
                ...fieldDescriptor,
                name: fieldName,
            });
            this._fieldDescriptors[fieldName] = Field;
        }
    }


    static applyStyleSheets(enabled, ...styleSheetKeys) {
        if (!Object.hasOwn(this, '_styleSheets')) return;

        styleSheetKeys = styleSheetKeys.length ? styleSheetKeys : Object.keys(this._styleSheets);

        for (let styleSheetKey of styleSheetKeys) {
            if (!this._styleSheets[styleSheetKey]) continue;

            this._styleSheets[styleSheetKey].disabled = !enabled;
        }
    }

    static async awaitResources(elements, urlPropName = '') {
        let locationUrl = location.href.replace(/#.*$/, '');
        let promises = [];

        for (let element of elements) {
            let resourceUrl = element[urlPropName];

            if (resourceUrl == locationUrl || urlPropName && !resourceUrl) continue;

            EventManager.createEventHandlers({
                eventTarget: element,

                eventHandlerDescriptors: {
                    error: () => promise.reject(),
                    load: () => promise.fulfill(),
                },
            });
            let promise = new ExternalPromise();
            promises.push(promise);
        }

        await Promise.allSettled(promises);
    }

    static createDom(html) {
        if (!html) return null;

        let template = document.createElement('template');
        template.innerHTML = html;
        let dom = template.content;

        return dom;
    }

    static async createStyleSheets(styleSheetDescriptors) {
        let styleSheetTextsPromises = {};
        let styleSheets = {};

        for (let k in styleSheetDescriptors) {
            let styleSheetDescriptor = styleSheetDescriptors[k];

            if (styleSheetDescriptor?.constructor != Object) {
                styleSheetDescriptor = {
                    disabled: false,
                    text: '',
                    url: styleSheetDescriptor,
                };
            }

            if (!styleSheetDescriptor.text && !styleSheetDescriptor.url) continue;

            let styleSheet = new CSSStyleSheet({
                baseURL: styleSheetDescriptor.url,
                disabled: styleSheetDescriptor.disabled,
            });
            styleSheetTextsPromises[k] = styleSheetDescriptor.text || this._httpClient.fetchText(styleSheetDescriptor.url);
            styleSheets[k] = styleSheet;
        }

        await Promise.all(Object.values(styleSheetTextsPromises));

        for (let k in styleSheets) {
            styleSheets[k].replace(await styleSheetTextsPromises[k]);
        }

        return styleSheets;
    }

    static getCssProp(element, cssPropName, inline = false) {
        if (!inline && !element._Component_computedStyle) {
            element._Component_computedStyle = getComputedStyle(element);
        }

        let style = inline ? element.style : element._Component_computedStyle;

        return style.getPropertyValue(cssPropName);
    }

    static getCssPropNumber(element, cssPropName, inline = false) {
        let cssPropValue = this.getCssProp(element, cssPropName, inline);

        return parseFloat(cssPropValue);
    }

    static getDomPath(node, root = null) {
        let path = [];

        while (node && node != root) {
            path.push(node);
            node = node.parentNode;
        }

        return path;
    }

    static getDomRect(element, outer = false) {
        let domRect = element.getBoundingClientRect();
        domRect = {
            bottom: domRect.bottom + window.scrollY,
            height: undefined,
            left: domRect.left + window.scrollX,
            right: domRect.right + window.scrollX,
            top: domRect.top + window.scrollY,
            width: undefined,
        };

        if (outer) {
            domRect.bottom += this.getCssPropNumber(element, 'margin-bottom');
            domRect.left -= this.getCssPropNumber(element, 'margin-left');
            domRect.right += this.getCssPropNumber(element, 'margin-right');
            domRect.top -= this.getCssPropNumber(element, 'margin-top');
        }
        else {
            domRect.bottom -= this.getCssPropNumber(element, 'border-bottom-width') + this.getCssPropNumber(element, 'padding-bottom');
            domRect.left += this.getCssPropNumber(element, 'border-left-width') + this.getCssPropNumber(element, 'padding-left');
            domRect.right -= this.getCssPropNumber(element, 'border-right-width') + this.getCssPropNumber(element, 'padding-right');
            domRect.top += this.getCssPropNumber(element, 'border-top-width') + this.getCssPropNumber(element, 'padding-top');
        }

        domRect.height = domRect.bottom - domRect.top;
        domRect.width = domRect.right - domRect.left;

        return domRect;
    }

    static getElements(dom, idAttribute = this._idAttribute) {
        idAttribute = idAttribute.toLowerCase();

        let elements = {};
        let nodes = [dom, ...dom.querySelectorAll(`[${idAttribute}]:not([${idAttribute}^='_'])`)];

        for (let node of nodes) {
            let elementKey = node.getAttribute?.(idAttribute);

            if (!elementKey) continue;

            elements[elementKey] = node;
        }

        return elements;
    }

    static getHeight(element, outer = false) {
        return this.getCssPropNumber(element, 'height') + this.getSizeEdging(element, 'block', outer);
    }

    static getInset(element, insetType, fromEnd = false) {
        return this.getCssPropNumber(element, `inset-${insetType}-${fromEnd ? 'end' : 'start'}`);
    }

    static getLeft(element) {
        return this.getCssPropNumber(element, 'left');
    }

    static getRootNode(node) {
        while (node?.parentNode) {
            node = node.parentNode;
        }

        return node;
    }

    static getSize(element, sizeType, outer = false) {
        return this.getCssPropNumber(element, `${sizeType}-size`) + this.getSizeEdging(element, sizeType, outer);
    }

    static getSizeEdging(element, sizeType, sizeIsOuter = false) {
        let isBorderBox = this.getCssProp(element, 'box-sizing') == 'border-box';
        let sizeEdging = 0;

        if (sizeIsOuter) {
            sizeEdging += this.getCssPropNumber(element, `margin-${sizeType}-start`) + this.getCssPropNumber(element, `margin-${sizeType}-end`);
        }

        if (sizeIsOuter ? !isBorderBox : isBorderBox) {
            let sizeEdgingInner =
                this.getCssPropNumber(element, `border-${sizeType}-start-width`) + this.getCssPropNumber(element, `border-${sizeType}-end-width`)
                + this.getCssPropNumber(element, `padding-${sizeType}-start`) + this.getCssPropNumber(element, `padding-${sizeType}-end`)
            ;
            sizeEdging += sizeIsOuter ? sizeEdgingInner : -sizeEdgingInner;
        }

        return sizeEdging;
    }

    static getTop(element) {
        return this.getCssPropNumber(element, 'top');
    }

    static getWidth(element, outer = false) {
        return this.getCssPropNumber(element, 'width') + this.getSizeEdging(element, 'inline', outer);
    }

    static async init({
        abstract = false,
        // components = [],
        css = undefined,
        cssUrl = undefined,
        html = undefined,
        htmlUrl = undefined,
        idAttribute = undefined,
        interpolationArgs = undefined,
        interpolationKey = undefined,
        rootTag = undefined,
        styleSheetDescriptors = undefined,
        tagPrefix = undefined,
        url = undefined,
        useStyleSheetsExternal = undefined,
    } = {}) {
        if (ObjectManager.isInited(this, false)) return;

        ObjectManager.assignProps(
            this,
            {
                // _components: new Set([...this._components, ...components]),
                _css: css,
                _cssUrl: cssUrl,
                _html: html,
                _htmlUrl: htmlUrl,
                _idAttribute: idAttribute,
                _interpolationArgs: interpolationArgs,
                _interpolationKey: interpolationKey,
                _rootTag: rootTag,
                _styleSheetDescriptors: styleSheetDescriptors,
                _tagPrefix: tagPrefix,
                _url: url,
                _useStyleSheetsExternal: useStyleSheetsExternal,
            },
        );

        if (ObjectManager.checkOwnProp(this, '_defined')) return;

        this._defined = new ExternalPromise();
        this._normalizeFieldDescriptors();
        this._createFieldAccessors();
        this._mapExternals();
        EventManager.normalizeEventHandlerDescriptors(this._eventHandlerDescriptors);
        ObjectManager.extendProps(this, null, ...this._propsExtended);

        await Executor.delay();

        this._httpClient = new HttpClient().init({urlBasic: this._url});
        await Promise.all([
            this._awaitComponents(),
            this._createStyleSheets(),
            this._createStyleSheetsExternal(),
            !abstract && this._createDom(),
        ]);

        if (!abstract) {
            this._tag = `${this._tagPrefix}-${this.name}`.toLowerCase();

            try {
                customElements.define(this._tag, this);
            }
            catch (error) {
                console.warn(error);
            }
        }

        this._defined.fulfill();
        ObjectManager.init(this);
    }

    static interpolate(string, interpolationKey, interpolationArgs) {
        let f = (match, key, value) => {
            if (key != interpolationKey) return match;

            return Executor.executeExpression(value, interpolationArgs) ?? '';
        };

        return string.replace(this._interpolationRegExp, f);
    }

    static setAttribute(element, attributeName, attributeValue) {
        attributeValue == null ? element.removeAttribute(attributeName) : super.prototype.setAttribute.call(element, attributeName, attributeValue);
    }

    static setCssProp(element, cssPropName, cssPropValue, important = false) {
        important = important ? 'important' : null;
        cssPropValue ??= null;
        element.style.setProperty(cssPropName, cssPropValue, important);
    }

    static setHeight(element, height, outer = false, important = false) {
        height = height || height === 0 ? Math.max(height - this.getSizeEdging(element, 'block', outer), 0) + 'px' : null;
        this.setCssProp(element, 'height', height, important);
    }

    static setInset(element, insetType, inset, fromEnd = false, important = false) {
        inset = inset || inset === 0 ? `${inset}px` : null;
        let insetName = `inset-${insetType}-${fromEnd ? 'end' : 'start'}`;
        this.setCssProp(element, insetName, inset, important);
    }

    static setLeft(element, left, important = false) {
        left = left || left === 0 ? `${left}px` : null;
        this.setCssProp(element, 'left', left, important);
    }

    static setSize(element, sizeType, size, outer = false, important = false) {
        size = size || size === 0 ? Math.max(size - this.getSizeEdging(element, sizeType, outer), 0) + 'px' : null;
        this.setCssProp(element, `${sizeType}-size`, size, important);
    }

    static setTop(element, top, important = false) {
        top = top || top === 0 ? `${top}px` : null;
        this.setCssProp(element, 'top', top, important);
    }

    static setWidth(element, width, outer = false, important = false) {
        width = width || width === 0 ? Math.max(width - this.getSizeEdging(element, 'inline', outer), 0) + 'px' : null;
        this.setCssProp(element, 'width', width, important);
    }

    static wrap(nodes, wrapper) {
        if (!nodes[Symbol.iterator]) {
            nodes = [nodes];
        }

        let nodeParent = nodes[0].parentNode;
        let nodePrev = nodes[0].previousSibling;
        wrapper.append(...nodes);
        nodePrev ? nodePrev.after(wrapper) : nodeParent.append(wrapper);

        return wrapper;
    }


    static {
        this.init({useStyleSheetsExternal: true});
    }


    _autoRefreshIsBlocked = false;
    _domSubtreesReleased = new Set();
    _elements = {};
    _eventHandlers = null;
    _face = this;
    _fieldObserver = null;
    _fields = {};
    _shadow = this.attachShadow(this.constructor._shadowOpts);


    _adoptStyleSheets() {
        this._shadow.adoptedStyleSheets.push(this.constructor._styleSheet);

        for (let styleSheetExternal of Object.values(this.constructor._styleSheetsExternal)) {
            this._shadow.adoptedStyleSheets.push(styleSheetExternal);
        }

        for (let styleSheet of Object.values(this.constructor._styleSheets)) {
            this._shadow.adoptedStyleSheets.push(styleSheet);
        }
    }

    _build() {
        if (ObjectManager.isInited(this)) return;

        this._adoptStyleSheets();
        this._createFieldObserver();
        this._shadow.append(this._fieldObserver, this.constructor._dom.cloneNode(true));
        this._elements = this.constructor.getElements(this._shadow);
        this._eventHandlers = EventManager.createEventHandlers({
            context: this,
            eventHandlerDescriptors: this.constructor._eventHandlerDescriptors,
            normalize: false,

            eventTarget: {
                elements: this._elements,
                fieldObserver: this._fieldObserver,
                host: this,
                shadow: this._shadow,
            },
        });
        this._defineFace();
        this._createFields();

        this._autoRefreshIsBlocked = true;
        this._init();
        this._refreshFields();
        this._autoRefreshIsBlocked = false;
        this._refreshAuto();
    }

    _createFieldObserver() {
        this._fieldObserver = document.createElement('meta');
        this._fieldObserver.setAttribute('_Component_fieldObserver', '');
        EventManager.applyPropagation(this._fieldObserver, false, 'transitioncancel', 'transitionend', 'transitionrun', 'transitionstart');
    }

    _createFields() {
        this._fields = {};

        for (let Field of Object.values(this.constructor._fieldDescriptors)) {
            this._fields[Field._name] = new Field(this);
        }
    }

    _defineFace() {
        let component = this;
        let face = this._shadow.querySelector('[Component_face]') || component;

        while (face instanceof Component && face != component) {
            component = face;
            face = component._face;
        }

        this._face = face;
    }

    _init() {}

    _refreshAuto(...args) {
        if (!this.autoRefresh || this._autoRefreshIsBlocked) return;

        this.refresh(...args);
    }

    _refreshFields() {
        let fieldsDeferred = new Set(this.constructor._fieldsDeferred);

        for (let fieldName of Object.keys(this._fields)) {
            if (fieldsDeferred.has(fieldName)) continue;

            this.refreshField(fieldName);
        }
    }

    _releaseDomSubtree(domSubtreeKey) {
        let domSubtree = this.constructor._domSubtrees[domSubtreeKey];

        if (!domSubtree || this._domSubtreesReleased.has(domSubtreeKey)) return;

        domSubtree = domSubtree.cloneNode(true);
        let domSubtreeElements = this.constructor.getElements(domSubtree);
        EventManager.applyEventHandlers(this._eventHandlers.elements, domSubtreeElements);
        Object.assign(this._elements, domSubtreeElements);
        this._domSubtreesReleased.add(domSubtreeKey);
        this._shadow.querySelector(`[_Component_plug='${domSubtreeKey}']`).replaceWith(domSubtree);
        this.dispatchEvent('domSubtree', {key: domSubtreeKey});
    }


    attributeChangedCallback(attributeName) {
        this._fields[this.constructor._fieldNamesByExternals[attributeName]]?.updateByAttribute();
    }

    connectedCallback() {
        this._build();
    }

    dispatchEvent(eventName, eventDetail = null) {
        return EventManager.dispatchEvent(this, eventName, eventDetail);
    }

    dispatchEventAsync(eventName, eventDetail = null) {
        return EventManager.dispatchEventAsync(this, eventName, eventDetail);
    }

    getCssProp(cssPropName, inline = false) {
        return this.constructor.getCssProp(this._face, cssPropName, inline);
    }

    getCssPropNumber(cssPropName, inline = false) {
        return this.constructor.getCssPropNumber(this._face, cssPropName, inline);
    }

    getDomPath(root) {
        return this.constructor.getDomPath(this, root);
    }

    getDomRect(outer = false) {
        return this.constructor.getDomRect(this._face, outer);
    }

    getHeight(outer = false) {
        return this.constructor.getHeight(this._face, outer);
    }

    getInset(insetType, fromEnd = false) {
        return this.constructor.getInset(this._face, fromEnd);
    }

    getLeft() {
        return this.constructor.getLeft(this._face);
    }

    getRootNode() {
        return this.constructor.getRootNode(this);
    }

    getSize(sizeType, outer = false) {
        return this.constructor.getSize(this._face, sizeType, outer);
    }

    getTop() {
        return this.constructor.getTop(this._face);
    }

    getWidth(outer = false) {
        return this.constructor.getWidth(this._face, outer);
    }

    refresh() {}

    refreshField(fieldName, simple = false) {
        this._fields[fieldName]?.refresh(simple);
    }

    releaseField(fieldName) {
        this._fields[fieldName]?.release();
    }

    resetField(fieldName) {
        this._fields[fieldName]?.reset();
    }

    setAttribute(attributeName, attributeValue) {
        return this.constructor.setAttribute(this, attributeName, attributeValue);
    }

    setCssProp(cssPropName, cssPropValue, important = false) {
        return this.constructor.setCssProp(this._face, cssPropName, cssPropValue, important);
    }

    setField(fieldName, value, withEvent = true) {
        this._fields[fieldName]?.set(value, withEvent);
    }

    setHeight(height, outer = false, important = false) {
        return this.constructor.setHeight(this._face, height, outer, important);
    }

    setInset(insetType, inset, fromEnd = false, important = false) {
        return this.constructor.setInset(this._face, insetType, inset, fromEnd, important);
    }

    setLeft(left, important = false) {
        return this.constructor.setLeft(this._face, left, important);
    }

    setSize(sizeType, size, outer = false, important = false) {
        this.constructor.setSize(this._face, sizeType, size, outer, important);
    }

    setTop(top, important = false) {
        return this.constructor.setTop(this._face, top, important);
    }

    setWidth(width, outer = false, important = false) {
        return this.constructor.setWidth(this._face, width, outer, important);
    }
}
