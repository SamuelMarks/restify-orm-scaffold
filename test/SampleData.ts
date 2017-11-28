import { series } from 'async';
import { ClientRequest, IncomingMessage, request as http_request, RequestOptions } from 'http';
import { AccessTokenType, IncomingMessageError, TCallback, trivial_merge } from 'nodejs-utils';
import { HttpError } from 'restify-errors';
import * as url from 'url';
import { AsyncResultCallback, Connection, Query } from 'waterline';

import { _orms_out } from '../config';

export interface ISampleData {
    token: string;

    login(user: string, callback: TCallback<HttpError, string>);

    registerLogin(user: string, callback: TCallback<Error | IncomingMessageError | IncomingMessageF, string>);

    unregister(user: string, callback: TCallback<HttpError, string>);
}

type Callback = (res: IncomingMessageF) => void;
type Cb = (err: IncomingMessageF, res?: IncomingMessageF) => void;

export interface IncomingMessageF extends IncomingMessage {
    func_name: string;
}

const httpF = (method: 'POST' | 'PUT' | 'PATCH' | 'HEAD' | 'GET' | 'DELETE') => {
    return (options: RequestOptions,
            func_name: string,
            body_or_cb: string | Callback | Cb | AsyncResultCallback<{}>,
            callback?: Callback | Cb | AsyncResultCallback<{}>): ClientRequest => {
        if (callback == null) {
            callback = body_or_cb as Callback | Cb | AsyncResultCallback<{}>;
            body_or_cb = null;
        }

        options['method'] = method;

        if (body_or_cb != null)
            if (options == null)
                options = { headers: { 'Content-Length': Buffer.byteLength(body_or_cb as string) } };
            else if (options.headers == null)
                options.headers = { 'Content-Length': Buffer.byteLength(body_or_cb as string) };
            else if (options.headers['Content-Length'] == null)
                options.headers['Content-Length'] = Buffer.byteLength(body_or_cb as string);

        const req = http_request(options, (res: IncomingMessageF) => {
            res.func_name = func_name;
            if (res == null) return (callback as Cb)(res);
            /* tslint:disable:no-bitwise */
            else if ((res.statusCode / 100 | 0) > 3) return (callback as Cb)(res);
            return (callback as Cb)(void 0, res);
        });
        // body_or_cb ? req.end(<string>body_or_cb, cb) : req.end();
        /* tslint:disable:no-unused-expression */
        body_or_cb && req.write(body_or_cb);
        req.end();

        return req;
    };
};

const httpHEAD = httpF('HEAD');
const httpGET = httpF('GET');
const httpPOST = httpF('POST');
const httpPUT = httpF('PUT');
const httpPATCH = httpF('PATCH');
const httpDELETE = httpF('DELETE');

const zip = (a0: any[], a1: any[]) => a0.map((x, i) => [x, a1[i]]);

export class SampleData implements ISampleData {
    public token: string;
    private uri: url.Url;

    constructor(uri: string, connection: Connection[], collections: Query[]) {
        this.uri = url.parse(uri);
        _orms_out.orms_out.waterline.connection = connection;
        _orms_out.orms_out.waterline.collections = collections;
    }

    public login(user: string, callback: TCallback<HttpError, string>) {
        httpPOST(
            this.mergeOptions({ path: '/api/auth' }),
            'login', user, (err, res) => {
                if (err != null) return callback(err);
                else if (res.headers == null) return callback(new HttpError('HTTP request failed'));
                this.token = res.headers['x-access-token'];
                return callback(err, this.token);
            });
    }

    public logout(access_token: AccessTokenType, callback: TCallback<HttpError, string>) {
        const options = this.mergeOptions({ path: '/api/auth' });
        options.headers['x-access-token'] = access_token || this.token;
        httpDELETE(options, 'logout', (err, res) => {
            if (err != null) return callback(err);
            else if (res.headers == null) return callback(new HttpError('HTTP request failed'));
            delete this.token;
            return callback(err, this.token);
        });
    }

    public register(user: string, callback: TCallback<Error | IncomingMessageError, IncomingMessageF>) {
        httpPOST(
            this.mergeOptions({ path: '/api/user' }),
            'registerLogin', user, callback
        );
    }

    public registerLogin(user: string, callback: TCallback<Error | IncomingMessageError | IncomingMessageF, string>) {
        series([
            callb => this.register(user, callb),
            callb => this.login(user, callb as any),
        ], (err: Error, res: IncomingMessageF[]) => {
            if (err != null) return callback(err);
            else if (res[1].headers != null) this.token = res[1].headers['x-access-token'] as string;
            return callback(err, this.token);
        });
    }

    public unregister(user: string, callback) {
        const unregisterUser = (_user: string, callb) => httpDELETE(
            this.mergeOptions({ path: '/api/user' }),
            'unregister', _user, (error, result) => {
                if (error != null) return callb(error);
                else if (result.statusCode !== 204)
                    return callb(new Error(`Expected status code of 204 got ${result.statusCode}`));
                return callb(error, result.statusMessage);
            }
        );

        this.token ? unregisterUser(user, callback) : this.login(user, (err, access_token: AccessTokenType) =>
            err ? callback() : unregisterUser(user, callback)
        );
    }

    private mergeOptions(options, body?) {
        return trivial_merge({
            host: this.uri.host === `[::]:${this.uri.port}` ? 'localhost' :
                `${this.uri.host.substr(this.uri.host.lastIndexOf(this.uri.port) + this.uri.port.length)}`,
            port: parseInt(this.uri.port, 10),
            headers: trivial_merge({
                'Content-Type': 'application/json',
                'Content-Length': body ? Buffer.byteLength(body) : 0
            }, this.token ? { 'X-Access-Token': this.token } : {})
        }, options);
    }
}
