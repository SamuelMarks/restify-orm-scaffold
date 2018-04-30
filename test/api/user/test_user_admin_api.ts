import { map, waterfall } from 'async';
import { createLogger } from 'bunyan';
import { AccessTokenType, IModelRoute, model_route_to_map } from 'nodejs-utils';
import { IOrmsOut, tearDownConnections } from 'orm-mw';
import { basename } from 'path';
import { Server } from 'restify';

import { AccessToken } from '../../../api/auth/models';
import { User } from '../../../api/user/models';
import { _orms_out } from '../../../config';
import { all_models_and_routes_as_mr, setupOrmApp } from '../../../main';
import { AuthTestSDK } from '../auth/auth_test_sdk';
import { user_mocks } from './user_mocks';
import { UserTestSDK } from './user_test_sdk';

const models_and_routes: IModelRoute = {
    user: all_models_and_routes_as_mr['user'],
    auth: all_models_and_routes_as_mr['auth'],
};

process.env['NO_SAMPLE_DATA'] = 'true';

const mocks: User[] = user_mocks.successes.slice(20, 30);
const tapp_name = `test::${basename(__dirname)}`;
const logger = createLogger({ name: tapp_name });

describe('User::admin::routes', () => {
    let sdk: UserTestSDK;
    let auth_sdk: AuthTestSDK;
    let app: Server;

    before(done =>
        waterfall([
                cb => tearDownConnections(_orms_out.orms_out, e => cb(e)),
                cb => AccessToken.reset() || cb(void 0),
                cb => setupOrmApp(
                    model_route_to_map(models_and_routes), { logger },
                    { skip_start_app: true, app_name: tapp_name, logger },
                    cb
                ),
                (_app: Server, orms_out: IOrmsOut, cb) => {
                    app = _app;
                    _orms_out.orms_out = orms_out;

                    sdk = new UserTestSDK(_app);
                    auth_sdk = new AuthTestSDK(_app);

                    return cb(void 0);
                }
            ],
            done
        )
    );

    after('tearDownConnections', done => tearDownConnections(_orms_out.orms_out, done));
    after('closeApp', done => sdk.app.close(done));
    after('destroy objects', done => {
        Object.keys(this).forEach(k => delete this[k]);
        return done();
    });

    describe('ADMIN /api/user/:email', () => {
        before(done => map(mocks, (user, cb) => sdk.register(user, (err, res) => {
                if (err != null) return cb(err);
                user.access_token = res.header['x-access-token'];
                return cb(void 0);
            }),
            done)
        );
        after(done => auth_sdk.unregister_all(mocks, () => done()));

        it('GET should retrieve other user', done => {
            sdk.read(mocks[0].access_token, mocks[2], done);
        });

        it('PUT should update other user', done =>
            waterfall([
                    cb => sdk.update(mocks[1].access_token, void 0, { title: 'Sir' },
                        (e, r) => cb(e, r, mocks[1].access_token)),
                    (user: User, access_token: AccessTokenType, cb) =>
                        sdk.read(access_token, user, cb)
                ],
                done
            )
        );

        it('GET /api/users should get all users', done => {
            sdk.get_all(mocks[0].access_token, done);
        });

        it('DELETE should unregister other user', done =>
            waterfall([
                    cb => sdk.register(mocks[5], err => cb(err)),
                    cb => auth_sdk.login(mocks[5], (err, res) =>
                        err ? cb(err) : cb(void 0, res.body['access_token'])
                    ),
                    (access_token: AccessTokenType, cb) =>
                        sdk.unregister({ access_token }, err =>
                            cb(err, access_token)
                        )
                    ,
                    (access_token: AccessTokenType, cb) =>
                        AccessToken
                            .get(_orms_out.orms_out.redis.connection)
                            .findOne(access_token, e =>
                                cb(e != null && e.message === 'Nothing associated with that access token' ? null : e)
                            ),
                    cb => auth_sdk.login(mocks[5], e => cb(
                        e != null && typeof e['text'] !== 'undefined' && e['text'] !== JSON.stringify({
                            code: 'NotFoundError', message: 'User not found'
                        }) ? e : null)
                    )
                ],
                done
            )
        );
    });
});
