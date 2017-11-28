import { mapSeries, series, waterfall } from 'async';
import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiJsonSchema from 'chai-json-schema';
import { getError, IncomingMessageError, sanitiseSchema, superEndCb, TCallback } from 'nodejs-utils';
import { Server } from 'restify';
import * as supertest from 'supertest';
import { Response } from 'supertest';

import * as auth_routes from '../../../api/auth/routes';
import { User } from '../../../api/user/models';
import { user_mocks } from '../user/user_mocks';
import { UserTestSDK } from '../user/user_test_sdk';
// import { saltSeeker } from '../../../api/user/utils';
// import { saltSeekerCb } from '../../../main';

/* tslint:disable:no-var-requires */
const user_schema = sanitiseSchema(require('./../user/schema.json'), User._omit);
const auth_schema = require('./schema.json');

chai.use(chaiJsonSchema);

export class AuthTestSDK {
    private user_sdk: UserTestSDK;

    constructor(public app: Server) {
        this.user_sdk = new UserTestSDK(app);
    }

    public login(user: User, callback: TCallback<Error | IncomingMessageError, Response>) {
        if (user == null) return callback(new TypeError('user argument to login must be defined'));

        expect(auth_routes.login).to.be.an.instanceOf(Function);
        supertest(this.app)
            .post('/api/auth')
            .set('Connection', 'keep-alive')
            .send(user)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res: Response) => {
                if (err != null) return superEndCb(callback)(err, res);
                else if (res.error) return callback(getError(res.error));
                try {
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('access_token');
                    expect(res.body).to.be.jsonSchema(auth_schema);
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    superEndCb(callback)(err, res);
                }
            });
    }

    /*public logout(access_token: AccessTokenType, callback: HttpStrResp) {
        if (access_token == null) return callback(new TypeError('access_token argument to logout must be defined'));
        else if (typeof access_token !== 'string')
            return callback(new TypeError(`Expected \`access_token\` of string, got: ${typeof access_token}`));

        expect(auth_routes.logout).to.be.an.instanceOf(Function);
        supertest(this.app)
            .delete('/api/auth')
            .set('Connection', 'keep-alive')
            .set('X-Access-Token', access_token)
            .expect(204)
            .end(callback);
    }*/

    public unregister_all(users: User[], callback: TCallback<Error | IncomingMessageError, Response>) {
        mapSeries(users as any, (user: User, callb) =>
            waterfall([
                    call_back => this.login(user, (err, res) =>
                        err == null ? call_back(void 0, res.header['x-access-token']) : call_back(err)
                    ),
                (access_token, call_back) => this.user_sdk.unregister({ access_token }, (err, res) =>
                        call_back(err, access_token)
                    ),
                ], callb
            ), callback as any);
    }

    public register_login(user: User, num_or_done: number | TCallback<Error | IncomingMessageError, string>,
                          callback?: TCallback<Error | IncomingMessageError, string>) {
        if (callback == null) {
            callback = num_or_done as TCallback<Error | IncomingMessageError, string>;
            num_or_done = 0;
        }
        user = user || user_mocks.successes[num_or_done as number];

        series([
            callb => this.user_sdk.register(user, callb),
            callb => this.login(user, callb)
        ], (err: Error, results: Response[]) => {
            if (err != null) return callback(err);
            else return callback(err, results[1].get('x-access-token'));
        });
    }

    public logout_unregister(user: User, num_or_done: number | TCallback<Error | IncomingMessageError, Response>,
                             callback?: TCallback<Error | IncomingMessageError, Response>) {
        if (callback == null) {
            callback = num_or_done as TCallback<Error | IncomingMessageError, Response>;
            num_or_done = 0;
        }
        user = user || user_mocks.successes[num_or_done as number];
        if (user == null)
            return callback(new TypeError('user undefined in `logout_unregister`'));

        this.unregister_all([user], callback);
    }
}
