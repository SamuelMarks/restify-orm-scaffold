import { ClientRequest, IncomingMessage, request as http_request, RequestOptions } from 'http';
import { ServerResponse } from "node:http";
import * as url from 'url';

import { HttpError } from 'restify-errors';
import { AsyncResultCallback, Connection, Query } from 'waterline';

import { trivial_merge } from '@offscale/nodejs-utils';
import { AccessTokenType, IncomingMessageError, TCallback } from '@offscale/nodejs-utils/interfaces';

import { _orms_out } from '../config';

type TCallbackHttp = TCallback<Error | IncomingMessageError | IIncomingMessageF, string>;

export interface ISampleData {
    token: string;

    /*login(user: string, callback: TCallbackHttp): void;

    registerLogin(user: string, callback: TCallbackHttp): void;

    unregister(user: string, callback: TCallbackHttp): void;*/
}

type Callback = (res: IIncomingMessageF) => void;
type Cb = (err?: IIncomingMessageF, res?: IIncomingMessageF) => void;

export interface IIncomingMessageF extends IncomingMessage {
    func_name: string;
}

const httpF = (method: 'POST' | 'PUT' | 'PATCH' | 'HEAD' | 'GET' | 'DELETE') =>
    (options: RequestOptions,
     func_name: string,
     body_or_cb: string | Callback | Cb | AsyncResultCallback<{}> | undefined,
     callback?: Callback
         | Cb
         | AsyncResultCallback<{}>
         | ((err: Error | IncomingMessageError | IIncomingMessageF | undefined,
             res: IIncomingMessageF[] | undefined) => void | AccessTokenType)
         | ((error?: Error | HttpError, result?: ServerResponse) => void)): ClientRequest => {
        if (callback == null) {
            callback = body_or_cb as Callback | Cb | AsyncResultCallback<{}>;
            body_or_cb = void 0;
        }

        options['method'] = method;

        if (body_or_cb != null)
            if (options == null)
                options = { headers: { 'Content-Length': Buffer.byteLength(body_or_cb as string) } };
            else if (options.headers == null)
                options.headers = { 'Content-Length': Buffer.byteLength(body_or_cb as string) };
            else if (options.headers['Content-Length'] == null)
                options.headers['Content-Length'] = Buffer.byteLength(body_or_cb as string);

        const req = http_request(options, (result) => {
            const res: IIncomingMessageF = result as IIncomingMessageF;
            if (res == null) return (callback as Cb)(res);
            res.func_name = func_name;
            /* tslint:disable:no-bitwise */
            if ((res.statusCode! / 100 | 0) > 3) return (callback as Cb)(res);
            return (callback as Cb)(void 0, res);
        });
        // body_or_cb ? req.end(<string>body_or_cb, cb) : req.end();
        /* tslint:disable:no-unused-expression */
        body_or_cb && req.write(body_or_cb);
        req.end();

        return req;
    };

const httpHEAD = httpF('HEAD');
const httpGET = httpF('GET');
const httpPOST = httpF('POST');
const httpPUT = httpF('PUT');
const httpPATCH = httpF('PATCH');
const httpDELETE = httpF('DELETE');

const zip = (a0: any[], a1: any[]) => a0.map((x, i) => [x, a1[i]]);

export class SampleData implements ISampleData {
    public token!: AccessTokenType;
    private uri: url.URL;

    constructor(uri: string, connection: Connection[], collections: Query[]) {
        this.uri = new url.URL(uri);
        _orms_out.orms_out.waterline!.connection = connection;
        _orms_out.orms_out.waterline!.collections = collections;
    }

    public login(user: string, callback: TCallback<HttpError, AccessTokenType>): void {
        httpPOST(
            this.mergeOptions({ path: '/api/auth' }),
            'login', user, (err: Error | IncomingMessageError | IIncomingMessageF, res?: IncomingMessage): void | AccessTokenType => {
                if (err != null) return callback(err as HttpError);
                else if (res!.headers == null) return callback(new HttpError('HTTP request failed'));
                this.token = res!.headers['x-access-token'] as string;
                return callback(err, this.token);
            });
    }

    public logout(access_token: AccessTokenType, callback: TCallback<Error | IncomingMessageError | IIncomingMessageF, AccessTokenType>): void {
        const options: Partial<IncomingMessage> = this.mergeOptions({ path: '/api/auth' });
        options.headers!['x-access-token'] = access_token || this.token;
        httpDELETE(options, 'logout', (err: Error | IncomingMessageError | IIncomingMessageF, res?: IncomingMessage): void | AccessTokenType => {
            if (err != null) return callback(err);
            else if (res!.headers == null) return callback(new HttpError('HTTP request failed'));
            delete (this as { token?: string }).token;
            return callback(err, this.token);
        });
    }

    public register(user: string, callback: ((err: Error | IncomingMessageError | IIncomingMessageF | undefined,
                                              res: IIncomingMessageF[] | undefined) => void | AccessTokenType)): void {
        httpPOST(
            this.mergeOptions({ path: '/api/user' }),
            'registerLogin', user, callback
        );
    }

    public registerLogin(user: string, callback: ((err: Error | IncomingMessageError | IIncomingMessageF | undefined,
                                                   res?: IIncomingMessageF[]) => void | AccessTokenType)): void {
        const setToken = (res: Array<IIncomingMessageF>): true => {
            if (res[1].headers != null) this.token = res[1].headers['x-access-token'] as string;
            return true;
        };

        this.register(user, (err, res): void | AccessTokenType => {
            if (err == null) return setToken(res!) && callback(void 0, this.token as unknown as any);
            return this.login(user, (e, r): void | AccessTokenType => {
                if (e != null) return callback(e);
                return setToken(res!) && callback(void 0, this.token as unknown as any);
            });
        });
    }

    public unregister(user: string, callback: TCallback<Error | IncomingMessageError | IIncomingMessageF, string>): void {
        const unregisterUser = (_user: string, callb: (error?: Error | HttpError, result?: string) => void) => httpDELETE(
            this.mergeOptions({ path: '/api/user' }),
            'unregister', _user,
            (error?: Error | HttpError, result?: ServerResponse): void => {
                if (error != null) return callb(error);
                else if (result!.statusCode !== 204)
                    return callb(new Error(`Expected status code of 204 got ${result!.statusCode}`));
                return callb(error, result!.statusMessage);
            }
        );

        this.token ? unregisterUser(user, callback)
            : this.login(user, (err?, _access_token?: AccessTokenType) => {
                    if (err)
                        return callback()
                    else return unregisterUser(user, callback) as any;
                }
            );
    }

    private mergeOptions(options: object, body?: string | NodeJS.ArrayBufferView | ArrayBuffer | SharedArrayBuffer): {
        host: string,
        port: number,
        headers: {}
    } & {} {
        return trivial_merge({
            host: this.uri.host === `[::]:${this.uri.port}` ? 'localhost' :
                `${this.uri.host!.substring(this.uri.host!.lastIndexOf(this.uri.port!) + this.uri.port!.length)}`,
            port: parseInt(this.uri.port!, 10),
            headers: trivial_merge({
                'Content-Type': 'application/json',
                'Content-Length': body ? Buffer.byteLength(body) : 0
            }, this.token ? { 'X-Access-Token': this.token } : {})
        }, options);
    }
}
