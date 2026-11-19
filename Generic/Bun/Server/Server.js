import * as PathManager from 'path';

import {ObjectManager} from '/$/Packages/Generic/Js/ObjectManager/ObjectManager.js';


export class Server {
    static _appDirAlias = '@';
    static _appDirAliasRegExp = null;
    static _rootDirAlias = '$';
    static _rootDirAliasRegExp = null;
    static _routeRest = '/rest/';
    static _routeWebSocket = '/ws';
    static _tlsDescriptor = null;
    static _tlsDir = '';
    static _tlsPort = 443;

    static _responses = {
        empty: new Response(),
        error: new Response(null, {status: 500}),
        notModified: new Response(null, {status: 304}),
    };


    static init() {
        this._appDirAliasRegExp = new RegExp(`.*?[${this._appDirAlias}]/`);
        this._rootDirAliasRegExp = new RegExp(`.*?[${this._rootDirAlias}]/`);

        let tlsCert = Bun.file(`${this._tlsDir}/fullchain.pem`);
        let tlsKey = Bun.file(`${this._tlsDir}/privkey.pem`);
        this._tlsDescriptor = {
            cert: tlsCert.size ? tlsCert : null,
            key: tlsKey.size ? tlsKey : null,
        };
    }


    static {
        this.init();
    }


    _appDir = '';
    _dirCache = false;
    _pathEntry = '';
    _pathError = '';
    _port = null;
    _restMethods = {};
    _rootDir = '';
    _routes = {};
    _server = null;
    _webSocketHandler = null;

    _routeDescriptors = {
        detailed: {},
        dir: {},
        empty: [],
        entry: [],
        error: [],
    };


    async _callRestMethod(request) {
        let method = this._restMethods?.[request.params.scope]?.[request.params.method];
        let responseBody = {};

        if (method) {
            let args = [];

            try {
                args = request.body ? await request.body.json() : Bun.JSON5.parse(request.params.args);
            }
            catch {}

            try {
                responseBody.result = await method.call(this, args, request);
            }
            catch (error) {
                responseBody.error = error?.message ?? error;
            }
        }
        else {
            responseBody.error = 'method';
        }

        return Response.json(responseBody);
    }

    _createRoutes() {
        let callRestMethod = this._callRestMethod.bind(this);
        let routesDir = {
            ...this._routeDescriptors.dir,
            [`/${this.constructor._appDirAlias}/*`]: this._appDir,
            [`/${this.constructor._rootDirAlias}/*`]: this._rootDir,
        };
        let routesEntry = [...this._routeDescriptors.entry || [], '/'];
        let routesError = [...this._routeDescriptors.error || [], '/*'];
        let sendResponseEntry = this._sendResponse.bind(this, this._pathEntry);
        let sendResponseError = this._sendResponse.bind(this, this._pathError);

        this._routes = {
            [this.normalizePath(`${this.constructor._routeRest}/:scope/:method`)]: callRestMethod,
            [this.normalizePath(`${this.constructor._routeRest}/:scope/:method/:args`)]: callRestMethod,
            [this.normalizePath(this.constructor._routeWebSocket)]: this._upgradeWebSocket.bind(this),
        };

        for (let k in routesDir) {
            this._routes[k] = {
                dir: this.resolvePath(routesDir[k]),
                statCache: this._dirCache,
            };
        }

        for (let routeEmpty of this._routeDescriptors.empty || []) {
            this._routes[this.normalizePath(routeEmpty)] = this.constructor._responses.empty;
        }

        for (let routeEntry of routesEntry) {
            this._routes[this.normalizePath(routeEntry)] = sendResponseEntry;
        }

        for (let routeError of routesError) {
            this._routes[this.normalizePath(routeError)] = sendResponseError;
        }

        // Object.assign(this._routes, this._routeDescriptors.detailed);

        for (let k in this._routeDescriptors.detailed) {
            let prop = this._routeDescriptors.detailed[k];
            this._routes[k] = prop instanceof Function ? prop.bind(this) : prop;
        }
    }

    _normalizeWebSocketHandler() {
        for (let k in this._webSocketHandler) {
            let prop = this._webSocketHandler[k];

            if (prop instanceof Function) {
                this._webSocketHandler[k] = prop.bind(this);
            }
        }
    }

    _sendResponse(path, request) {
        if (request.url.includes('//www.')) {
            return Response.redirect(request.url.replace('//www.', '//'), 301);
        }
        else {
            let file = Bun.file(path);
            let response = file.lastModified == request.headers.get('if-none-match')
                ? this.constructor._responses.notModified.clone()
                : new Response(file, {headers: {'etag': file.lastModified}})
            ;

            return response;
        }
    }

    _upgradeWebSocket(request) {
        let upgraded = this._server.upgrade(request, {data: {token: request.cookies.get('token')}});

        return upgraded ? null : this.constructor._responses.error.clone();
    }


    init({
        appDir = undefined,
        dirCache = undefined,
        pathEntry = undefined,
        pathError = undefined,
        port = undefined,
        restMethods = undefined,
        rootDir = undefined,
        routeDescriptors = undefined,
    } = {}) {
        ObjectManager.assignProps(
            this,
            {
                _appDir: appDir,
                _dirCache: dirCache,
                _pathEntry: pathEntry,
                _pathError: pathError,
                _port: port,
                _restMethods: restMethods,
                _rootDir: rootDir,
                _routeDescriptors: routeDescriptors,
            },
        );

        this._appDir = this.resolvePath(this._appDir);
        this._rootDir = this.resolvePath(this._rootDir);
        this._pathEntry = this.resolvePath(this._pathEntry);
        this._pathError = this.resolvePath(this._pathError);
        this._createRoutes();
        this._normalizeWebSocketHandler();

        return this;
    }

    normalizePath(path) {
        return PathManager.normalize(path).replaceAll('\\', '/');
    }

    resolvePath(path) {
        path = path
            .replace(this.constructor._appDirAliasRegExp, `${this._appDir}/`)
            .replace(this.constructor._rootDirAliasRegExp, `${this._rootDir}/`)
        ;

        return this.normalizePath(PathManager.resolve(path));
    }

    async run() {
        if (this._server) return;

        if (!this._port) {
            let server = Bun.serve({routes: {'/': this.constructor._responses.empty}});
            this._port = server.port;
            await server.stop(true);
        }

        this._server = Bun.serve({
            development: false,
            port: this._port,
            routes: this._routes,
            tls: this._port == this.constructor._tlsPort ? this.constructor._tlsDescriptor : null,
            websocket: this._webSocketHandler,
        });

        console.log(`Server.run: ${this._server.url}`);
    }

    async stop() {
        await this._server.stop(true);
        this._server = null;

        console.log('Server.stop');
    }
};
