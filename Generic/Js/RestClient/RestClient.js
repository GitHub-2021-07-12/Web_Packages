import {HttpClient} from '/$/Packages/Generic/Js/HttpClient/HttpClient.js';


export class RestClient extends HttpClient {
    token = this.token || '';


    async call(method, ...args) {
        let fetchOpts = {
            body: JSON.stringify({
                args,
                method,
                token: this.token || undefined,
            }),
            method: 'post',
        };
        let responseData = await this.fetchJson(this.urlBasic, fetchOpts);

        if (responseData?.exception == 'verification') {
            this.token = '';
        }

        return responseData;
    }

    async logIn(name, password) {
        this.token = '';
        let responseData = await this.call('logIn', name, password);
        this.token = responseData?.result || '';
    }

    async logOut(all = false) {
        if (!this.token) return;

        await this.call('logOut', all);
        this.token = '';
    }

    async ping() {
        if (!this.token) return false;

        let responseData = await this.call('ping');
        let result = responseData?.result || false;

        if (!result) {
            this.token = '';
        }

        return result;
    }

    async register(name, password, data = {}) {
        this.token = '';
        let responseData = await this.call('register', name, password, data);
        this.token = responseData?.result || '';
    }
}
