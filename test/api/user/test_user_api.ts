import * as supertest from 'supertest';
import {expect} from 'chai';
import * as async from 'async';
import {main, all_models_and_routes} from './../../../main';
import {AuthTestSDK} from './../auth/auth_test_sdk';
import {AccessToken} from './../../../api/auth/models';
import {user_mocks} from './user_mocks';
import {IModelRoute} from 'nodejs-utils';

const user_models_and_routes: IModelRoute = {
    user: all_models_and_routes['user'],
    auth: all_models_and_routes['auth'],
};

process.env.NO_SAMPLE_DATA = true;

describe('User::routes', () => {
    before(done => main(user_models_and_routes,
        (app, connections) => {
            this.connections = connections;
            this.app = app;
            this.sdk = new AuthTestSDK(this.app);
            return done();
        }
    ));

    // Deregister database adapter connections
    after(done =>
        this.connections && async.parallel(Object.keys(this.connections).map(
            connection => this.connections[connection]._adapter.teardown
        ), done)
    );

    describe('/api/user', () => {
        beforeEach(done => this.sdk.unregister_all(user_mocks.successes, () => done()));
        afterEach(done => this.sdk.unregister_all(user_mocks.successes, () => done()));

        it('POST should create user', (done) => {
            this.sdk.register(user_mocks.successes[0], done);
        });

        it('GET should retrieve user', (done) => {
            async.waterfall([
                    cb => this.sdk.register(user_mocks.successes[1], cb),
                    (_, cb) => this.sdk.login(user_mocks.successes[1], (err, res) =>
                        err ? cb(err) : cb(null, res.body.access_token)
                    ),
                    (access_token, cb) =>
                        this.sdk.get_user(access_token, user_mocks.successes[1], cb)
                ],
                done
            );
        });

        it('PUT should edit user', (done) => {
            async.waterfall([
                    cb => this.sdk.register(user_mocks.successes[2], cb),
                    (_, cb) => this.sdk.login(user_mocks.successes[2], (err, res) =>
                        err ? cb(err) : cb(null, res.body.access_token)
                    ),
                    (access_token, cb) =>
                        supertest(this.app)
                            .put('/api/user')
                            .set({'X-Access-Token': access_token})
                            .send({title: 'Mr'})
                            .end(cb)
                    ,
                    (r, cb) => {
                        if (r.statusCode / 100 >= 3) return cb(new Error(JSON.stringify(r.text, null, 4)));
                        expect(Object.keys(r.body).sort()).to.deep.equal(['createdAt', 'email', 'title', 'updatedAt']);
                        expect(r.body.title).equals('Mr');
                        return cb();
                    }
                ],
                done
            );
        });

        it('DELETE should unregister user', done =>
            async.waterfall([
                    cb => this.sdk.register(user_mocks.successes[3], cb),
                    (_, cb) => this.sdk.login(user_mocks.successes[3], (err, res) =>
                        err ? cb(err) : cb(null, res.body.access_token)
                    ),
                    (access_token, cb) =>
                        this.sdk.unregister({access_token: access_token}, err =>
                            cb(err, access_token)
                        )
                    ,
                    (access_token, cb) => AccessToken().findOne(access_token, e =>
                        cb(!e ? new Error('Access token wasn\'t invalidated/removed') : null)
                    ),
                    cb => this.sdk.login(user_mocks.successes[3], e =>
                        cb(!e ? new Error('User can login after unregister') : null)
                    )
                ],
                done
            )
        );
    });
});
