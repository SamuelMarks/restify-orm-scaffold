/// <reference path='./../../typings/restify/restify.d.ts' />
/// <reference path='./../../typings/tv4/tv4.d.ts' />
/// <reference path='./../../cust_typings/waterline.d.ts' />
/// <reference path='./models.d.ts' />

import * as restify from 'restify';

import {toJSON} from './models';
import {has_body, mk_valid_body_mw, mk_valid_body_mw_ignore, remove_from_body} from './../../utils/validators';
import {collections} from './../../main';
import {fmtError, isShallowSubset} from './../../utils/helpers';
import {has_auth} from './../auth/middleware';
import {AccessToken} from './../auth/models';

const user_schema: tv4.JsonSchema = require('./../../test/api/user/schema');

export function create(app: restify.Server, namespace: string = ""): void {
    app.post(namespace, has_body, mk_valid_body_mw(user_schema),
        function(req: restify.Request, res: restify.Response, next: restify.Next) {
            const User: waterline.Query = collections['user_tbl'];

            User.create(req.body, function(error: waterline.Error, user: user.IUser) {
                if (error) res.json(400, fmtError(error));
                res.setHeader('X-Access-Token', 'foo');
                res.json(201, toJSON(user));
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
                (error: waterline.Error, user: user.IUser) => {
                    if (error) res.json(400, fmtError(error));
                    else if (!user) res.json(404, { error: 'NotFound', error_message: 'User not found' });
                    else res.json(toJSON(user));
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
                res.json(400, { error: 'ValidationError', error_message: 'Invalid keys detected in body' }) && next();
            else if (!req.body || !Object.keys(req.body).length)
                res.json(400, { error: 'ValidationError', error_message: 'Body required' }) && next();

            const User: waterline.Query = collections['user_tbl'];

            User.findOne({ email: req['user_id'] },
                (error: waterline.Error, user: user.IUser) => {
                    if (error) res.json(400, fmtError(error)) && next();
                    else if (!user) res.json(404, { error: 'NotFound', error_message: 'User not found' }) && next();
                    else User.update(user, req.body, (e, r) => {
                        if (e) res.json(400, fmtError(e));
                        else res.json(200, toJSON(r[0]));
                        return next();
                    });
                }
            );
        }
    );
};

export function del(app: restify.Server, namespace: string = ""): void {
    app.del(namespace, has_auth(),
        function(req: restify.Request, res: restify.Response, next: restify.Next) {
            const User: waterline.Query = collections['user_tbl'];

            AccessToken().logout({ user_id: req['user_id'] }, (err: any) =>
                err ? res.json(400, fmtError(err)) && next()
                    : User.destroy({ email: req['user_id'] }, (error: waterline.Error) => {
                        if (error) res.json(400, fmtError(error));
                        else res.send(204);
                        return next();
                    })
            )
        }
    );
};
