import * as restify from 'restify';

import { has_body, mk_valid_body_mw } from '@offscale/restify-validators';

import { has_auth } from '../auth/middleware';
import { User } from './models';
import * as user_sdk from './sdk';
import { UserBodyReq, UserBodyUserReq, UserConfig } from './sdk';

export const create = (app: restify.Server, namespace: string = '') =>
    app.post(namespace, has_body, mk_valid_body_mw(user_sdk.schema),
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
    app.get(namespace, has_auth(),
        (request: restify.Request, res: restify.Response, next: restify.Next) => {
            const req = request as unknown as UserBodyUserReq;
            user_sdk.get(req)
                .then((user: User) => {
                    res.json(user);
                    return next();
                })
                .catch(next);
        }
    );

export const update = (app: restify.Server, namespace: string = '') =>
    app.put(namespace, has_auth(), has_body, /*remove_from_body(['email']),
        mk_valid_body_mw(schema, false),
        mk_valid_body_mw_ignore(schema, ['Missing required property']),*/
        (request: restify.Request, res: restify.Response, next: restify.Next) => {
            const req = request as unknown as UserBodyUserReq;
            user_sdk.update(req)
                .then((user) => {

                    res.json(user);
                    return next();
                })
                .catch(next);
        }
    );

export const del = (app: restify.Server, namespace: string = '') =>
    app.del(namespace, has_auth(),
        (request: restify.Request, res: restify.Response, next: restify.Next) => {
            const req = request as unknown as UserBodyUserReq;
            user_sdk.destroy(req)
                .then((status_code: number) => {
                    res.send(status_code);
                    return next();
                })
                .catch(next);
        }
    );
