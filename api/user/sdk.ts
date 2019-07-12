import { series, waterfall } from 'async';
import { default as restify_errors } from 'restify-errors';
import { JsonSchema } from 'tv4';
import { Request } from 'restify';

import { fmtError, GenericError, NotFoundError } from '@offscale/custom-restify-errors';
import { isShallowSubset, removeNulls, unwrapIfOneElement } from '@offscale/nodejs-utils';
import { AccessTokenType } from '@offscale/nodejs-utils/interfaces';
import { IOrmReq } from '@offscale/orm-mw/interfaces';

import { AccessToken } from '../auth/models';
import { User } from './models';

/* tslint:disable:no-var-requires */
export const schema: JsonSchema = require('./../../test/api/user/schema');

export type UserBodyReq = Request & IOrmReq & {body?: User};
export type UserBodyUserReq = UserBodyReq & {user_id: string};

export interface IUserConfig {
    public_registration: boolean;
    initial_accounts: User[];
}

export class UserConfig implements IUserConfig {
    public static default(): UserConfig {
        return new UserConfig(true, []);
    }

    private static _user_config: UserConfig;

    constructor(public public_registration: boolean,
                public initial_accounts: User[]) {
        if (!public_registration && !initial_accounts.length)
            throw TypeError('No way for accounts to exist!');
    }

    public static get instance(): UserConfig {
        if (UserConfig._user_config == null) UserConfig._user_config = UserConfig.default();
        return UserConfig._user_config;
    }

    public static set instance(config: IUserConfig) {
        UserConfig._user_config = new UserConfig(config.public_registration, config.initial_accounts);
    }
}

export const post = (req: UserBodyReq,
                     config: UserConfig): Promise<User> => new Promise<User>((resolve, reject) =>
    waterfall([
            cb => cb(config.public_registration ? void 0 : new GenericError({
                statusCode: 401,
                name: 'Registration',
                message: 'public registration disabled; contact the administrator for an account'
            })),
            cb => {
                const user = new User();
                Object.keys(req.body).map(k => user[k] = req.body[k]);
                return req.getOrm().typeorm!.connection.manager
                    .getRepository(User)
                    .save(user)
                    .then(() => cb(void 0, user))
                    .catch(cb);
            },
            /*(user: User, cb) => console.info('post::waterfall::before User.findOne, user=', user, ';') ||
                req.getOrm().typeorm!.connection.manager
                    .getRepository(User)
                    .findOne(user)
                    .then((_user: User) => cb(void 0, _user))
                    .catch(cb),
                    console.info('post::waterfall::before AccessToken.get, user=', user, ';')*/
            (user: User, cb) =>
                AccessToken
                    .get(req.getOrm().redis!.connection)
                    .add(user.email, User.rolesAsStr(user.roles), 'access',
                        (err: Error, access_token: AccessTokenType) =>
                            err != null ? cb(err) : cb(void 0, Object.assign(user, { access_token }))
                    )
        ], (error: Error | null | undefined | restify_errors.RestError, user: User | undefined) => {
            if (error != null)
                return reject(fmtError(error) as restify_errors.RestError);
            else if (user == null)
                return reject(new NotFoundError('User|AccessToken'));
            else if (user.email == null)
                return reject(new NotFoundError('User'));
            else if (user.access_token == null)
                return reject(new NotFoundError('AccessToken'));
            return resolve(user);
        }
    )
);

export const get = (req: UserBodyUserReq): Promise<User> => new Promise<User>((resolve, reject) =>
    req.getOrm().typeorm!.connection
        .getRepository(User)
        .findOne({ email: req.user_id })
        .then((user: User | undefined) =>
            user == null ? reject(new NotFoundError('User'))
                : resolve(user)
        )
        .catch(reject)
);

export const getAll = (req: IOrmReq): Promise<{users: User[]}> =>
    new Promise<{users: User[]}>((resolve, reject) =>
        req.getOrm().typeorm!.connection
            .getRepository(User)
            .find({
                order: {
                    email: 'ASC'
                }
            })
            .then((users: User[]) =>
                (users == null || !users.length) ? reject(new NotFoundError('Users'))
                    : resolve({ users }))
            .catch(reject)
    );

export const update = (req: UserBodyUserReq): Promise<User | User[]> => new Promise((resolve, reject) => {
    if (!isShallowSubset(req.body, schema.properties)) {
        const error = 'ValidationError';
        return reject(new GenericError({
            name: error,
            message: 'Invalid keys detected in body',
            statusCode: 400
        }));
    }

    series([
            cb =>
                req.getOrm().typeorm!.connection.manager
                    .update(User, { email: req.user_id }, req.body)
                    .then(_ => cb(void 0))
                    .catch(cb),
            cb =>
                req.getOrm().typeorm!.connection.getRepository(User)
                    .findOne({ email: req.user_id })
                    .then((user: User | undefined) => cb(void 0, user))
                    .catch(cb)
        ], (error, update_user) =>
            error == null ?
                (update_user == null ?
                    reject(new NotFoundError('User'))
                    : resolve(unwrapIfOneElement(removeNulls(update_user)) as User | User[]))
                : reject(fmtError(error) as restify_errors.RestError)
    );
});

export const destroy = (req: IOrmReq & {body?: User, user_id: string}): Promise<number> =>
    new Promise<number>((resolve, reject) => {
        series([
                cb =>
                    AccessToken
                        .get(req.getOrm().redis!.connection)
                        .logout({ user_id: req.user_id }, cb),
                cb =>
                    req.getOrm().typeorm!.connection
                        .getRepository(User)
                        .remove({ email: req.user_id } as any)
                        .then(() => cb(void 0))
                        .catch(cb)
            ], error =>
                error == null ? resolve(204)
                    : reject(fmtError(error) as restify_errors.RestError)
        );
    });
