import { series, waterfall } from 'async';
import { IModelRoute } from 'nodejs-utils';
import { strapFramework } from 'restify-utils';
import { Server } from 'restify';
import { Collection, Connection } from 'waterline';
import { expect } from 'chai';
import { all_models_and_routes, c, IObjectCtor, strapFrameworkKwargs } from './../../../main';
import { IUserBase } from '../../../api/user/models.d';
import { AuthTestSDK } from './../auth/auth_test_sdk';
import { AccessToken } from './../../../api/auth/models';
import { getError, tearDownConnections } from '../../shared_tests';
import { user_mocks } from '../user/user_mocks';
import { IAuthSdk } from './auth_test_sdk.d';
import { IncomingMessageError } from '../../share_interfaces';
import IAssertionError = Chai.AssertionError;

declare const Object: IObjectCtor;

const models_and_routes: IModelRoute = {
    user: all_models_and_routes['user'],
    auth: all_models_and_routes['auth']
};

process.env['NO_SAMPLE_DATA'] = 'true';

const mocks: IUserBase[] = user_mocks.successes.slice(0, 10);

describe('Auth::routes', () => {
    let sdk: IAuthSdk;
    let app: Server;

    before(done =>
        series([
            cb => tearDownConnections(c.connections, cb),
            cb => strapFramework(Object.assign({}, strapFrameworkKwargs, {
                models_and_routes,
                createSampleData: false,
                start_app: false,
                use_redis: true,
                app_name: 'test-auth-api',
                callback: (err, _app, _connections: Connection[], _collections: Collection[]) => {
                    if (err) return cb(err);
                    c.connections = _connections;
                    c.collections = _collections;
                    app = _app;
                    sdk = new AuthTestSDK(app);
                    return cb();
                }
            }))], done)
    );

    // Deregister database adapter connections
    after(done => tearDownConnections(c.connections, done));

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

        it('POST should fail to register user', done => {
            series([
                    cb => sdk.register(mocks[2], cb),
                    cb => sdk.register(mocks[2], cb)
                ],
                (err: Error) => {
                    if (err) {
                        const expected_err = 'duplicate key value violates unique constraint';
                        try {
                            expect(err.message).to.contain(expected_err);
                            err = null;
                        } catch (e) {
                            err = e as IAssertionError;
                        } finally {
                            done(err);
                        }
                    }
                    /* tslint:disable:one-line */
                    else return done();
                }
            );
        });

        it('DELETE should logout user', done => {
            waterfall([
                    cb => sdk.register(mocks[1], (err: IncomingMessageError) => {
                            const e = getError(err);
                            return cb(e && e.error_code ?
                                (['E_VALIDATION', 'E_UNIQUE'].indexOf(e.error_code) > -1 ? null : err)
                                : err);
                        }
                    ),
                    cb => sdk.login(mocks[1], (err, res) =>
                        err ? cb(err) : cb(null, res.body.access_token)
                    ),
                    (access_token, cb) =>
                        sdk.logout(access_token, (err, res) =>
                            cb(err, access_token)
                        )
                    ,
                    (access_token, cb) =>
                        AccessToken().findOne(access_token, e =>
                            cb(!e ? new Error('Access token wasn\'t invalidated/removed') : null)
                        )
                ],
                done
            );
        });
    });
});
