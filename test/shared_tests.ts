import { Connection } from 'waterline';
import { forEachOfLimit, parallel } from 'async';
import { NotFoundError } from 'restify-errors';
import { IUser, IUserBase } from '../api/user/models.d';
import { IAuthSdk } from './api/auth/auth_test_sdk.d';
import { IncomingMessageError } from './share_interfaces';

export const tearDownConnections = (connections: Connection[], cb) => {
    return connections ? parallel(Object.keys(connections).map(
        connection => connections[connection]._adapter.teardown
    ), () => {
        Object.keys(connections).forEach(connection => {
            if (['sails-tingo', 'waterline-nedb'].indexOf(connections[connection]._adapter.identity) < 0)
                connections[connection]._adapter.connections.delete(connection);
        });
        cb();
    }) : cb();
};

interface IResponse extends Response {
    readonly body: ReadableStream | null | any | { access_token: string };
}

export const create_and_auth_users = (user_mocks_subset: IUserBase[], auth_sdk: IAuthSdk, done: MochaDone) => {
    forEachOfLimit(user_mocks_subset, 1, (user: IUser, idx: number, callback) =>
        auth_sdk.register_login(user, (err, access_token: string) => {
            if (err) return callback(err);
            else if (!access_token) return callback(new NotFoundError('AccessToken'));
            user['access_token'] = access_token;
            user_mocks_subset[idx] = user;
            return callback();
        }), done
    );
};

export const getError = (err: IncomingMessageError) =>
    err && err.body && err.body.error_message ?
        JSON.parse(err.body.error_message) : err;
