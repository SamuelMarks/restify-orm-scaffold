import * as restify from 'restify';
import { waterfall } from 'async';
import { Query, WLError } from 'waterline';
import { has_body, mk_valid_body_mw, mk_valid_body_mw_ignore, remove_from_body } from 'restify-validators';
import { isShallowSubset } from 'nodejs-utils';
import { fmtError, NotFoundError } from 'restify-errors';
import { JsonSchema } from 'tv4';
import { c } from '../../main';
import { has_auth } from '../auth/middleware';
import { AccessToken } from '../auth/models';
import { IUser } from './models.d';

/* tslint:disable:no-var-requires */
const user_schema: JsonSchema = require('./../../test/api/user/schema');

export const create = (app: restify.Server, namespace: string = ''): void => {
    app.post(namespace, has_body, mk_valid_body_mw(user_schema),
        (req: restify.Request, res: restify.Response, next: restify.Next) => {
            const User: Query = c.collections['user_tbl'];

            User.create(req.body).exec((error, user: IUser) => {
                if (error) return next(fmtError(error));
                else if (!user) return next(NotFoundError('User'));

                AccessToken().add(req.body.email, 'login', (err, access_token) => {
                    if (err) return next(fmtError(err));
                    res.setHeader('X-Access-Token', access_token);
                    res.json(201, user);
                    return next();
                });
            });
        }
    );
};

export const read = (app: restify.Server, namespace: string = ''): void => {
    app.get(namespace, has_auth(),
        (req: restify.Request, res: restify.Response, next: restify.Next) => {
            const User: Query = c.collections['user_tbl'];

            User.findOne({email: req['user_id']}, (error: WLError, user: IUser) => {
                    if (error) return next(fmtError(error));
                    else if (!user) return next(new NotFoundError('User'));
                    res.json(user);
                    return next();
                }
            );
        }
    );
};

export const getAll = (app: restify.Server, namespace: string = ''): void => {
    app.get(`${namespace}s`, has_auth(),
        (req: restify.Request, res: restify.Response, next: restify.Next) => {
            const User: Query = c.collections['user_tbl'];

            User.find().exec((error: WLError, users: IUser[]) => {
                    if (error) return next(fmtError(error));
                    else if (!users || !users.length) return next(new NotFoundError('`User`s'));
                    res.json({users});
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
        (req: restify.Request, res: restify.Response, next: restify.Next) => {
            if (!isShallowSubset(req.body, user_schema.properties))
                return res.json(400, {
                        error: 'ValidationError',
                        error_message: 'Invalid keys detected in body'
                    }) && next();
            else if (!req.body || !Object.keys(req.body).length)
                return res.json(400, {error: 'ValidationError', error_message: 'Body required'}) && next();

            const User: Query = c.collections['user_tbl'];

            waterfall([
                cb => User.findOne({email: req['user_id']},
                    (err: WLError, user: IUser) => {
                        if (err) cb(err);
                        else if (!user) cb(new NotFoundError('User'));
                        return cb(err, user);
                    }),
                (user, cb) =>
                    User.update(user, req.body, (err, updated_users: IUser[]) => cb(err, updated_users[0]))
            ], (error, updated_user) => {
                if (error) return next(fmtError(error));
                res.json(200, updated_user);
                return next();
            });
        }
    );
};

export const del = (app: restify.Server, namespace: string = ''): void => {
    app.del(namespace, has_auth(),
        (req: restify.Request, res: restify.Response, next: restify.Next) => {
            const User: Query = c.collections['user_tbl'];

            waterfall([
                cb => AccessToken().logout({user_id: req['user_id']}, cb),
                cb => User.destroy({email: req['user_id']}, cb)
            ], error => {
                if (error) return next(fmtError(error));
                res.send(204);
                return next();
            });
        }
    );
};
