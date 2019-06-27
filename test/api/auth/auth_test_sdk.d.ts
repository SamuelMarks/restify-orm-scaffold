import { Server } from 'restify';
import * as supertest from 'supertest';
import { Response } from 'supertest';
import { IncomingMessageError, TCallback } from '@offscale/nodejs-utils/interfaces';
import { User } from '../../../api/user/models';
export declare class AuthTestSDK {
    app: Server;
    private user_sdk;
    constructor(app: Server);
    login(user: User, callback: TCallback<Error | IncomingMessageError, Response>): void | supertest.Response;
    unregister_all(users: User[], callback: TCallback<Error | IncomingMessageError, Response>): void;
    register_login(user: User, num_or_done: number | TCallback<Error | IncomingMessageError, string>, callback?: TCallback<Error | IncomingMessageError, string>): void;
    logout_unregister(user: User, num_or_done: number | TCallback<Error | IncomingMessageError, Response>, callback?: TCallback<Error | IncomingMessageError, Response>): void | supertest.Response;
}
