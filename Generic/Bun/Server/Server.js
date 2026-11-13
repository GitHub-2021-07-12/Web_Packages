import * as PathManager from 'path';

import {ObjectManager} from '/$/Packages/Generic/Js/ObjectManager/ObjectManager.js';


export class Server {
    static _appDirAlias = '@';
    static _appDirAliasRegExp = null;
    static _rootDirAlias = '$';
    static _rootDirAliasRegExp = null;
    static _routeRest = '/rest/';
    static _routeRestProtected = '/rest/protected/';
    static _tlsCert = null;
    static _tlsDir = '';
    static _tlsKey = null;


    static init() {
        this._appDirAliasRegExp = new RegExp(`.*?[${this._appDirAlias}]/`);
        this._rootDirAliasRegExp = new RegExp(`.*?[${this._rootDirAlias}]/`);

        let tlsCert = Bun.file(`${this._tlsDir}/fullchain.pem`);
        let tlsKey = Bun.file(`${this._tlsDir}/privkey.pem`);
        this._tlsCert = tlsCert.size ? tlsCert : null;
        this._tlsKey = tlsKey.size ? tlsKey : null;
    }


    static {
        this.init();
    }


    _appDir = '';
    _dirCache = false;
    _dirs = {};
    _entryFile = null;
    _entryPath = '';
    _errorFile = null;
    _errorPath = '';
    _port = null;
    _responseEntry = null;
    _responseError = null;
    _restMethods = {};
    _restMethodsProtected = {};
    _rootDir = '';
    _routesEntry = [];
    _routesError = [];
    _server = null;


    async _callRestMethod(request) {
        let method = this._restMethods[request.params.method];
        let responseBody = {};

        if (method) {
            let args = [];

            try {
                args = request.body ? await request.body.json() : Bun.JSON5.parse(request.params.args);
            }
            catch {}

            try {
                responseBody.result = await method.apply(this, args);
            }
            catch (error) {
                responseBody.error = error?.message ?? error;
            }
        }
        else {
            responseBody.error = 'method';
        }

        request.cookies.set({
            expires: new Date('2027-06-01 00:00:00'),
            httpOnly: true,
            // maxAge: 1e8,
            name: request.params.method,
            path: this.constructor._routeRest,
            value: 1,
        });

        return Response.json(responseBody);
    }

    async _callRestMethodProtected(request) {
        let method = this._restMethodsProtected[request.params.method];
        let responseBody = {};

        if (method) {
            let args = [];

            try {
                args = request.body ? await request.body.json() : Bun.JSON5.parse(request.params.args);
            }
            catch {}

            try {
                responseBody.result = await method.apply(this, args);
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


    init({
        appDir = undefined,
        dirCache = undefined,
        dirs = undefined,
        entryPath = undefined,
        errorPath = undefined,
        port = undefined,
        restMethods = undefined,
        restMethodsProtected = undefined,
        rootDir = undefined,
        routesEntry = undefined,
        routesError = undefined,
    } = {}) {
        ObjectManager.assignProps(
            this,
            {
                _appDir: appDir,
                _dirCache: dirCache,
                _dirs: dirs,
                _entryPath: entryPath,
                _errorPath: errorPath,
                _port: port,
                _restMethods: restMethods,
                _restMethodsProtected: restMethodsProtected,
                _rootDir: rootDir,
                _routesEntry: routesEntry,
                _routesError: routesError,
            },
        );

        this._appDir = this.resolvePath(this._appDir);
        this._rootDir = this.resolvePath(this._rootDir);
        this._responseEntry = new Response(Bun.file(this.resolvePath(this._entryPath)));
        this._responseError = new Response(Bun.file(this.resolvePath(this._errorPath)));

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

    run() {
        if (this._server) return;

        let callRestMethod = this._callRestMethod.bind(this);
        let callRestMethodProtected = this._callRestMethodProtected.bind(this);
        let dirs = {
            ...this._dirs,
            [`/${this.constructor._appDirAlias}/*`]: this._appDir,
            [`/${this.constructor._rootDirAlias}/*`]: this._rootDir,
        };
        let routes = {};
        let routesEntry = [...this._routesEntry || [], '/'];
        let routesError = [...this._routesError || [], '/*'];

        for (let k in dirs) {
            routes[k] = {
                dir: this.resolvePath(dirs[k]),
                statCache: this._dirCache,
            };
        }

        for (let routeEntry of routesEntry) {
            // routes[this.normalizePath(routeEntry)] = this._responseEntry;
            routes[this.normalizePath(routeEntry)] = (request) => {
                return request.url.includes('//www.') ? Response.redirect(this._server.url.origin, 301) : this._responseEntry.clone();
            };
        }

        for (let routeError of routesError) {
            routes[this.normalizePath(routeError)] = this._responseError;
        }

        this._server = Bun.serve({
            development: false,
            port: this._port,

            routes: {
                ...routes,
                [this.normalizePath(`${this.constructor._routeRest}/:method`)]: callRestMethod,
                [this.normalizePath(`${this.constructor._routeRest}/:method/:args`)]: callRestMethod,
                [this.normalizePath(`${this.constructor._routeRestProtected}/:method`)]: callRestMethodProtected,
                [this.normalizePath(`${this.constructor._routeRestProtected}/:method/:args`)]: callRestMethodProtected,
            },

            tls: {
                cert: this.constructor._tlsCert,
                key: this.constructor._tlsKey,
            },

            websocket: {
                idleTimeout: 0,
                // maxPayloadLength: 1,
                // perMessageDeflate: true,
                publishToSelf: true,
                sendPings: false,

                close(webSocket, code, reason) {
                    log(`Close: ${webSocket.data}, ${server.subscriberCount('chat')}, ${code}, ${reason}`);
                },

                message(webSocket, message) {
                    log(`${webSocket.data}: ${message}`);

                    webSocket.publish('chat', `${webSocket.data}: ${message}`);
                },

                open(webSocket) {
                    webSocket.subscribe('chat');
                    webSocket.publish('chat', `Open: ${webSocket.data}`);

                    log(`Open: ${webSocket.data}, ${server.subscriberCount('chat')}`);
                },

                ping(webSocket) {
                    log(`Ping: ${webSocket.data}`);
                },

                pong(webSocket) {
                    log(`Pong: ${webSocket.data}`);
                },
            },
        });

        console.log(`Server.run: ${this._server.url}`);
    }

    async stop() {
        await this._server.stop(true);
        this._server = null;

        console.log('Server.stop');
    }
};
