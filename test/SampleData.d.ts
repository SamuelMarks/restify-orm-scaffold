/// <reference types="node" />
import { IncomingMessage } from 'http';
import { HttpError } from 'restify-errors';
import { Connection, Query } from 'waterline';
import { AccessTokenType, IncomingMessageError, TCallback } from '@offscale/nodejs-utils/interfaces';
export interface ISampleData {
    token: string;
    login(user: string, callback: TCallback<HttpError, string>): any;
    registerLogin(user: string, callback: TCallback<Error | IncomingMessageError | IIncomingMessageF, string>): any;
    unregister(user: string, callback: TCallback<HttpError, string>): any;
}
export interface IIncomingMessageF extends IncomingMessage {
    func_name: string;
}
export declare class SampleData implements ISampleData {
    token: AccessTokenType;
    private uri;
    constructor(uri: string, connection: Connection[], collections: Query[]);
    login(user: string, callback: TCallback<HttpError, string>): void;
    logout(access_token: AccessTokenType, callback: TCallback<HttpError, string>): void;
    register(user: string, callback: (err: Error, response: any) => void): void;
    registerLogin(user: string, callback: TCallback<Error | IncomingMessageError | IIncomingMessageF, string>): void;
    unregister(user: string, callback: any): void;
    private mergeOptions;
}
