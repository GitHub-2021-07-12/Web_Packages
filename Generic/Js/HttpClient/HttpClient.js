import {Executor} from '/Packages/Generic/Js/Executor/Executor.js';
import {ExternalPromise} from '/Packages/Generic/Js/ExternalPromise/ExternalPromise.js';
import {ObjectManager} from '/Packages/Generic/Js/ObjectManager/ObjectManager.js';


export class HttpClient {
    static createUrl(url, urlBasic = '') {
        urlBasic ? urlBasic = new Request(urlBasic).url : url = new Request(url).url;

        return new URL(url, urlBasic || undefined);
    }


    __fast = true;
    __urlBasic = '';


    _promiseConcurrencyMethodName = 'race';
    _responsePromises = new Set();
    _responseRetriedPromises = new Set();


    parallelRequestsCountMax = 10;
    requestRetriesCountMax = 0;
    requestRetryCondition = null;
    requestRetryDelay = 1e3;


    get fast() {
        return this.__fast;
    }
    set fast(fast) {
        this.__fast = fast;
        this._promiseConcurrencyMethodName = this.fast ? 'race' : 'allSettled';
    }

    get urlBasic() {
        return this.__urlBasic;
    }
    set urlBasic(urlBasic) {
        this.__urlBasic = new Request(urlBasic).url;
    }


    async fetch(url, opts = null) {
        url = this.constructor.createUrl(url, this.urlBasic) + '';

        while (this._responsePromises.size >= this.parallelRequestsCountMax) {
            await Promise[this._promiseConcurrencyMethodName](this._responsePromises);
        }

        let requestRetriesCount = 0;
        let response = null;
        let responsePromise = new ExternalPromise();
        let responseRetriedPromise = null;
        this._responsePromises.add(responsePromise);

        do {
            if (requestRetriesCount) {
                if (!responseRetriedPromise) {
                    responseRetriedPromise = new ExternalPromise();
                    this._responseRetriedPromises.add(responseRetriedPromise);
                }

                await Executor.delay(this.requestRetryDelay);
            }

            response = await fetch(url, opts).catch(() => null);
        }
        while (
            requestRetriesCount++ < this.requestRetriesCountMax
            && (!response || this.requestRetryCondition?.(response))
        )

        if (responseRetriedPromise) {
            responseRetriedPromise.fulfill();
            this._responseRetriedPromises.delete(responseRetriedPromise);
        }

        await Promise.allSettled(this._responseRetriedPromises);
        responsePromise.fulfill();
        this._responsePromises.delete(responsePromise);

        return response;
    }

    async fetchJson(url, opts = null) {
        let response = await this.fetch(url, opts);
        let responseData = response?.ok && await response.json().catch(() => null) || null;

        return responseData;
    }

    async fetchText(url, opts = null) {
        let response = await this.fetch(url, opts);
        let responseData = response?.ok && await response.text().catch(() => null) || null;

        return responseData;
    }

    init({
        fast = undefined,
        parallelRequestsCountMax = undefined,
        requestRetriesCountMax = undefined,
        requestRetryCondition = undefined,
        requestRetryDelay = undefined,
        urlBasic = undefined,
    } = {}) {
        ObjectManager.assignProps(
            this,
            {
                fast,
                parallelRequestsCountMax,
                requestRetriesCountMax,
                requestRetryCondition,
                requestRetryDelay,
                urlBasic,
            },
        );

        return this;
    }
}
