import * as restify from 'restify';
import { waterfall } from 'async';
import { Query } from 'waterline';
import { has_body, mk_valid_body_mw } from 'restify-validators';
import { fmtError, NotFoundError } from 'restify-errors';
import { JsonSchema } from 'tv4';
import { c } from '../../main';
import { has_auth } from './middleware';
import { AccessToken } from './models';
import { hash_password } from '../user/models';
import { IUser } from '../user/models.d';

/* tslint:disable:no-var-requires */
const user_schema: JsonSchema = require('./../../test/api/user/schema');

export const login = (app: restify.Server, namespace: string = ''): void => {
    app.post(namespace, has_body, mk_valid_body_mw(user_schema),
        (req: restify.Request, res: restify.Response, next: restify.Next) => {
            const User: Query = c.collections['user_tbl'];

            const user = {
                email: req.body.email
            };
            waterfall([
                // cb => hash_password(user, cb),
                cb => User.findOne(user, (err: any, _user: IUser) =>
                    cb(err ? err : !_user ? new NotFoundError('User') : null)
                ),
                cb => hash_password(Object.assign(user, {password: req.body.password}), cb),
                cb => AccessToken().add(req.body.email, 'login', cb)
            ], (error: any, access_token: string) => {
                if (error) return next(fmtError(error));
                res.setHeader('X-Access-Token', access_token);
                res.json(201, {access_token});
                return next();
            });
        }
    );
};

export const logout = (app: restify.Server, namespace: string = ''): void => {
    app.del(namespace, has_auth(),
        (req: restify.Request, res: restify.Response, next: restify.Next) => {
            AccessToken().logout(
                {access_token: req.headers['x-access-token'] as string}, error => {
                    if (error) res.json(400, error);
                    else res.send(204);
                    return next();
                });
        }
    );
};
