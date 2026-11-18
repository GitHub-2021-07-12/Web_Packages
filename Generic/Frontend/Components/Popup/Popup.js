import {Component} from '/$/Packages/Generic/Frontend/Components/Component/Component.js';


export class Popup extends Component {
    static _cssUrl = true;
    static _htmlUrl = true;
    static _url = import.meta.url;

    static _eventHandlerDescriptors = {
        elements: {
            root: {
                close: function (event) {
                    this.open = false;
                },
            },
        },
    };

    static _fieldDescriptors = {
        modal: false,

        open: {
            default: false,

            updateAfter() {
                if (this._value) {
                    if (this._valuePrev) return;

                    this._component.modal ? this._elements.root.showModal() : this._elements.root.open = true;
                }
                else {
                    this._elements.root.open = false;
                }
            },
        },

        transient: {
            default: false,

            updateAfter() {
                this._elements.root.closedBy = this._value ? 'any' : '';
            },
        },
    };


    static {
        this.init();
    }
}
