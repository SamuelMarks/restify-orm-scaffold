import * as chai from 'chai';
import { expect } from 'chai';
import { Server } from 'restify';
import supertest, { Response } from 'supertest';

import { getError, sanitiseSchema, supertestGetError } from '@offscale/nodejs-utils';
import { AccessTokenType } from '@offscale/nodejs-utils/interfaces';

import * as auth_routes from '../../../api/auth/routes';
import { User } from '../../../api/user/models';
import { user_mocks } from '../user/user_mocks';
import { UserTestSDK } from '../user/user_test_sdk';
import { removeNullProperties } from '../../../utils';
// tslint:disable-next-line:no-var-requires
const chaiJsonSchema = require('chai-json-schema');
// import { saltSeeker } from '../../../api/user/utils';
// import { saltSeekerCb } from '../../../main';

/* tslint:disable:no-var-requires */
const user_schema = sanitiseSchema(require('./../user/schema.json'), User._omit);
const auth_schema = require('./schema.json');

// @ts-ignore
chai.use(chaiJsonSchema);

export class AuthTestSDK {
    private user_sdk: UserTestSDK;

    constructor(public app: Server) {
        this.user_sdk = new UserTestSDK(app);
    }

    public login(user: User): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            if (user == null) return reject(new TypeError('`user` argument to `login` must be defined'));

            expect(auth_routes.login).to.be.an.instanceOf(Function);
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
                        expect(res.body).to.be.an('object');
                        expect(res.body).to.have.property('access_token');
                        expect(res.body.access_token).to.have.lengthOf.at.least(1);
                        expect(res.header['x-access-token']).to.eql(res.body.access_token);
                        expect(removeNullProperties(res.body)).to.be.jsonSchema(auth_schema);
                    } catch (e) {
                        return reject(e as Chai.AssertionError);
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
            const errors: number[] = [];
            const successes: Response[] = [];
            users.forEach((user, idx) =>
                this.login(user)
                    .then(res =>
                        this.user_sdk
                            .unregister({ access_token: res!.header['x-access-token'] })
                            .then(response => {
                                delete users[idx].access_token;
                                successes.push(response);
                            })
                            .catch(errors.push.bind(errors))
                    )
                    .catch(errors.push.bind(errors))
            );
            if (errors.length) return reject(errors);
            return resolve(successes);
        });
    }

    public register_login(user?: User, num?: number): Promise<AccessTokenType> {
        return new Promise<AccessTokenType>((resolve, reject) => {
            if (num == null) num = 0;
            user = user || user_mocks.successes[num as number];
            if (user == null) return reject(new TypeError('`user` argument to `register_login` must be defined'));

            const token_handler = r => resolve(r.header['x-access-token']);

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
