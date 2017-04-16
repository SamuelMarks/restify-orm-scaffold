import * as argon2 from 'argon2';
import * as restify from 'restify';
import { waterfall } from 'async';
import { Query } from 'waterline';
import { has_body, mk_valid_body_mw } from 'restify-validators';
import { AuthError, fmtError, NotFoundError } from 'restify-errors';
import { JsonSchema } from 'tv4';
import { c } from '../../main';
import { has_auth } from './middleware';
import { AccessToken } from './models';
import { IUser } from '../user/models.d';
import { hash_password, verify_password } from '../user/models';

/* tslint:disable:no-var-requires */
const user_schema: JsonSchema = require('./../../test/api/user/schema');

export const login = (app: restify.Server, namespace: string = ''): void => {
    app.post(namespace, has_body, mk_valid_body_mw(user_schema),
        (req: restify.Request, res: restify.Response, next: restify.Next) => {
            const User: Query = c.collections['user_tbl'];

            const user: { email: string, password?: string } = {
                email: req.body.email
            };
            waterfall([
                cb => User.findOne(user, (err: any, _user: IUser) =>
                    _user ? Object.assign(user, {password: _user.password}) && cb(err) :
                        cb(err || new NotFoundError('User'))
                ),
                cb => argon2.verify(user.password, req.body.password).then(r =>
                    cb(r ? null : new AuthError('Password invalid'))
                ),
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
