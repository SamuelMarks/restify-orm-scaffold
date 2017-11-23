import { IncomingMessageError, TCallback } from 'nodejs-utils';
import { Server } from 'restify';
import { Response } from 'supertest';

import { User } from '../../../api/user/models';

export interface IAuthSdk {
    app: Server;

    register(user: User, callback: TCallback<Error | IncomingMessageError, Response>): void;

    login(user: User, callback: TCallback<Error | IncomingMessageError, Response>): void;

    get_user(access_token: string, user: User, callback: TCallback<Error | IncomingMessageError, Response>);

    get_all(access_token: string, callback: TCallback<Error | IncomingMessageError, Response>);

    // logout(access_token: string, callback: HttpStrResp): void;

    unregister(ident: {access_token?: string, user_id?: string},
               callback: TCallback<Error | IncomingMessageError, Response>): void;

    unregister_all(users: User[], done: TCallback<Error | IncomingMessageError, Response>);

    register_login(user: User, done: TCallback<Error | IncomingMessageError, string>);

    logout_unregister(user: User, done: TCallback<Error | IncomingMessageError, Response>);
}
