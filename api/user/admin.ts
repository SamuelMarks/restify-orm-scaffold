import { IOrmReq } from 'orm-mw';
import * as restify from 'restify';
import { has_body, mk_valid_body_mw } from 'restify-validators';

import { has_auth } from '../auth/middleware';
import { User } from './models';
import * as user_sdk from './sdk';
import { UserBodyReq, UserBodyUserReq } from './sdk';

export const create = (app: restify.Server, namespace: string = '') =>
    app.post(`${namespace}/:email`, has_body, mk_valid_body_mw(user_sdk.schema),
        (req: UserBodyReq, res: restify.Response, next: restify.Next) =>
            user_sdk.post(req, (err, user: User) => {
                if (err != null) return next(err);
                res.setHeader('X-Access-Token', user.access_token);
                res.json(201, user);
                return next();
            })
    );

export const read = (app: restify.Server, namespace: string = '') =>
    app.get(`${namespace}/:email`, has_auth('admin'),
        (req: UserBodyUserReq, res: restify.Response, next: restify.Next) =>
            user_sdk.get(req, (err, user: User) => {
                if (err != null) return next(err);
                res.json(user);
                return next();
            })
    );

export const readAll = (app: restify.Server, namespace: string = '') =>
    app.get(`${namespace}s`, has_auth('admin'),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) =>
            user_sdk.getAll(req, (err, users: {users: User[]}) => {
                if (err != null) return next(err);
                res.json(users);
                return next();
            })
    );

export const update = (app: restify.Server, namespace: string = '') =>
    app.put(`${namespace}/:email`, has_auth('admin'), has_body, /*remove_from_body(['email']),
        mk_valid_body_mw(schema, false),
        mk_valid_body_mw_ignore(schema, ['Missing required property']),*/
        (req: UserBodyUserReq, res: restify.Response, next: restify.Next) =>
            user_sdk.update(req, (err, user: User) => {
                if (err != null) return next(err);
                res.json(user);
                return next();
            })
    );

export const del = (app: restify.Server, namespace: string = '') =>
    app.del(`${namespace}/:email`, has_auth('admin'),
        (req: UserBodyUserReq, res: restify.Response, next: restify.Next) =>
            user_sdk.destroy(req, (err, status_code: number) => {
                if (err != null) return next(err);
                res.send(status_code);
                return next();
            })
    );
