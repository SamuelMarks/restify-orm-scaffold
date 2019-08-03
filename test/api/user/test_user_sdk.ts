// tslint:disable-next-line:no-var-requires
import { IRoutesMergerConfig } from '@offscale/routes-merger/interfaces';

import { waterfall } from 'async';
import { createLogger } from 'bunyan';
import * as path from 'path';
import { basename } from 'path';

import { model_route_to_map, sanitiseSchema } from '@offscale/nodejs-utils';
import { ormMw } from '@offscale/orm-mw';
import { IOrmsOut } from '@offscale/orm-mw/interfaces';
import { IModelRoute } from '@offscale/nodejs-utils/interfaces';

import { AccessToken } from '../../../api/auth/models';
import { User } from '../../../api/user/models';
import { _orms_out, getOrmMwConfig } from '../../../config';
import { all_models_and_routes_as_mr } from '../../../main';
import { destroy, post, UserBodyReq, UserConfig } from '../../../api/user/sdk';
import { tearDownConnections } from '../../shared_tests';
import { user_mocks } from './user_mocks';
import { removeNullProperties } from '../../../utils';

// tslint:disable-next-line:no-var-requires
const chai = require('chai');

// tslint:disable-next-line:no-var-requires
const chaiJsonSchema = require('chai-json-schema');

// tslint:disable-next-line:no-var-requires
const user_schema = sanitiseSchema(require('./../user/schema.json'), User._omit);

// @ts-ignore
chai.use(chaiJsonSchema);
const expect = chai.expect;

const models_and_routes: IModelRoute = {
    user: all_models_and_routes_as_mr['user'],
    auth: all_models_and_routes_as_mr['auth']
};

process.env['NO_SAMPLE_DATA'] = 'true';

const mocks: User[] = user_mocks.successes.slice(36, 48);

const tapp_name = `test::${basename(__dirname)}`;
const connection_name = `${tapp_name}::${path.basename(__filename).replace(/\./g, '-')}`;
const logger = createLogger({ name: tapp_name });

const unregister_user = async (user: User) => {
    const server_res = await destroy({
        body: user,
        user_id: user.email,
        getOrm: () => _orms_out.orms_out,
        orms_out: _orms_out.orms_out
    });
    expect(server_res).to.equal(204);
};

describe('User::sdk', () => {
    before(done =>
        waterfall([
                tearDownConnections,
                cb => typeof AccessToken.reset() === 'undefined' && cb(void 0),
                cb => ormMw(Object.assign({}, getOrmMwConfig(model_route_to_map(models_and_routes), logger, cb),
                    { connection_name, logger })),
                (with_app: IRoutesMergerConfig['with_app'], orms_out: IOrmsOut, cb) => {
                    _orms_out.orms_out = orms_out;
                    return cb(void 0);
                }
            ],
            done
        )
    );

    after(tearDownConnections);

    describe('/api/user', () => {
        const user: User = mocks[3];

        beforeEach(async () => await unregister_user(user));
        afterEach(async () => await unregister_user(user));

        it('POST should create user', async () => {
                const user_res = await post(
                    { body: user, getOrm: () => _orms_out.orms_out } as unknown as UserBodyReq,
                    UserConfig.instance
                );
                expect(removeNullProperties(user_res)).to.be.jsonSchema(user_schema);
            }
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
