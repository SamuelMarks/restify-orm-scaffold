import { map, series, waterfall } from 'async';
import { expect } from 'chai';
import { IModelRoute } from 'nodejs-utils';
import { Server } from 'restify';
import { IOrmsOut, strapFramework, tearDownWaterlineConnections } from 'restify-orm-framework';
import * as supertest from 'supertest';
import { Connection } from 'waterline';

import { IUserBase } from '../../../api/user/models.d';
import { all_models_and_routes_as_mr, c, strapFrameworkKwargs } from '../../../main';
import { IAuthSdk } from '../auth/auth_test_sdk.d';
import { AccessToken } from './../../../api/auth/models';
import { AuthTestSDK } from './../auth/auth_test_sdk';
import { user_mocks } from './user_mocks';

const models_and_routes: IModelRoute = {
    user: all_models_and_routes_as_mr['user'],
    auth: all_models_and_routes_as_mr['auth'],
};

process.env['NO_SAMPLE_DATA'] = 'true';

const mocks: IUserBase[] = user_mocks.successes.slice(10, 20);

describe('User::routes', () => {
    let sdk: IAuthSdk;
    let app: Server;

    before(done =>
        series([
            cb => tearDownWaterlineConnections(c.connections, cb),
            cb => strapFramework(Object.assign({}, strapFrameworkKwargs, {
                models_and_routes,
                createSampleData: false,
                skip_start_app: true,
                skip_redis: false,
                skip_typeorm: true,
                skip_waterline: false,
                app_name: 'test-user-api',
                callback: (err, _app: Server, orms_out: IOrmsOut) => {
                    if (err != null) return cb(err);
                    c.connections = orms_out.waterline.connection;
                    c.collections = orms_out.waterline.collections;

                    app = _app;
                    sdk = new AuthTestSDK(app);
                    return cb();
                }
            }))], done)
    );

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
                        err ? cb(err) : cb(null, res.body['access_token'])
                    ),
                    (access_token, cb) =>
                        sdk.get_user(access_token, mocks[1], cb)
                ],
                done
            )
        );

        it('PUT should edit user', done =>
            waterfall([
                    cb => sdk.register(mocks[2], (err, _) => cb(err)),
                    cb => sdk.login(mocks[2], (err, res) =>
                        err != null ? cb(err) : cb(null, res.body['access_token'])
                    ),
                    (access_token, cb) =>
                        supertest(app)
                            .put('/api/user')
                            .set('X-Access-Token', access_token)
                            .set('Connection', 'keep-alive')
                            .send({ title: 'Mr' })
                            .end(cb)
                    ,
                    (r, cb) => {
                        if (r.statusCode / 100 >= 3) return cb(new Error(JSON.stringify(r.text, null, 4)));
                        let err: Chai.AssertionError = null;
                        try {
                            expect(r.body).to.have.all.keys(['createdAt', 'email', 'roles', 'title', 'updatedAt']);
                            expect(r.body.title).equals('Mr');
                        } catch (e) {
                            err = e as Chai.AssertionError;
                        } finally {
                            cb(err);
                        }
                    }
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
                        err ? cb(err) : cb(null, res.body['access_token'])
                    ),
                    (access_token, cb) =>
                        sdk.unregister({ access_token }, err =>
                            cb(err, access_token)
                        )
                    ,
                    (access_token, cb) => AccessToken.get().findOne(access_token, e =>
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
