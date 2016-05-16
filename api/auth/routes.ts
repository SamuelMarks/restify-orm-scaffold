import * as restify from 'restify';
import * as async from 'async';
import {Query} from 'waterline';
import {mk_valid_body_mw, has_body} from './../../utils/validators';
import {collections} from './../../main';
import {NotFoundError, fmtError} from './../../utils/errors';
import {has_auth} from './middleware';
import {AccessToken} from './models';

const user_schema: tv4.JsonSchema = require('./../../test/api/user/schema');

export function login(app: restify.Server, namespace: string = ""): void {
    app.post(namespace, has_body, mk_valid_body_mw(user_schema),
        function (req: restify.Request, res: restify.Response, next: restify.Next) {
            const User: Query = collections['user_tbl'];

            async.waterfall([
                cb => User.findOne({
                        email: req.body.email,
                        password: req.body.password // LOL
                    }, (err: any, user) =>
                        cb(err ? err : !user ? new NotFoundError('User') : null)
                ),
                cb => cb(null, AccessToken().add(req.body.email, 'login'))
            ], (error: any, access_token: string) => {
                if (error) return next(fmtError(error));
                res.setHeader('X-Access-Token', access_token);
                res.json(201, {access_token: access_token});
                return next();
            });
        }
    );
}

export function logout(app: restify.Server, namespace: string = ""): void {
    app.del(namespace, has_auth('login'),
        function (req: restify.Request, res: restify.Response, next: restify.Next) {
            AccessToken().logout(
                {access_token: req.headers['x-access-token']}, (error) => {
                    if (error) res.json(400, error);
                    else res.send(204);
                    return next();
                })
        }
    );
}
