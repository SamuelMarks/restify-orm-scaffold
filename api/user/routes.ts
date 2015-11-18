/// <reference path='./../../typings/restify/restify.d.ts' />
/// <reference path='./../../typings/tv4/tv4.d.ts' />
/// <reference path='./../../cust_typings/waterline.d.ts' />
/// <reference path='./../../typings/async/async.d.ts' />
/// <reference path='./models.d.ts' />

import * as restify from 'restify';
import * as async from 'async'

import {has_body, mk_valid_body_mw, mk_valid_body_mw_ignore, remove_from_body} from './../../utils/validators';
import {collections} from './../../main';
import {fmtError, isShallowSubset} from './../../utils/helpers';
import {NotFoundError} from './../../utils/errors';
import {has_auth} from './../auth/middleware';
import {AccessToken} from './../auth/models';

const user_schema: tv4.JsonSchema = require('./../../test/api/user/schema');

export function create(app: restify.Server, namespace: string = ""): void {
    app.post(namespace, has_body, mk_valid_body_mw(user_schema),
        function(req: restify.Request, res: restify.Response, next: restify.Next) {
            const User: waterline.Query = collections['user_tbl'];

            async.waterfall([
                cb => User.create(req.body, cb),
                (user, cb) => cb(null, {
                    access_token: AccessToken().add(req.body.email, 'login'),
                    user: user
                })
            ], (error: any, result: { access_token: string, user: user.IUser }) => {
                if (error) {
                    const e = <{ statusCode: number, error: {} }>fmtError(error);
                    return res.json(e.statusCode, e.error);
                };
                res.setHeader('X-Access-Token', result.access_token)
                res.json(201, result.user);
                return next();
            });
        }
    );
};

export function read(app: restify.Server, namespace: string = ""): void {
    app.get(namespace, has_auth(),
        function(req: restify.Request, res: restify.Response, next: restify.Next) {
            const User: waterline.Query = collections['user_tbl'];

            User.findOne({ email: req['user_id'] },
                (error: waterline.WLError, user: user.IUser) => {
                    if (error) res.json(400, fmtError(error));
                    else if (!user) next(new NotFoundError('User'));
                    else res.json(user);
                    return next();
                }
            );
        }
    );
};

export function update(app: restify.Server, namespace: string = ""): void {
    app.put(namespace, remove_from_body(['email']),
        has_body, mk_valid_body_mw(user_schema, false),
        mk_valid_body_mw_ignore(user_schema, ['Missing required property']), has_auth(),
        function(req: restify.Request, res: restify.Response, next: restify.Next) {
            if (!isShallowSubset(req.body, user_schema.properties))
                return res.json(400, { error: 'ValidationError', error_message: 'Invalid keys detected in body' }) && next();
            else if (!req.body || !Object.keys(req.body).length)
                return res.json(400, { error: 'ValidationError', error_message: 'Body required' }) && next();

            const User: waterline.Query = collections['user_tbl'];

            async.waterfall([
                cb => User.findOne({ email: req['user_id'] },
                    (err: waterline.WLError, user: user.IUser) => {
                        if (err) cb(err);
                        else if (!user) cb(new NotFoundError('User'));
                        return cb(err, user)
                    }),
                (user, cb) =>
                    User.update(user, req.body, (e, r: user.IUser) => cb(e, r[0]))
            ], (error, result) => {
                if (error) {
                    if (error instanceof restify.HttpError) return next(error);
                    const e: any = fmtError(error);
                    res.json(e.statusCode, e.error);
                }
                res.json(200, result);
                return next()
            });
        }
    );
};

export function del(app: restify.Server, namespace: string = ""): void {
    app.del(namespace, has_auth(),
        function(req: restify.Request, res: restify.Response, next: restify.Next) {
            const User: waterline.Query = collections['user_tbl'];

            async.waterfall([
                cb => AccessToken().logout({ user_id: req['user_id'] }, cb),
                cb => User.destroy({ email: req['user_id'] }, cb)
            ], (error) => {
                if (error) {
                    if (error instanceof restify.HttpError) return next(error);
                    const e: any = fmtError(error);
                    res.json(e.statusCode, e.error);
                }
                else res.send(204)
                return next()
            });
        }
    );
};
