import assert from "node:assert/strict";

import { Server } from 'restify';
import supertest, { Response } from 'supertest';
import Ajv from "ajv"

import { getError, sanitiseSchema, supertestGetError } from '@offscale/nodejs-utils';
import { AccessTokenType } from '@offscale/nodejs-utils/interfaces';

import * as auth_routes from '../../../api/auth/routes';
import { User } from '../../../api/user/models';
import { user_mocks } from '../user/user_mocks';
import { UserTestSDK } from '../user/user_test_sdk';
import { removeNullProperties } from '../../../utils';
import { map } from "async";
// import { saltSeeker } from '../../../api/user/utils';
// import { saltSeekerCb } from '../../../main';

/* tslint:disable:no-var-requires */
const user_schema = sanitiseSchema(require('./../user/schema.json'), User._omit);
const auth_schema = require('./schema.json');

export class AuthTestSDK {
    private user_sdk: UserTestSDK;

    constructor(public app: Server) {
        this.user_sdk = new UserTestSDK(app);
    }

    public login(user: User): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            if (user == null) return reject(new TypeError('`user` argument to `login` must be defined'));

            assert.ok(auth_routes.login instanceof Function);
            supertest(this.app)
                .post('/api/auth')
                .send(user)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(201)
                .end((err, res: Response) => {
                    if (err != null) return reject(supertestGetError(err, res));
                    else if (res.error) return reject(getError(res.error));
                    try {
                        assert.ok(res.body instanceof Object);
                        assert.ok(res.body.hasOwnProperty('access_token'));
                        assert.ok(res.body.access_token.length > 0);
                        assert.strictEqual(res.header['x-access-token'], res.body.access_token);
                        const validate = new Ajv({allErrors: true}).compile(auth_schema);
                        assert.ok(validate(removeNullProperties(res.body)), validate.errors?.toString());
                    } catch (e) {
                        return reject(e);
                    }
                    return resolve(res);
                });
        });
    }

    /*public logout(access_token: AccessTokenType, callback: HttpStrResp) {
        if (access_token == null) return callback(new TypeError('access_token argument to logout must be defined'));
        else if (typeof access_token !== 'string')
            return callback(new TypeError(`Expected \`access_token\` of string, got: ${typeof access_token}`));

        expect(auth_routes.logout).to.be.an.instanceOf(Function);
        supertest(this.app)
            .delete('/api/auth')
            .set('Accept', 'application/json')
            .set('X-Access-Token', access_token)
            .expect(204)
            .end(callback);
    }*/

    public unregister_all(users: User[]): Promise<Response[]> {
        return new Promise<Response[]>((resolve, reject) => {
            const unregister_user = (user: User, callback: (err: Error | undefined, response?: Response) => void): void => {
                this.login(user)
                    .then(res =>
                        this.user_sdk
                            .unregister({ access_token: res!.header['x-access-token'] })
                            .then(response => callback(void 0, response))
                            .catch(callback)
                    )
                    .catch(callback)
            };
            return map(users, unregister_user,
                (e: Error | undefined | null, r: (Response | undefined)[] | undefined) =>
                    r == null ? reject(e) : resolve(r as Response[]));
        });
    }

    public register_login(user?: User, num?: number): Promise<AccessTokenType> {
        return new Promise<AccessTokenType>((resolve, reject) => {
            if (num == null) num = 0;
            user = user || user_mocks.successes[num as number];
            if (user == null) return reject(new TypeError('`user` argument to `register_login` must be defined'));

            const token_handler = (r: supertest.Response) => resolve(r.header['x-access-token']);

            this.user_sdk.register(user!)
                .then(token_handler)
                .catch(() =>
                    this.login(user!)
                        .then(token_handler)
                        .catch(reject)
                );
        });
    }

    public logout_unregister(user: User, num?: number) {
        return new Promise((resolve, reject) => {
            if (num == null) num = 0;
            user = user || user_mocks.successes[num as number];
            if (user == null) return reject(new TypeError('`user` argument to `logout_unregister` must be defined'));

            return this.unregister_all([user]).then(resolve).catch(reject);
        });
    }
}
