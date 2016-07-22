import * as supertest from 'supertest';
import {expect} from 'chai';
import {series, waterfall} from 'async';
import {IModelRoute} from 'nodejs-utils';
import {strapFramework} from 'restify-utils';
import {all_models_and_routes, strapFrameworkKwargs, IObjectCtor, c} from './../../../main';
import {AuthTestSDK} from './../auth/auth_test_sdk';
import {AccessToken} from './../../../api/auth/models';
import {user_mocks} from './user_mocks';
import {tearDownConnections} from '../../shared_tests';
import {Collection, Connection} from 'waterline';
import {Server} from 'restify';
import {ITestSDK} from '../auth/auth_test_sdk.d';

declare var Object: IObjectCtor;

const user_models_and_routes: IModelRoute = {
    user: all_models_and_routes['user'],
    auth: all_models_and_routes['auth'],
};

process.env.NO_SAMPLE_DATA = true;


describe('User::routes', () => {
    let sdk: ITestSDK, app: Server;

    before(done =>
        series([
            cb => tearDownConnections(c.connections, cb),
            cb => strapFramework(Object.assign({}, strapFrameworkKwargs, {
                models_and_routes: user_models_and_routes,
                createSampleData: false,
                start_app: false,
                use_redis: true,
                app_name: 'test-user-api',
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

    describe('/api/user', () => {
        beforeEach(done => sdk.unregister_all(user_mocks.successes, () => done()));
        afterEach(done => sdk.unregister_all(user_mocks.successes, () => done()));

        it('POST should create user', done =>
            sdk.register(user_mocks.successes[0], done)
        );

        it('GET should retrieve user', done =>
            waterfall([
                    cb => sdk.register(user_mocks.successes[1], err => cb(err)),
                    cb => sdk.login(user_mocks.successes[1], (err, res) =>
                        err ? cb(err) : cb(null, res.body.access_token)
                    ),
                    (access_token, cb) =>
                        sdk.get_user(access_token, user_mocks.successes[1], cb)
                ],
                done
            )
        );

        it('PUT should edit user', done =>
            waterfall([
                    cb => sdk.register(user_mocks.successes[2], err => cb(err)),
                    cb => sdk.login(user_mocks.successes[2], (err, res) =>
                        err ? cb(err) : cb(null, res.body.access_token)
                    ),
                    (access_token, cb) =>
                        supertest(app)
                            .put('/api/user')
                            .set({'X-Access-Token': access_token})
                            .send({title: 'Mr'})
                            .end(cb)
                    ,
                    (r, cb) => {
                        if (r.statusCode / 100 >= 3) return cb(new Error(JSON.stringify(r.text, null, 4)));
                        expect(r.body).to.have.all.keys(['createdAt', 'email', 'title', 'updatedAt']);
                        expect(r.body.title).equals('Mr');
                        return cb();
                    }
                ],
                done
            )
        );

        it('DELETE should unregister user', done =>
            waterfall([
                    cb => sdk.register(user_mocks.successes[3], err => cb(err)),
                    cb => sdk.login(user_mocks.successes[3], (err, res) =>
                        err ? cb(err) : cb(null, res.body.access_token)
                    ),
                    (access_token, cb) =>
                        sdk.unregister({access_token: access_token}, err =>
                            cb(err, access_token)
                        )
                    ,
                    (access_token, cb) => AccessToken().findOne(access_token, e =>
                        cb(!e ? new Error('Access token wasn\'t invalidated/removed') : null)
                    ),
                    cb => sdk.login(user_mocks.successes[3], e =>
                        cb(!e ? new Error('User can login after unregister') : null)
                    )
                ],
                done
            )
        );
    });
});
