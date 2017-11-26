import { waterfall } from 'async';
import { fmtError, NotFoundError } from 'custom-restify-errors';
import { TCallback } from 'nodejs-utils';
import { IOrmReq } from 'orm-mw';
import * as restify from 'restify';

import { AccessToken } from '../auth/models';
import { User } from './models';

export const post = (req: restify.Request & IOrmReq & {body?: User}, callback: TCallback<Error, User>) => {
    waterfall([
            cb => {
                const user = new User();
                Object.keys(req.body).map(k => user[k] = req.body[k]);
                return req.getOrm().typeorm.connection.manager
                    .getRepository(User)
                    .save(user)
                    .then(() => cb(void 0, user))
                    .catch(cb);
            },
            /*(user: User, cb) => console.info('post::waterfall::before User.findOne, user=', user, ';') ||
                req.getOrm().typeorm.connection.manager
                    .getRepository(User)
                    .findOne(user)
                    .then((_user: User) => cb(void 0, _user))
                    .catch(cb),
                    console.info('post::waterfall::before AccessToken.get, user=', user, ';')*/
            (user: User, cb) =>
                AccessToken
                    .get(req.getOrm().redis.connection)
                    .add(user.email, User.rolesAsStr(user.roles), 'login',
                        (err: Error, access_token: string) =>
                            err != null ? cb(err) : cb(void 0, Object.assign(user, { access_token }))
                    )
        ], (error: Error, user: User) => {
            if (error != null)
                return callback(fmtError(error));
            else if (user == null)
                return callback(new NotFoundError('User|AccessToken'));
            else if (user.email == null)
                return callback(new NotFoundError('User!'));
            else if (user.access_token == null)
                return callback(new NotFoundError('AccessToken'));
            return callback(void 0, user);
        }
    );
};
