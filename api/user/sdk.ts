import { waterfall } from 'async';
import { fmtError, NotFoundError } from 'custom-restify-errors';
import { TCallback } from 'nodejs-utils';
import { Query, WLError } from 'waterline';

import { c } from '../../main';
import { AccessToken } from '../auth/models';
import { IUser, IUserBase } from './models.d';

export interface IPostUser {
    access_token: string;
    user: IUser;
}

export const post = (user: IUserBase, callback: TCallback<Error, IPostUser>): void => {
    const User: Query = c.collections['user_tbl'];

    waterfall([
            cb => User.create(user).exec((error: WLError, _user: IUser) => {
                if (error != null) return cb(error);
                else if (_user == null) return cb(new NotFoundError('User'));
                return cb(null, _user);
            }),
            (_user, cb) =>
                AccessToken.get().add(_user.email, _user.roles, 'login', (err: Error, access_token: string) =>
                    err != null ? cb(err) : cb(null, { access_token, user: _user })
                )
        ], (error: Error | WLError, result: IPostUser) => {
            if (error != null)
                return callback(fmtError(error));
            else if (result == null)
                return callback(new NotFoundError('User|AccessToken'));
            else if (result.user == null)
                return callback(new NotFoundError('User!'));
            else if (result.access_token == null)
                return callback(new NotFoundError('AccessToken'));
            return callback(null, result);
        }
    );
};
