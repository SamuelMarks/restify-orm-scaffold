import { IOrmReq } from '@offscale/orm-mw/interfaces';
import * as restify from 'restify';
import { has_body, mk_valid_body_mw } from '@offscale/restify-validators';

import { has_auth } from '../auth/middleware';
import { User } from './models';
import * as user_sdk from './sdk';
import { UserBodyReq, UserBodyUserReq, UserConfig } from './sdk';

export const create = (app: restify.Server, namespace: string = '') =>
    app.post(`${namespace}/:email`, has_body, mk_valid_body_mw(user_sdk.schema),
        (request: restify.Request, res: restify.Response, next: restify.Next) => {
            const req = request as unknown as UserBodyReq;
            user_sdk.post(req, UserConfig.instance, (err, user?: User) => {
                if (err != null) return next(err);
                res.setHeader('X-Access-Token', user!.access_token!);
                res.json(201, user);
                return next();
            });
        }
    );

export const read = (app: restify.Server, namespace: string = '') =>
    app.get(`${namespace}/:email`, has_auth('admin'),
        (request: restify.Request, res: restify.Response, next: restify.Next) => {
            const req = request as unknown as UserBodyUserReq;
            user_sdk.get(req, (err, user?: User) => {
                if (err != null) return next(err);
                res.json(user);
                return next();
            });
        }
    );

export const readAll = (app: restify.Server, namespace: string = '') =>
    app.get(`${namespace}s`, has_auth('admin'),
        (request: restify.Request, res: restify.Response, next: restify.Next) => {
            const req = request as unknown as restify.Request & IOrmReq;
            user_sdk.getAll(req, (err, users?: {users: User[]}) => {
                if (err != null) return next(err);
                res.json(users);
                return next();
            });
        }
    );

export const update = (app: restify.Server, namespace: string = '') =>
    app.put(`${namespace}/:email`, has_auth('admin'), has_body, /*remove_from_body(['email']),
        mk_valid_body_mw(schema, false),
        mk_valid_body_mw_ignore(schema, ['Missing required property']),*/
        (request: restify.Request, res: restify.Response, next: restify.Next) =>
            user_sdk.update(request as unknown as UserBodyUserReq, (err, user?: User) => {
                if (err != null) return next(err);
                res.json(user);
                return next();
            })
    );

export const del = (app: restify.Server, namespace: string = '') =>
    app.del(`${namespace}/:email`, has_auth('admin'),
        (request: restify.Request, res: restify.Response, next: restify.Next) =>
            user_sdk.destroy(request as unknown as UserBodyUserReq, (err, status_code?: number) => {
                if (err != null) return next(err);
                res.send(status_code);
                return next();
            })
    );
