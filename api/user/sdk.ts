import { series, waterfall } from 'async';
import { fmtError, GenericError, NotFoundError } from 'custom-restify-errors';
import { AccessTokenType, isShallowSubset, numCb, TCallback } from 'nodejs-utils';
import { IOrmReq } from 'orm-mw';
import { RestError } from 'restify-errors';
import { JsonSchema } from 'tv4';
import { Request } from 'restify';

import { AccessToken } from '../auth/models';
import { User } from './models';

/* tslint:disable:no-var-requires */
export const schema: JsonSchema = require('./../../test/api/user/schema');

export type UserBodyReq = Request & IOrmReq & {body?: User};
export type UserBodyUserReq = UserBodyReq & {user_id: string};

export const post = (req: UserBodyReq,
                     callback: TCallback<Error, User>) =>
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
                    .add(user.email, User.rolesAsStr(user.roles), 'access',
                        (err: Error, access_token: AccessTokenType) =>
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

export const get = (req: UserBodyUserReq,
                    callback: TCallback<Error | RestError, User>) =>
    req.getOrm().typeorm.connection
        .getRepository(User)
        .findOne({ email: req.user_id })
        .then((user: User) =>
            user == null ? callback(new NotFoundError('User'))
                : callback(void 0, user)
        )
        .catch(callback);

export const getAll = (req: IOrmReq,
                       callback: TCallback<Error | RestError, {users: User[]}>) =>
    req.getOrm().typeorm.connection
        .getRepository(User)
        .find({
            order: {
                email: 'ASC'
            }
        })
        .then((users: User[]) =>
            (users == null || !users.length) ? callback(new NotFoundError('Users'))
                : callback(void 0, { users }))
        .catch(callback);

export const update = (req: UserBodyUserReq,
                       callback: TCallback<Error, User>) => {
    if (!isShallowSubset(req.body, schema.properties)) {
        const error = 'ValidationError';
        return callback(new GenericError({
            name: error,
            message: 'Invalid keys detected in body',
            statusCode: 400
        }));
    }

    series([
            cb =>
                req.getOrm().typeorm.connection.manager
                    .update(User, { email: req.user_id }, req.body)
                    .then(_ => cb(void 0))
                    .catch(cb),
            cb =>
                req.getOrm().typeorm.connection.getRepository(User)
                    .findOne({ email: req.user_id })
                    .then((user: User) => cb(void 0, user))
                    .catch(cb)
        ], (error, update_user) =>
            error == null ? callback(void 0, update_user as any)
                : callback(fmtError(error))
    );
};

export const destroy = (req: IOrmReq & {body?: User, user_id: string},
                        callback: numCb) =>
    series([
            cb =>
                AccessToken
                    .get(req.getOrm().redis.connection)
                    .logout({ user_id: req.user_id }, cb),
            cb =>
                req.getOrm().typeorm.connection
                    .getRepository(User)
                    .remove({ email: req.user_id } as any)
                    .then(() => cb(void 0))
                    .catch(cb)
        ], error =>
            error == null ? callback(void 0, 204)
                : callback(fmtError(error))
    );
