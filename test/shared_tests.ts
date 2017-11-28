import { forEachOfLimit } from 'async';
import { NotFoundError } from 'custom-restify-errors';
import { Response } from 'supertest';
import { AccessTokenType } from 'nodejs-utils';

import { User } from '../api/user/models';
import { AuthTestSDK } from './api/auth/auth_test_sdk';

interface IResponse extends Response {
    readonly body: ReadableStream | null | any | {access_token: string};
}

export const create_and_auth_users = (user_mocks_subset: User[], auth_sdk: AuthTestSDK, done: MochaDone) => {
    // TODO: Build bulk API endpoints so this can be done efficiently.
    forEachOfLimit(user_mocks_subset, 1, (user: User, idx: number, callback) =>
        auth_sdk.register_login(user, (err, access_token: AccessTokenType) => {
            if (err != null) return callback(err);
            else if (access_token == null) return callback(new NotFoundError('AccessToken'));
            user.access_token = access_token;
            user_mocks_subset[idx] = user;
            return callback();
        }), done
    );
};
