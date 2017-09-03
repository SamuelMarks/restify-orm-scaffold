import { forEachOfLimit } from 'async';
import { NotFoundError } from 'custom-restify-errors';

import { Response } from 'supertest';

import { IUser, IUserBase } from '../api/user/models.d';
import { IAuthSdk } from './api/auth/auth_test_sdk.d';

interface IResponse extends Response {
    readonly body: ReadableStream | null | any | {access_token: string};
}

export const create_and_auth_users = (user_mocks_subset: IUserBase[], auth_sdk: IAuthSdk, done: MochaDone) => {
    // TODO: Build bulk API endpoints so this can be done efficiently.
    forEachOfLimit(user_mocks_subset, 1, (user: IUser, idx: number, callback) =>
        auth_sdk.register_login(user, (err, access_token: string) => {
            if (err != null) return callback(err);
            else if (access_token == null) return callback(new NotFoundError('AccessToken'));
            user.access_token = access_token;
            user_mocks_subset[idx] = user;
            return callback();
        }), done
    );
};
