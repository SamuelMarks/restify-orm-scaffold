import { forEachOfLimit } from 'async';
import { Response } from 'supertest';
import { Server } from 'restify';

import { NotFoundError } from '@offscale/custom-restify-errors';
import { AccessTokenType } from '@offscale/nodejs-utils/interfaces';
import { tearDownConnections as tearDownConns } from '@offscale/orm-mw';
import { IOrmsOut } from '@offscale/orm-mw/interfaces';

import { User } from '../api/user/models';
import { AuthTestSDK } from './api/auth/auth_test_sdk';
import { _orms_out } from '../config';
import Done = Mocha.Done;

interface IResponse extends Response {
    readonly body: ReadableStream | null | any | {access_token: string};
}

export const create_and_auth_users = (user_mocks_subset: User[], auth_sdk: AuthTestSDK, done: MochaDone) => {
    // TODO: Build bulk API endpoints so this can be done efficiently.
    forEachOfLimit(user_mocks_subset, 1, (user: User, idx: number | string, callback) =>
        auth_sdk.register_login(user)
            .then((access_token: AccessTokenType) => {
                if (access_token == null) return callback(new NotFoundError('AccessToken'));
                user.access_token = access_token;
                user_mocks_subset[idx] = user;
                return callback();
            })
            .catch(callback), done
    );
};

export async function unregister_all(auth_sdk: AuthTestSDK, mocks: User[]) {
    try {
        await auth_sdk.unregister_all(mocks);
    } catch {
        //
    }
}

export const tearDownConnections = (orms_out_or_done: Done | IOrmsOut, done?: Done) =>
    done == null ? tearDownConns(_orms_out.orms_out, e => (orms_out_or_done as Done)(e))
        : tearDownConns(orms_out_or_done as IOrmsOut, e => (done as Done)(e));

export const closeApp = (app: Server) => (done: Done) =>
    app.close(() => done(void 0));

// after('closeApp', done => (app as Server).close(() => done(void 0)));

export interface IError {
    code: string;
    error: string;
    error_message: string;
}

export const exceptionToError = (error: any): IError => {
    const hasJseInfo = (e: {jse_info: IError}) => ({
        code: e.jse_info.code,
        error: e.jse_info.error,
        error_message: e.jse_info.error_message
    });

    if (error.jse_info) return hasJseInfo(error);
    else if (error.text)
        try {
            return hasJseInfo({ jse_info: JSON.parse(error.text) });
        } catch (e) {
            return {
                code: 'UnknownError',
                error: 'UnknownError',
                error_message: error.text
            };
        }
    else throw TypeError(`Unable to parse out IError object from input: ${error}`);
};
