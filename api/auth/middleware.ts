import { AuthError, GenericError } from 'custom-restify-errors';
import { IOrmReq } from 'orm-mw';
import * as restify from 'restify';

import { AccessToken } from './models';

export const has_auth = (scope = 'access') =>
    (req: restify.Request & IOrmReq & {user_id: string}, res: restify.Response, next: restify.Next) => {
        if (req.headers['x-access-token'] == null)
            if (req.params.access_token != null)
                req.headers['x-access-token'] = req.params.access_token;
            else
                return next(new GenericError({
                    name: 'NotFound',
                    message: 'X-Access-Token header must be included',
                    statusCode: 403
                }));

        const access_token = req.headers['x-access-token'] as string;

        if (access_token.indexOf(scope) < 0)
            return next(new AuthError(`${scope} required to view; ` +
                `you only have ${access_token.slice(access_token.lastIndexOf(':'))}`));

        const body_id = req.params.email || req.body && (req.body.user_id || req.body.email);

        if (access_token.indexOf('admin') > -1 && body_id)
            AccessToken
                .get(req.getOrm().redis.connection)
                .findOne(access_token, (err: Error, user_id: string) => {
                    if (err != null) return next(err);
                    else if (user_id == null) return next(new GenericError({
                        name: 'NotFound',
                        message: 'Invalid access token used',
                        statusCode: 403
                    }));
                    req.user_id = body_id;
                    return next();
                });
        else AccessToken
            .get(req.getOrm().redis.connection)
            .findOne(access_token, (err: Error, user_id: string) => {
                if (err != null) return next(err);
                else if (user_id == null) return next(new GenericError({
                    name: 'NotFound',
                    message: 'Invalid access token used',
                    statusCode: 403
                }));
                req.user_id = user_id;
                return next();
            });
    };
