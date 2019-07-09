// tslint:disable-next-line:no-var-requires
import { IRoutesMergerConfig } from '@offscale/routes-merger/interfaces';

import { waterfall } from 'async';
import { createLogger } from 'bunyan';
import { sanitiseSchema } from '@offscale/nodejs-utils';
import { ormMw, tearDownConnections } from '@offscale/orm-mw';
import { IOrmsOut } from '@offscale/orm-mw/interfaces';
import * as path from 'path';
import { basename } from 'path';

import { AccessToken } from '../../../api/auth/models';
import { User } from '../../../api/user/models';
import { _orms_out, getOrmMwConfig } from '../../../config';
import { all_models_and_routes_as_mr } from '../../../main';
import { user_mocks } from './user_mocks';
import { post, UserBodyReq, UserConfig } from '../../../api/user/sdk';

// tslint:disable-next-line:no-var-requires
const chai = require('chai');

// tslint:disable-next-line:no-var-requires
const chaiJsonSchema = require('chai-json-schema');

// tslint:disable-next-line:no-var-requires
const user_schema = sanitiseSchema(require('./../user/schema.json'), User._omit);

// @ts-ignore
chai.use(chaiJsonSchema);

const models_and_routes = new Map([
    ['user', all_models_and_routes_as_mr['user']],
    ['auth', all_models_and_routes_as_mr['auth']]
]);

process.env['NO_SAMPLE_DATA'] = 'true';

const mocks: User[] = user_mocks.successes.slice(10, 20);
const user_mock = mocks[3];

const tapp_name = `test::${basename(__dirname)}`;
const connection_name = `${tapp_name}::${path.basename(__filename).replace(/\./g, '-')}`;
const logger = createLogger({ name: tapp_name });

describe('User::sdk', () => {
    before(done =>
        waterfall([
                cb => tearDownConnections(_orms_out.orms_out, e => cb(e)),
                cb => typeof AccessToken.reset() === 'undefined' && cb(void 0),
                cb => ormMw(Object.assign({}, getOrmMwConfig(models_and_routes, logger, cb),
                    { connection_name, logger })),
                (with_app: IRoutesMergerConfig['with_app'], orms_out: IOrmsOut, cb) => {
                    _orms_out.orms_out = orms_out;
                    return cb(void 0);
                }
            ],
            done
        )
    );

    after(done => tearDownConnections(_orms_out.orms_out, done));

    describe('/api/user', () => {
        // beforeEach(done => auth_sdk.unregister_all(mocks).then(() => done()).catch(() => done()));
        // afterEach(done => auth_sdk.unregister_all(mocks).then(() => done()).catch(() => done()));

        it('POST should create user', done =>
            post({ body: user_mock, getOrm: () => _orms_out.orms_out } as unknown as UserBodyReq,
                UserConfig.instance)
                .then(user => {
                    let e: Chai.AssertionError | undefined = void 0;
                    try {
                        // @ts-ignore
                        expect(user).to.be.jsonSchema(user_schema);
                    } catch (err) {
                        e = err;
                    } finally {
                        done(e);
                    }
                })
                .catch(done)
        );

        /*
        it('POST should fail to register user twice', done =>
            Promise.all([sdk.register(mocks[1]), sdk.register(mocks[1])])
                .then(() => done(new EvalError('Expected failure; got success')))
                .catch((err: Error) => {
                        const expected_err = 'E_UNIQUE';
                        try {
                            expect(err['text']).to.contain(expected_err);
                            // @ts-ignore
                            err = null;
                        } catch (e) {
                            err = e as IAssertionError;
                        } finally {
                            done(err);
                        }
                    }
                )
        );

        it('GET should retrieve user', done => {
            auth_sdk.register_login(mocks[2])
                .then(access_token =>
                    sdk.read(access_token, mocks[2])
                        .then(() => done())
                        .catch(done)
                )
                .catch(done);
        });

        it('PUT should update user', done => {
            auth_sdk.register_login(mocks[2])
                .then(access_token =>
                    sdk.read(access_token, mocks[2])
                        .then(() => {
                            sdk.update(access_token, void 0, { title: 'Sir' })
                                .then((response) =>
                                    sdk.read(access_token, response.body)
                                        .then(() => done())
                                        .catch(done))
                                .catch(done);
                        })
                        .catch(done)
                )
                .catch(done);
        });

        it('GET /users should get all users', done =>
            map(mocks.slice(4, 10), asyncify(auth_sdk.register_login.bind(auth_sdk)),
                (err: Error | IncomingMessageError | null | undefined,
                 res: undefined | Array<AccessTokenType | undefined>) =>
                    err != null ? done(err) : sdk.get_all((res as string[])[4]).then(() => done()).catch(done)
            )
        );

        it('DELETE should unregister user', done =>
            waterfall([
                    cb => sdk.register(mocks[5]).then(() => cb()).catch(cb),
                    cb => auth_sdk.login(mocks[5])
                        .then(res => cb(void 0, res!.body['access_token']))
                        .catch(cb),
                    (access_token: AccessTokenType, cb) =>
                        sdk.unregister({ access_token })
                            .then(() => cb(void 0, access_token))
                            .catch(cb),
                    (access_token: AccessTokenType, cb) =>
                        AccessToken
                            .get(_orms_out.orms_out.redis!.connection)
                            .findOne(access_token, e =>
                                cb(e != null && e.message === 'Nothing associated with that access token' ? void 0 : e)
                            ),
                    cb => auth_sdk.login(mocks[5])
                        .then(() => cb())
                        .catch(e =>
                            cb(e != null && typeof e['text'] !== 'undefined' && e['text'] !== JSON.stringify({
                                code: 'NotFoundError', message: 'User not found'
                            }) ? e : null))
                ],
                done
            )
        );
        */
    });
});
