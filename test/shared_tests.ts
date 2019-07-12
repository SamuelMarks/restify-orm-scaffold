import { forEachOfLimit } from 'async';
import { NotFoundError } from '@offscale/custom-restify-errors';
import { Response } from 'supertest';
import { AccessTokenType } from '@offscale/nodejs-utils/interfaces';

import { User } from '../api/user/models';
import { AuthTestSDK } from './api/auth/auth_test_sdk';
import { tearDownConnections as tearDownConns } from '@offscale/orm-mw';
import { _orms_out } from '../config';
import { IOrmsOut } from '@offscale/orm-mw/interfaces';
import { Server } from 'restify';
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

export function tearDownConnections(orms_out_or_done: Done | IOrmsOut, done?: Done) {
    return done == null ? tearDownConns(_orms_out.orms_out, e => (orms_out_or_done as Done)(e))
        : tearDownConns(orms_out_or_done as IOrmsOut, e => (done as Done)(e));
}

export function closeApp(app: Server) {
    return (done: Done) => app.close(() => done(void 0));
}

// after('closeApp', done => (app as Server).close(() => done(void 0)));
