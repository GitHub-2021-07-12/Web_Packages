import {Component} from '/$/Packages/Generic/Frontend/Components/Component/Component.js';

import {HttpClient} from '/$/Packages/Generic/Js/HttpClient/HttpClient.js';


export class Svg extends Component {
    static _cssUrl = true;
    static _rootTag ='div';
    static _url = import.meta.url;

    static _fieldDescriptors = {
        url: {
            default: '',

            updateAfter() {
                this._component._defineDom();
            },

            updateBefore() {
                this._valueSimple = this._valueSimple.trim();
            },
        },
    };


    static {
        this.init();
    }


    async _defineDom() {
        this._elements.root.textContent = '';

        if (!this.url) return;

        let url = HttpClient.createUrl(this.url);
        let html = await this.constructor._httpClient.fetchText(url);
        let dom = this.constructor.createDom(html);

        if (!dom) return;

        if (url.hash) {
            try {
                dom = dom.querySelector(url.hash);
            }
            catch {
                dom = null;
            }
        }

        if (!dom) return;

        this._elements.root.append(dom.cloneNode(true));
        this.dispatchEvent('defined');
    }
}
