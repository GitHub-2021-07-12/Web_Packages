import {Component} from '/$/Packages/Generic/Frontend/Components/Component/Component.js';


export class Switch extends Component {
    static _cssUrl = true;
    static _htmlUrl = true;
    static _url = import.meta.url;

    static _eventHandlerDescriptors = {
        host: {
            click: function () {
                this.toggle();
            },

            keydown: function (event) {
                switch (event.code) {
                    case 'Enter':
                    case 'Space': {
                        this.toggle();

                        break;
                    }
                }
            },
        },
    };

    static _fieldDescriptors = {
        on: false,
    };


    static {
        this.init();
    }


    toggle() {
        this.on = !this.on;
    }
}
