/// <reference path='./../../typings/restify/restify.d.ts' />
/// <reference path='./../../typings/tv4/tv4.d.ts' />
/// <reference path='./../../cust_typings/waterline.d.ts' />
/// <reference path='./models.d.ts' />

import * as restify from 'restify';

import {mk_valid_body_mw, mk_valid_body_mw_ignore, has_body} from './../../utils/validators';
import {collections} from './../../main';
import {fmtError} from './../../utils/helpers';
import {has_auth} from './middleware';
import {AccessToken} from './models';

const user_schema: tv4.JsonSchema = require('./../../test/api/user/schema');

export function login(app: restify.Server, namespace: string = ""): void {
    app.post(`${namespace}`, has_body, mk_valid_body_mw(user_schema),
        function(req: restify.Request, res: restify.Response, next: restify.Next) {
            const User: waterline.Query = collections['user_tbl'];
            User.findOne({
                email: req.body.email,
                password: req.body.password // LOL
            }, (error: waterline.Error, user: user.IUser) => {
                if (error) res.json(400, fmtError(error));
                else if (!user) res.json(404, {
                    error: 'NotFound',
                    error_message: 'User not found'
                });
                else res.json(201, {
                    access_token: AccessToken().add(
                        req.body.email, 'login'
                    )
                });
                return next();
            });
        }
    );
};

export function logout(app: restify.Server, namespace: string = ""): void {
    app.del(`${namespace}`, has_auth('login'),
        function(req: restify.Request, res: restify.Response, next: restify.Next) {
            AccessToken().logout(
                { access_token: req.headers['x-access-token'] }, (error) => {
                    if (error) res.json(400, error);
                    else res.send(204);
                    return next();
                })
        }
    );
};
