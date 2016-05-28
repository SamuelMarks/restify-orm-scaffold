import * as async from 'async';
import {main, all_models_and_routes} from './../../../main';
import {AuthTestSDK} from './../auth/auth_test_sdk';
import {AccessToken} from './../../../api/auth/models';
import {user_mocks} from './../user/user_mocks';
import {ITestSDK} from './auth_test_sdk.d';
import {IModelRoute} from 'nodejs-utils';

const user_models_and_routes: IModelRoute = {
    user: all_models_and_routes['user'],
    auth: all_models_and_routes['auth'],
};

process.env.NO_SAMPLE_DATA = true;

describe('Auth::routes', () => {
    before(done => main(user_models_and_routes,
        (app, connections) => {
            this.connections = connections;
            this.app = app;
            this.sdk = new AuthTestSDK(this.app);
            done();
        }
    ));

    // Deregister database adapter connections
    after(done =>
        async.parallel(Object.keys(this.connections).map(
            connection => this.connections[connection]._adapter.teardown
        ), done)
    );

    describe('/api/auth', () => {
        beforeEach(done => this.sdk.unregister_all(user_mocks.successes, () => done()));
        afterEach(done => this.sdk.unregister_all(user_mocks.successes, () => done()));

        it('POST should login user', (done) => {
            async.series([
                    cb => this.sdk.register(user_mocks.successes[1], cb),
                    cb => this.sdk.login(user_mocks.successes[1], cb)
                ],
                done
            );
        });

        it('DELETE should logout user', (done) => {
            const sdk: ITestSDK = this.sdk;
            async.waterfall([
                    cb => this.sdk.register(user_mocks.successes[1], cb),
                    (_, cb) => sdk.login(user_mocks.successes[1], (err, res) =>
                        err ? cb(err) : cb(null, res.body.access_token)
                    ),
                    (access_token, cb) =>
                        sdk.logout(access_token, (err, res) =>
                            cb(err, access_token)
                        )
                    ,
                    (access_token, cb) =>
                        AccessToken().findOne(access_token, (e, r) =>
                            cb(!e ? new Error("Access token wasn't invalidated/removed") : null)
                        )
                ],
                done
            )
        });
    });
});
