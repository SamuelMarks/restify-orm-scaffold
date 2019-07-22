import * as restify from 'restify';

import { IOrmReq } from '@offscale/orm-mw/interfaces';
import { has_body, mk_valid_body_mw } from '@offscale/restify-validators';
import { fmtError } from '@offscale/custom-restify-errors';

import { has_auth } from '../auth/middleware';
import { AccessToken } from '../auth/models';
import { User } from './models';
import * as user_sdk from './sdk';
import { UserBodyReq, UserBodyUserReq, UserConfig } from './sdk';

export const create = (app: restify.Server, namespace: string = '') =>
    app.post(`${namespace}/:email`, has_body, mk_valid_body_mw(user_sdk.schema),
        (request: restify.Request, res: restify.Response, next: restify.Next) => {
            const req = request as unknown as UserBodyReq;
            user_sdk.post(req, UserConfig.instance)
                .then((user: User) => {
                    res.setHeader('X-Access-Token', user!.access_token!);
                    res.json(201, user);
                    return next();
                })
                .catch(next);
        }
    );

export const read = (app: restify.Server, namespace: string = '') =>
    app.get(`${namespace}/:email`, has_auth('admin'),
        (request: restify.Request, res: restify.Response, next: restify.Next) => {
            const req = request as unknown as UserBodyUserReq;
            user_sdk.get(req)
                .then((user: User) =>
                    AccessToken
                        .get(req.getOrm().redis!.connection)
                        .add(user.email, User.rolesAsStr(user.roles), 'access', (err, at) => {
                            user.access_token = at;
                            User._omit.forEach(attr => delete user[attr]);
                            if (err != null) return next(fmtError(err));
                            res.setHeader('X-Access-Token', at);
                            res.json(201, user);
                            return next();
                        })
                )
                .catch(next);
        }
    );

export const readAll = (app: restify.Server, namespace: string = '') =>
    app.get(`${namespace}s`, has_auth('admin'),
        (request: restify.Request, res: restify.Response, next: restify.Next) => {
            const req = request as unknown as restify.Request & IOrmReq;
            user_sdk.getAll(req)
                .then((users?: {users: User[]}) => {
                    res.json(users);
                    return next();
                })
                .catch(next);
        }
    );

export const update = (app: restify.Server, namespace: string = '') =>
    app.put(`${namespace}/:email`, has_auth('admin'), has_body, /*remove_from_body(['email']),
        mk_valid_body_mw(schema, false),
        mk_valid_body_mw_ignore(schema, ['Missing required property']),*/
        (request: restify.Request, res: restify.Response, next: restify.Next) =>
            user_sdk.update(request as unknown as UserBodyUserReq)
                .then((users: User | User[]) => {
                    const user: User = Array.isArray(users) ? users[0] : users;
                    res.setHeader('X-Access-Token', user!.access_token!);
                    res.json(201, user);
                    return next();
                })
                .catch(next)
    );

export const del = (app: restify.Server, namespace: string = '') =>
    app.del(`${namespace}/:email`, has_auth('admin'),
        (request: restify.Request, res: restify.Response, next: restify.Next) =>
            user_sdk.destroy(request as unknown as UserBodyUserReq)
                .then((status_code?: number) => {
                    res.send(status_code);
                    return next();
                })
                .catch(next)
    );
