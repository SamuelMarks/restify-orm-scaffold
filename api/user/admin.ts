import { series } from 'async';
import { fmtError, NotFoundError, restCatch } from 'custom-restify-errors';
import { isShallowSubset } from 'nodejs-utils';
import { IOrmReq } from 'orm-mw';
import * as restify from 'restify';
import { has_body, mk_valid_body_mw } from 'restify-validators';
import { JsonSchema } from 'tv4';

import { has_auth } from '../auth/middleware';
import { AccessToken } from '../auth/models';
import { User } from './models';
import { post } from './sdk';

/* tslint:disable:no-var-requires */
const user_schema: JsonSchema = require('./../../test/api/user/schema');

export const create = (app: restify.Server, namespace: string = ''): void => {
    app.post(namespace, has_body, mk_valid_body_mw(user_schema),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            post(req, (err, user: User) => {
                if (err != null) return next(err);
                res.setHeader('X-Access-Token', user.access_token);
                res.json(201, user);
                return next();
            });
        }
    );
};

export const read = (app: restify.Server, namespace: string = ''): void => {
    app.get(namespace, has_auth(),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            req.getOrm().typeorm.connection
                .getRepository(User)
                .findOne({ email: req['user_id'] })
                .then((user: User) => {
                    if (user == null) return next(new NotFoundError('User'));
                    res.json(user);
                    return next();
                }).catch(restCatch(req, res, next));
        }
    );
};

export const getAll = (app: restify.Server, namespace: string = ''): void => {
    app.get(`${namespace}s`, has_auth(),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            req.getOrm().typeorm.connection
                .getRepository(User)
                .find({
                    order: {
                        email: 'ASC'
                    }
                })
                .then((users: User[]) => {
                    if (users == null || !users.length)
                        return next(new NotFoundError('Users'));
                    res.json({ users });
                    return next();
                }).catch(restCatch(req, res, next));
        }
    );
};

export const update = (app: restify.Server, namespace: string = ''): void => {
    app.put(namespace, has_auth(), has_body, /*remove_from_body(['email']),
        mk_valid_body_mw(schema, false),
        mk_valid_body_mw_ignore(schema, ['Missing required property']),*/
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            if (!isShallowSubset(req.body, user_schema.properties)) {
                res.json(400, {
                    error: 'ValidationError',
                    error_message: 'Invalid keys detected in body'
                });
                return next();
            }

            series([
                cb =>
                    req.getOrm().typeorm.connection.manager
                        .update(User, { email: req['user_id'] }, req.body)
                        .then(_ => cb(void 0))
                        .catch(cb),
                cb =>
                    req.getOrm().typeorm.connection.getRepository(User)
                        .findOne({ email: req['user_id'] })
                        .then((user: User) => cb(void 0, user))
                        .catch(cb)
            ], (error, updated_user) => {
                if (error != null) return next(fmtError(error));
                res.json(200, updated_user);
                return next();
            });
        }
    );
};

export const del = (app: restify.Server, namespace: string = ''): void => {
    app.del(namespace, has_auth(),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            series([
                cb =>
                    AccessToken
                        .get(req.getOrm().redis.connection)
                        .logout({ user_id: req['user_id'] }, cb),
                cb =>
                    req.getOrm().typeorm.connection
                        .getRepository(User)
                        .remove({ email: req['user_id'] } as any)
                        .then(() => cb(void 0))
                        .catch(cb)
            ], error => {
                if (error != null) return next(fmtError(error));
                res.send(204);
                return next();
            });
        }
    );
};
