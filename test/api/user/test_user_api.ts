import * as path from 'path';
import { basename } from 'path';

import { asyncify, map, waterfall } from 'async';
import { createLogger } from 'bunyan';
import { expect } from 'chai';
import { Server } from 'restify';

import { model_route_to_map } from '@offscale/nodejs-utils';
import { AccessTokenType, IModelRoute, IncomingMessageError } from '@offscale/nodejs-utils/interfaces';
import { tearDownConnections } from '@offscale/orm-mw';
import { IOrmsOut } from '@offscale/orm-mw/interfaces';

import { AccessToken } from '../../../api/auth/models';
import { User } from '../../../api/user/models';
import { _orms_out } from '../../../config';
import { all_models_and_routes_as_mr, setOrmReq, setupOrmApp } from '../../../main';
import { AuthTestSDK } from '../auth/auth_test_sdk';
import { user_mocks } from './user_mocks';
import { UserTestSDK } from './user_test_sdk';

const models_and_routes: IModelRoute = {
    user: all_models_and_routes_as_mr['user'],
    auth: all_models_and_routes_as_mr['auth'],
};

process.env['NO_SAMPLE_DATA'] = 'true';

const mocks: User[] = user_mocks.successes.slice(10, 20);

const tapp_name = `test::${basename(__dirname)}`;
const connection_name = `${tapp_name}::${path.basename(__filename).replace(/\./g, '-')}`;

const logger = createLogger({ name: tapp_name });

describe('User::routes', () => {
    let sdk: UserTestSDK;
    let auth_sdk: AuthTestSDK;
    let app: Server;

    before('app & db', done => {
        waterfall([
                cb => tearDownConnections(_orms_out.orms_out, e => cb(e)),
                cb => typeof AccessToken.reset() === 'undefined' && cb(void 0),
                cb => setupOrmApp(model_route_to_map(models_and_routes),
                    { logger, connection_name },
                    { skip_start_app: true, app_name: tapp_name, logger },
                    cb
                ),
                (_app: Server, orms_out: IOrmsOut, cb) => {
                    setOrmReq(_app, orms_out);
                    app = _app;
                    _orms_out.orms_out = orms_out;

                    sdk = new UserTestSDK(_app);
                    auth_sdk = new AuthTestSDK(_app);

                    return cb(void 0);
                }
            ],
            done
        );
    });

    after('tearDownConnections', done => tearDownConnections(_orms_out.orms_out, done));
    after('closeApp', done =>
        sdk.app.close(() => {
            sdk = undefined as any;
            return done(void 0);
        })
    );

    describe('/api/user', () => {
        beforeEach('unregistered_all', async () => {
            try {
                await auth_sdk.unregister_all(mocks);
            } catch {
                //
            }
        });
        afterEach('unregister_all', async () => {
            try {
                await auth_sdk.unregister_all(mocks);
            } catch {
                //
            }
        });

        it('POST should create user', done => {
            sdk.register(mocks[0]).then(() => done()).catch(done);
        });

        it('POST should fail to register user twice', async () => {
            const user_mock = mocks[1];
            await sdk.register(user_mock);
            let has_error = false;
            const expected_err = 'E_UNIQUE';
            try {
                await sdk.register(user_mock);
            } catch (err) {
                has_error = true;
                expect(err['text']).to.contain(expected_err);
            }
            if (!has_error) throw Error(`Expected ${expected_err} error; got nothing`);
        });

        it('GET should retrieve user', async () => {
            const user_mock = mocks[2];
            const access_token = await auth_sdk.register_login(user_mock);
            await sdk.read(access_token, user_mock);
        });

        it('PUT should update user', async () => {
            const user_mock = mocks[2];
            const access_token = await auth_sdk.register_login(user_mock);
            await sdk.read(access_token, user_mock);
            const response = await sdk.update(access_token, void 0, { title: 'Sir' });
            await sdk.read(access_token, response.body);
        });

        it('GET /users should get all users', done =>
            map(mocks.slice(4, 10), asyncify(auth_sdk.register_login.bind(auth_sdk)),
                (err: Error | IncomingMessageError | null | undefined,
                 res: undefined | Array<AccessTokenType | undefined>) =>
                    err != null ? done(err)
                        : sdk.get_all((res as string[])[4])
                            .then(() => done())
                            .catch(done)
            )
        );

        it('DELETE should unregister user', async () => {
            const user_mock = mocks[5];
            await sdk.register(user_mock);
            const res = await auth_sdk.login(user_mock);
            const access_token: AccessTokenType = res.body['access_token'];
            await sdk.unregister({ access_token });
            AccessToken
                .get(_orms_out.orms_out.redis!.connection)
                .findOne(access_token, err => {
                    if (err != null)
                        if (err.message !== 'Nothing associated with that access token')
                            throw err;

                    auth_sdk.login(user_mock)
                        .then(() => void 0)
                        .catch(e => {
                            if (e != null && typeof e['text'] !== 'undefined' && e['text'] !== JSON.stringify({
                                code: 'NotFoundError', message: 'User not found'
                            }))
                                throw e;
                        });
                });
        });
    });
});
