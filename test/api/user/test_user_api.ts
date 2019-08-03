import * as path from 'path';
import { basename } from 'path';

import { asyncify, map, waterfall } from 'async';
import { createLogger } from 'bunyan';
import { expect } from 'chai';
import { Server } from 'restify';

import { exceptionToErrorResponse, model_route_to_map } from '@offscale/nodejs-utils';
import { AccessTokenType, IModelRoute, IncomingMessageError } from '@offscale/nodejs-utils/interfaces';
import { IOrmsOut } from '@offscale/orm-mw/interfaces';

import { AccessToken } from '../../../api/auth/models';
import { User } from '../../../api/user/models';
import { _orms_out } from '../../../config';
import { all_models_and_routes_as_mr, setupOrmApp } from '../../../main';
import { AuthTestSDK } from '../auth/auth_test_sdk';
import { closeApp, tearDownConnections, unregister_all } from '../../shared_tests';
import { user_mocks } from './user_mocks';
import { UserTestSDK } from './user_test_sdk';

const models_and_routes: IModelRoute = {
    user: all_models_and_routes_as_mr['user'],
    auth: all_models_and_routes_as_mr['auth'],
};

process.env['NO_SAMPLE_DATA'] = 'true';

const mocks: User[] = user_mocks.successes.slice(12, 24);

const tapp_name = `test::${basename(__dirname)}`;
const connection_name = `${tapp_name}::${path.basename(__filename).replace(/\./g, '-')}`;

const logger = createLogger({ name: tapp_name });

describe('User::routes', () => {
    let sdk: UserTestSDK;
    let auth_sdk: AuthTestSDK;
    let app: Server;

    before('app & db', done => {
        waterfall([
                tearDownConnections,
                cb => typeof AccessToken.reset() === 'undefined' && cb(void 0),
                cb => setupOrmApp(model_route_to_map(models_and_routes),
                    { logger, connection_name },
                    { skip_start_app: true, app_name: tapp_name, logger },
                    cb
                ),
                (_app: Server, orms_out: IOrmsOut, cb) => {
                    app = _app;
                    _orms_out.orms_out = orms_out;

                    sdk = new UserTestSDK(_app);
                    auth_sdk = new AuthTestSDK(_app);

                    return cb(void 0);
                },
                cb => unregister_all(auth_sdk, mocks).then(() => cb(void 0)).catch(cb)
            ],
            done
        );
    });

    after('unregister_all', async () => unregister_all(auth_sdk, mocks));
    after('tearDownConnections', done => tearDownConnections(_orms_out.orms_out, done));
    after('closeApp', done => closeApp(sdk.app)(done));

    describe('/api/user', () => {
        it('POST should create user', async () =>
            await sdk.register(mocks[0])
        );

        it('POST should fail to register user twice', async () => {
            const user_mock = mocks[1];
            try {
                await auth_sdk.login(user_mock);
            } catch (e) {
                expect(exceptionToErrorResponse(e).code).to.eql('NotFoundError');
                await sdk.register(user_mock);
            }

            let has_error = false;
            const expected_err = 'E_UNIQUE';
            try {
                await sdk.register(user_mock);
            } catch (err) {
                has_error = true;
                const error_obj = exceptionToErrorResponse(err);
                expect(error_obj).to.have.property('error');
                expect(error_obj.error).to.eql(expected_err);
            }
            if (!has_error) throw Error(`Expected ${expected_err} error`);
        });

        it('GET should retrieve user', async () => {
            const user_mock = mocks[2];
            const access_token = await auth_sdk.register_login(user_mock);
            await sdk.read(access_token, user_mock);
        });

        it('PUT should update user', async () => {
            const user_mock = mocks[3];
            let resp = await sdk.register(user_mock);
            const access_token = resp.header['x-access-token'];
            resp = await sdk.update(access_token, void 0, { title: 'Sir' });
            await sdk.read(access_token, resp.body);
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
            const user_mock = mocks[10];
            try {
                await sdk.register(user_mock);
            } catch (e) {
                if (exceptionToErrorResponse(e).error !== 'E_UNIQUE')
                    throw e;
            }
            const res = await auth_sdk.login(user_mock);
            const access_token: AccessTokenType = res.body['access_token'];
            await sdk.unregister({ access_token });
            try {
                await AccessToken
                    .get(_orms_out.orms_out.redis!.connection)
                    .findOne(access_token);
            } catch (e) {
                if (exceptionToErrorResponse(e).error_message !== 'Nothing associated with that access token')
                    throw e;
            }

            try {
                await auth_sdk.login(user_mock);
            } catch (e) {
                if (exceptionToErrorResponse(e).error_message !== 'User not found')
                    throw e;
            }
        });
    });
});
