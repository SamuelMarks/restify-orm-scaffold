import * as argon2 from 'argon2';
import { waterfall } from 'async';
import { AuthError, fmtError, NotFoundError } from 'custom-restify-errors';
import { IOrmReq } from 'orm-mw';
import * as restify from 'restify';
import { has_body, mk_valid_body_mw } from 'restify-validators';
import { JsonSchema } from 'tv4';
import { Query } from 'waterline';

import { IUser } from '../user/models.d';
import { has_auth } from './middleware';
import { AccessToken } from './models';
// import { hash_password, verify_password } from '../user/models';

/* tslint:disable:no-var-requires */
const user_schema: JsonSchema = require('./../../test/api/user/schema');

export const login = (app: restify.Server, namespace: string = ''): void => {
    app.post(namespace, has_body, mk_valid_body_mw(user_schema),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            const User: Query = req.getOrm().waterline.collections['user_tbl'];

            waterfall([
                cb => User.findOne({ email: req.body.email }).exec((err: any, user: IUser) => {
                    if (err != null) return cb(err);
                    else if (user == null) return cb(new NotFoundError('User'));
                    return cb(err, user);
                }),
                (user: IUser, cb) => argon2.verify(user.password, req.body.password).then(valid =>
                    cb(valid ? null : new AuthError('Password invalid'), user)
                ),
                (user: IUser, cb) =>
                    AccessToken.get(req.getOrm().redis.connection).add(req.body.email, user.roles, 'login', cb)
            ], (error: any, access_token: string) => {
                if (error != null) return next(fmtError(error));
                res.setHeader('X-Access-Token', access_token);
                res.json(201, { access_token });
                return next();
            });
        }
    );
};

export const logout = (app: restify.Server, namespace: string = ''): void => {
    app.del(namespace, has_auth(),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            AccessToken
                .get(req.getOrm().redis.connection)
                .logout({ access_token: req.headers['x-access-token'] as string }, error => {
                    if (error != null) res.json(400, error);
                    else res.send(204);
                    return next();
                });
        }
    );
};
