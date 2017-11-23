import { map, waterfall } from 'async';
import { createLogger } from 'bunyan';
import { IModelRoute, model_route_to_map } from 'nodejs-utils';
import { IOrmsOut, tearDownConnections } from 'orm-mw';
import { basename } from 'path';
import { Server } from 'restify';

import { User } from '../../../api/user/models';
import { _orms_out, typeorm_config } from '../../../config';
import { all_models_and_routes_as_mr, setupOrmApp } from '../../../main';
import { IAuthSdk } from '../auth/auth_test_sdk.d';
import { AccessToken } from './../../../api/auth/models';
import { AuthTestSDK } from './../auth/auth_test_sdk';
import { user_mocks } from './user_mocks';
import { UserTestSDK } from './user_test_sdk';

const models_and_routes: IModelRoute = {
    user: all_models_and_routes_as_mr['user'],
    auth: all_models_and_routes_as_mr['auth'],
};

process.env['NO_SAMPLE_DATA'] = 'true';

const mocks: User[] = user_mocks.successes.slice(10, 20);
const tapp_name = `test::${basename(__dirname)}`;
const logger = createLogger({ name: tapp_name });

describe('User::routes', () => {
    let sdk: IAuthSdk;
    let app: Server;

    before(done =>
        waterfall([
                cb => tearDownConnections(_orms_out.orms_out, e => cb(e)),
                cb => AccessToken.reset() || cb(void 0),
                cb => setupOrmApp(
                    model_route_to_map(models_and_routes), {
                        logger,
                        orms_in: {
                            typeorm: { skip: false, config: typeorm_config },
                            redis: { skip: false },
                            sequelize: { skip: true },
                            waterline: { skip: true }
                        }
                    },
                    { skip_start_app: true, app_name: tapp_name, logger },
                    cb
                ),
                (_app: Server, orms_out: IOrmsOut, cb) => {
                    app = _app;
                    _orms_out.orms_out = orms_out;

                    sdk = new AuthTestSDK(_app);

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

    describe('/api/user', () => {
        beforeEach(done => sdk.unregister_all(mocks, () => done()));
        afterEach(done => sdk.unregister_all(mocks, () => done()));

        it('POST should create user', done =>
            sdk.register(mocks[0], done)
        );

        it('GET should retrieve user', done =>
            waterfall([
                    cb => sdk.register(mocks[1], err => cb(err)),
                    cb => sdk.login(mocks[1], (err, res) =>
                        err ? cb(err) : cb(void 0, res.body['access_token'])
                    ),
                    (access_token, cb) =>
                        sdk.get_user(access_token, mocks[1], cb)
                ],
                done
            )
        );

        it('PUT should update user', done =>
            waterfall([
                    cb => sdk.register(mocks[2], err => cb(err)),
                    cb => sdk.login(mocks[2], (err, res) =>
                        err ? cb(err) : cb(void 0, res.body['access_token'])
                    ),
                    (access_token, cb) => (new UserTestSDK(app)).update({ title: 'Sir' }, access_token,
                        (e, r) => cb(e, r, access_token)),
                    (user, access_token, cb) => sdk.get_user(access_token, user, cb)
                ],
                done
            )
        );

        type AccessTokenType = string;
        it('GET /users should get all users', done =>
            map(mocks.slice(4, 10), sdk.register_login.bind(sdk), (err, res: AccessTokenType[]) =>
                err ? done(err) : sdk.get_all(res[0], done)
            )
        );

        it('DELETE should unregister user', done =>
            waterfall([
                    cb => sdk.register(mocks[3], err => cb(err)),
                    cb => sdk.login(mocks[3], (err, res) =>
                        err ? cb(err) : cb(void 0, res.body['access_token'])
                    ),
                    (access_token, cb) =>
                        sdk.unregister({ access_token }, err =>
                            cb(err, access_token)
                        )
                    ,
                    (access_token, cb) =>
                        AccessToken
                            .get(_orms_out.orms_out.redis.connection)
                            .findOne(access_token, e =>
                                cb(e != null && e.message === 'Nothing associated with that access token' ? null : e)
                            ),
                    cb => sdk.login(mocks[3], e => cb(
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
