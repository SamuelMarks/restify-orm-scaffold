import { series, waterfall } from 'async';
import { createLogger } from 'bunyan';
import { expect } from 'chai';
import { IModelRoute, model_route_to_map } from 'nodejs-utils';
import { IOrmsOut, tearDownConnections } from 'orm-mw';
import { basename } from 'path';
import { Server } from 'restify';
import { WLError } from 'waterline';

import { AccessToken } from '../../../api/auth/models';
import { IUserBase } from '../../../api/user/models.d';
import { _orms_out } from '../../../config';
import { all_models_and_routes_as_mr, setupOrmApp } from '../../../main';
import { user_mocks } from '../user/user_mocks';
import { AuthTestSDK } from './../auth/auth_test_sdk';
import { IAuthSdk } from './auth_test_sdk.d';
import IAssertionError = Chai.AssertionError;

const models_and_routes: IModelRoute = {
    user: all_models_and_routes_as_mr['user'],
    auth: all_models_and_routes_as_mr['auth']
};

process.env['NO_SAMPLE_DATA'] = 'true';

const mocks: IUserBase[] = user_mocks.successes.slice(0, 10);

const tapp_name = `test::${basename(__dirname)}`;
const logger = createLogger({ name: tapp_name });

describe('Auth::routes', () => {
    let sdk: IAuthSdk;

    before(done =>
        waterfall([
                cb => tearDownConnections(_orms_out.orms_out, e => cb(e)),
                cb => AccessToken.reset() || cb(void 0),
                cb => setupOrmApp(model_route_to_map(models_and_routes), { logger },
                    { skip_start_app: true, app_name: tapp_name, logger },
                    cb
                ),
                (_app: Server, orms_out: IOrmsOut, cb) => {
                    _orms_out.orms_out = orms_out;

                    sdk = new AuthTestSDK(_app);

                    return cb(void 0);
                },
            ], done
        )
    );

    after('tearDownConnections', done => tearDownConnections(_orms_out.orms_out, done));

    describe('/api/auth', () => {
        beforeEach(done => sdk.unregister_all(mocks, () => done()));
        afterEach(done => sdk.unregister_all(mocks, () => done()));

        it('POST should login user', done => {
            series([
                    cb => sdk.register(mocks[1], cb),
                    cb => sdk.login(mocks[1], cb)
                ],
                done
            );
        });

        it('POST should fail to register user twice', done =>
            series([
                    cb => sdk.register(mocks[2], cb),
                    cb => sdk.register(mocks[2], cb)
                ],
                (err: WLError | Error) => {
                    if (err != null) {
                        const expected_err = 'E_UNIQUE';
                        try {
                            expect(err['text']).to.contain(expected_err);
                            err = null;
                        } catch (e) {
                            err = e as IAssertionError;
                        } finally {
                            done(err);
                        }
                    } else return done();
                }
            )
        );

        it('DELETE should logout user', done =>
            sdk.unregister_all([mocks[3]],
                (error: Error) => done(typeof error['text'] === 'string' && error['text'] === JSON.stringify({
                        code: 'NotFoundError',
                        message: 'User not found'
                    }) ? null : error
                )
            )
        );
    });
});
