import * as restify from 'restify';
import {AccessToken} from './models';

export enum Roles {
    disabled,
    login,
    admin = 21
}

export function has_auth(scope = 'login') {
    return (req: restify.Request, res: restify.Response, next: restify.Next) => {
        if (req.params.access_token)
            req.headers['x-access-token'] = req.params.access_token;

        if (!req.headers['x-access-token']) {
            res.json(403, {
                error: 'NotFound',
                error_message: 'X-Access-Token header must be included'
            });
            return next()
        }
        AccessToken().findOne(
            req.headers['x-access-token'], (err, user_id) => {
                if (err) res.json(403, err);
                else if (!user_id) res.json(403, {
                    error: 'NotFound', error_message: 'Invalid access token used'
                });
                else req['user_id'] = user_id;
                return next()
            }
        );
    }
}
