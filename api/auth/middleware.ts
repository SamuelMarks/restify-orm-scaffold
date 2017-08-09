import { GenericError } from 'custom-restify-errors';
import * as restify from 'restify';
import { AccessToken } from './models';

export enum Roles {
    disabled,
    login,
    admin = 21
}

export const has_auth = (scope = 'login') => (req: restify.Request, res: restify.Response, next: restify.Next) => {
    if (req.headers['x-access-token'] == null)
        if (req.params.access_token != null)
            req.headers['x-access-token'] = req.params.access_token;
        else
            return next(new GenericError({
                error: 'NotFound',
                error_message: 'X-Access-Token header must be included',
                statusCode: 403
            }));

    AccessToken.get().findOne(req.headers['x-access-token'] as string, (err: Error, user_id: string) => {
        if (err != null) return next(err);
        else if (user_id == null) return next(new GenericError({
            error: 'NotFound',
            error_message: 'Invalid access token used',
            statusCode: 403
        }));
        req['user_id'] = user_id;
        return next();
    });
};
