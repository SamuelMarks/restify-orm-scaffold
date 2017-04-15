import * as restify from 'restify';
import { GenericError } from 'restify-errors';
import { AccessToken } from './models';

export enum Roles {
    disabled,
    login,
    admin = 21
}

export const has_auth = (scope = 'login') => {
    return (req: restify.Request, res: restify.Response, next: restify.Next) => {
        if (!req.headers['x-access-token'])
            if (req.params.access_token)
                req.headers['x-access-token'] = req.params.access_token;
            else
                return next(new GenericError({
                    error: 'NotFound',
                    error_message: 'X-Access-Token header must be included',
                    statusCode: 403
                }));

        AccessToken().findOne(
            req.headers['x-access-token'], (err, user_id) => {
                if (err) return next(err);
                else if (!user_id) return next(new GenericError({
                    error: 'NotFound',
                    error_message: 'Invalid access token used',
                    statusCode: 403
                }));
                req['user_id'] = user_id;
                return next();
            }
        );
    };
};
