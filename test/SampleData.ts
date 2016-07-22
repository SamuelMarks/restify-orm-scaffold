import {series} from 'async';
import {RequestOptions, IncomingMessage, ClientRequest, request as http_request} from 'http';
import * as url from 'url';
import {trivial_merge} from 'nodejs-utils';
import {HttpError} from 'restify';
import {user_mocks} from './api/user/user_mocks';

export interface ISampleData {
    token: string;
    userMocks: Array<any>;
    login(cb);
    registerLogin(cb);
    unregister(cb);
}

interface callback {
    (res: IncomingMessageF): void;
}

interface cb {
    (err: IncomingMessageF, res?: IncomingMessageF): void;
}

export interface IncomingMessageF extends IncomingMessage {
    func_name: string;
}

function httpF(method: 'POST'|'PUT'|'PATCH'|'HEAD'|'GET'|'DELETE') {
    return (options: RequestOptions,
            func_name: string,
            body_or_cb: string|callback|cb|AsyncResultCallback<{}>,
            cb?: callback|cb|AsyncResultCallback<{}>): ClientRequest => {
        if (!cb) {
            cb = <callback|cb|AsyncResultCallback<{}>>body_or_cb;
            body_or_cb = null;
        }

        options['method'] = method;

        if (body_or_cb)
            if (!options)
                options = {'headers': {'Content-Length': Buffer.byteLength(<string>body_or_cb)}};
            else if (!options.headers)
                options.headers = {'Content-Length': Buffer.byteLength(<string>body_or_cb)};
            else if (!options.headers['Content-Length'])
                options.headers['Content-Length'] = Buffer.byteLength(<string>body_or_cb);

        const req = http_request(options, (res: IncomingMessageF) => {
            res.func_name = func_name;
            if (!res) return (<cb>cb)(res);
            else if ((res.statusCode / 100 | 0) > 3) return (<cb>cb)(res);
            return (<cb>cb)(null, res);
        });
        //body_or_cb ? req.end(<string>body_or_cb, cb) : req.end();
        body_or_cb && req.write(body_or_cb);
        req.end();

        return req;
    }
}

const httpHEAD = httpF('HEAD'),
    httpGET = httpF('GET'),
    httpPOST = httpF('POST'),
    httpPUT = httpF('PUT'),
    httpPATCH = httpF('PATCH'),
    httpDELETE = httpF('DELETE');

export class SampleData {
    public userMocks = user_mocks.successes;
    public token: string;
    private uri: url.Url;

    constructor(uri: string) {
        this.uri = url.parse(uri);
    }

    private mergeOptions(options, body?) {
        return trivial_merge({
            host: this.uri.host === `[::]:${this.uri.port}` ? 'localhost' :
                `${this.uri.host.substr(this.uri.host.lastIndexOf(this.uri.port) + this.uri.port.length)}`,
            port: parseInt(this.uri.port),
            headers: trivial_merge({
                'Content-Type': 'application/json',
                'Content-Length': body ? Buffer.byteLength(body) : 0
            }, this.token ? {'X-Access-Token': this.token} : {})
        }, options)
    }

    login(cb) {
        const body = JSON.stringify(this.userMocks[0]);
        httpPOST(
            this.mergeOptions({path: '/api/auth'}),
            'login::auth', body, (err, res) => {
                if (err) return cb(err);
                else if (!res.headers) return cb(new HttpError('HTTP request failed'));
                this.token = res.headers['x-access-token'];
                return cb(err, this.token);
            });
    }

    registerLogin(cb) {
        const body = JSON.stringify(this.userMocks[0]);
        series([
            callback => httpPOST(
                this.mergeOptions({path: '/api/user'}),
                'registerLogin::user', body, () => callback()
            ),
            callback => this.login(callback),
        ], (err, res: Array<IncomingMessageF>) => {
            if (err) return cb(err);
            else if (res[1].headers) this.token = res[1].headers['x-access-token'];
            return cb(err, this.token);
        });
    }

    unregister(cb) {
        const body = JSON.stringify(this.userMocks[0]);

        const unregisterUser = () => httpDELETE(
            this.mergeOptions({path: '/api/user'}),
            'unregister::user', body, (error, result) => {
                if (error) return cb(error);
                else if (result.statusCode !== 204)
                    return cb(new Error(`Expected status code of 204 got ${result.statusCode}`));
                return cb(error, result.statusMessage);
            }
        );

        this.token ? unregisterUser() : this.login((err, access_token: string) =>
            err ? cb() : unregisterUser()
        );
    }
}
