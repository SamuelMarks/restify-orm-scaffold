import * as path from 'node:path';
import { basename } from 'node:path';
import { describe, before, after, it } from 'node:test';

import { waterfall } from 'async';
import { createLogger } from 'bunyan';

import { Server } from 'restify';

import { model_route_to_map } from '@offscale/nodejs-utils';
import { IModelRoute } from '@offscale/nodejs-utils/interfaces';
import { IOrmsOut } from '@offscale/orm-mw/interfaces';

import { AccessToken } from '../../../api/auth/models';
import { User } from '../../../api/user/models';
import { _orms_out } from '../../../config';
import { all_models_and_routes_as_mr, setupOrmApp } from '../../../main';
import { closeApp, tearDownConnections, unregister_all } from '../../shared_tests';
import { user_mocks } from '../user/user_mocks';
import { AuthTestSDK } from './auth_test_sdk';

const models_and_routes: IModelRoute = {
    user: all_models_and_routes_as_mr['user'],
    auth: all_models_and_routes_as_mr['auth']
};

process.env['NO_SAMPLE_DATA'] = 'true';

const mocks: User[] = user_mocks.successes.slice(0, 12);

const tapp_name = `test::${basename(__dirname)}`;
const connection_name = `${tapp_name}::${path.basename(__filename).replace(/\./g, '-')}`;

const logger = createLogger({ name: tapp_name });

describe('Auth::routes', (t) => {
    let sdk: AuthTestSDK;

    before((t, done) =>
        waterfall([
                tearDownConnections,
                (cb: (err: Error | undefined) => void) => {
                    AccessToken.reset();
                    return cb(void 0);
                },
                (cb: (err: Error | undefined) => void) => setupOrmApp(
                    model_route_to_map(models_and_routes), { connection_name, logger },
                    { skip_start_app: true, app_name: tapp_name, logger },
                    cb
                ),
                (_app: Server, orms_out: IOrmsOut, cb: (err: Error | undefined) => void) => {
                    _orms_out.orms_out = orms_out;

                    sdk = new AuthTestSDK(_app);

                    return cb(void 0);
                },
            ], done
        )
    );

    // deregister_all
    after(async () => await unregister_all(sdk, mocks));

    // tearDownConnections
    after((t, done) => tearDownConnections(done));

    // closeApp
    after((t, done) => closeApp(sdk!.app)(done));

    describe('/api/auth', () => {
        before(async () => await unregister_all(sdk, mocks));
        after(async () => await unregister_all(sdk, mocks));

        // POST should login user
        it((t, done) =>
            sdk.register_login(mocks[1]).then(e => done(void 0)).catch(done));

        it('DELETE should logout user', async () => {
            const user_mock = mocks[2];
            await sdk.register_login(user_mock);
            await sdk.unregister_all([user_mock]);
        });
    });
});
