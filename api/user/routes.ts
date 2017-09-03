import { waterfall } from 'async';
import { fmtError, NotFoundError } from 'custom-restify-errors';
import { isShallowSubset } from 'nodejs-utils';
import { IOrmReq } from 'orm-mw';
import * as restify from 'restify';
import { has_body, mk_valid_body_mw, mk_valid_body_mw_ignore, remove_from_body } from 'restify-validators';
import { JsonSchema } from 'tv4';
import { Query, WLError } from 'waterline';

import { has_auth } from '../auth/middleware';
import { AccessToken } from '../auth/models';
import { IUser } from './models.d';
import { IPostUser, post } from './sdk';

/* tslint:disable:no-var-requires */
const user_schema: JsonSchema = require('./../../test/api/user/schema');

export const create = (app: restify.Server, namespace: string = ''): void => {
    app.post(namespace, has_body, mk_valid_body_mw(user_schema),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            post(req, (err, result: IPostUser) => {
                if (err != null) return next(err);
                res.setHeader('X-Access-Token', result.access_token);
                res.json(201, result.user);
                return next();
            });
        }
    );
};

export const read = (app: restify.Server, namespace: string = ''): void => {
    app.get(namespace, has_auth(),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            const User: Query = req.getOrm().waterline.collections['user_tbl'];

            User.findOne({ email: req['user_id'] }).exec((error: WLError, user: IUser) => {
                    if (error != null) return next(fmtError(error));
                    else if (user == null) return next(new NotFoundError('User'));
                    res.json(user);
                    return next();
                }
            );
        }
    );
};

export const getAll = (app: restify.Server, namespace: string = ''): void => {
    app.get(`${namespace}s`, has_auth(),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            const User: Query = req.getOrm().waterline.collections['user_tbl'];

            User.find().exec((error: WLError, users: IUser[]) => {
                    if (error != null) return next(fmtError(error));
                    else if (users == null || !users.length) return next(new NotFoundError('`User`s'));
                    res.json({ users });
                    return next();
                }
            );
        }
    );
};

export const update = (app: restify.Server, namespace: string = ''): void => {
    app.put(namespace, remove_from_body(['email']),
        has_body, mk_valid_body_mw(user_schema, false),
        mk_valid_body_mw_ignore(user_schema, ['Missing required property']), has_auth(),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            if (!isShallowSubset(req.body, user_schema.properties))
                return res.json(400, {
                    error: 'ValidationError',
                    error_portfolio: 'Invalid keys detected in body'
                }) && next();
            else if (req.body == null || !Object.keys(req.body).length)
                return res.json(400, { error: 'ValidationError', error_portfolio: 'Body required' }) && next();

            const User: Query = req.getOrm().waterline.collections['user_tbl'];

            waterfall([
                cb => User.findOne({ email: req['user_id'] }).exec(
                    (err: WLError, user: IUser) => {
                        if (err != null) cb(err);
                        else if (user == null) cb(new NotFoundError('User'));
                        return cb(err, user);
                    }),
                (user, cb) =>
                    User.update(user, req.body).exec(
                        (err, updated_users: IUser[]) => cb(err, updated_users[0])
                    )
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
            const User: Query = req.getOrm().waterline.collections['user_tbl'];

            waterfall([
                cb => AccessToken.get(req.getOrm().redis.connection).logout({ user_id: req['user_id'] }, cb),
                cb => User.destroy({ email: req['user_id'] }, cb)
            ], error => {
                if (error != null) return next(fmtError(error));
                res.send(204);
                return next();
            });
        }
    );
};
