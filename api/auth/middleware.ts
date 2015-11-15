/// <reference path='./../../typings/restify/restify.d.ts' />
/// <reference path='./../../cust_typings/waterline.d.ts' />
/// <reference path='./models.d.ts' />

import * as restify from 'restify';

import {AccessToken} from './models';

export enum Roles {
    disabled,
    login,
    admin = 21
}

export function has_auth(scope = 'login') {
    return (req: restify.Request, res: restify.Response, next: restify.Next) => {
        if (!req.headers['x-access-token']) {
            res.json(404, {
                error: 'NotFound',
                error_message: 'X-Access-Token header must be included'
            });
            return next()
        }
        AccessToken().findOne(
            req.headers['x-access-token'], (e, r) => {
                if (e) res.json(400, e);
                else if (!r) res.json(404, {
                    error: 'NotFound', error_message: 'Invalid access token used'
                });
                else req['user_id'] = r;
                return next()
            }
        );
    }
}
