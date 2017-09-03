import { waterfall } from 'async';
import { fmtError, NotFoundError } from 'custom-restify-errors';
import { TCallback } from 'nodejs-utils';
import { IOrmReq } from 'orm-mw';
import * as restify from 'restify';
import { Query, WLError } from 'waterline';

import { AccessToken } from '../auth/models';
import { IUser } from './models.d';

export interface IPostUser {
    access_token: string;
    user: IUser;
}

export const post = (req: restify.Request & IOrmReq & {body?: IPostUser}, callback: TCallback<Error, IPostUser>) => {
    const User: Query = req.getOrm().waterline.collections['user_tbl'];

    waterfall([
        cb => User.create(req.body).exec((error: WLError, _user: IUser) => {
                if (error != null) return cb(error);
                else if (_user == null) return cb(new NotFoundError('User'));
                return cb(void 0, _user);
            }),
        (_user: IUser, cb) =>
            AccessToken.get(req.getOrm().redis.connection).add(_user.email, _user.roles, 'login',
                (err: Error, access_token: string) =>
                    err != null ? cb(err) : cb(void 0, { access_token, user: _user })
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
            return callback(void 0, result);
        }
    );
};
