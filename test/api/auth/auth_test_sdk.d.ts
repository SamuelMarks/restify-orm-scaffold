import { HttpStrResp, IncomingMessageError, TCallback } from 'nodejs-utils';
import { Response } from 'supertest';

import { IUser, IUserBase } from '../../../api/user/models.d';

export interface IAuthSdk {
    register(user: IUserBase, callback: TCallback<Error | IncomingMessageError, Response>): void;

    login(user: IUserBase | IUser, callback: TCallback<Error | IncomingMessageError, Response>): void;

    get_user(access_token: string, user: IUser | IUserBase,
             callback: TCallback<Error | IncomingMessageError, Response>);

    get_all(access_token: string, callback: TCallback<Error | IncomingMessageError, Response>);

    logout(access_token: string, callback: HttpStrResp): void;

    unregister(ident: {access_token?: string, user_id?: string},
               callback: TCallback<Error | IncomingMessageError, Response>): void;

    unregister_all(users: Array<IUser | IUserBase>, done: TCallback<Error | IncomingMessageError, Response>);

    register_login(user: IUserBase, done: TCallback<Error | IncomingMessageError, string>);

    logout_unregister(user: IUserBase, done: TCallback<Error | IncomingMessageError, Response>);
}
