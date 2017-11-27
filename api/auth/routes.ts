import * as argon2 from 'argon2';
import { waterfall } from 'async';
import { AuthError, fmtError, NotFoundError } from 'custom-restify-errors';
import { IOrmReq } from 'orm-mw';
import * as restify from 'restify';
import { has_body, mk_valid_body_mw } from 'restify-validators';
import { JsonSchema } from 'tv4';
import { User } from '../user/models';

import { has_auth } from './middleware';
import { AccessToken } from './models';
// import { hash_password, verify_password } from '../user/models';

/* tslint:disable:no-var-requires */
const user_schema: JsonSchema = require('./../../test/api/user/schema');

export const login = (app: restify.Server, namespace: string = ''): void => {
    app.post(namespace, has_body, mk_valid_body_mw(user_schema),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            waterfall([
                cb => req.getOrm().typeorm.connection
                    .getRepository(User)
                    .findOne({
                        select: ['password', 'email', 'roles'],
                        where: { email: req.body.email }
                    })
                    .then((user: User) => {
                        if (user == null) return cb(new NotFoundError('User'));
                        return cb(void 0, user);
                    })
                    .catch(cb),
                (user: User, cb) =>
                    argon2
                        .verify(user.password, req.body.password)
                        .then(valid => cb(valid ? null : new AuthError('Password invalid'), user)),
                (user: User, cb) =>
                    AccessToken
                        .get(req.getOrm().redis.connection)
                        .add(user.email, User.rolesAsStr(user.roles), 'access', (err, at) => {
                            user.access_token = at;
                            User._omit.forEach(attr => delete user[attr]);
                            return cb(err, user);
                        })
            ], (error: any, user: User) => {
                if (error != null) return next(fmtError(error));
                res.setHeader('X-Access-Token', user.access_token);
                res.json(201, user);
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
