import { mapSeries, series, waterfall } from 'async';
import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiJsonSchema from 'chai-json-schema';
import { getError, HttpStrResp, IncomingMessageError, sanitiseSchema, superEndCb, TCallback } from 'nodejs-utils';
import * as supertest from 'supertest';
import { Response } from 'supertest';

import { User } from '../../../api/user/models';
import { IUser, IUserBase } from '../../../api/user/models.d';
import { user_mocks } from '../user/user_mocks';
import { IAuthSdk } from './auth_test_sdk.d';
// import { saltSeeker } from '../../../api/user/utils';
// import { saltSeekerCb } from '../../../main';

/* tslint:disable:no-var-requires */
const user_schema = sanitiseSchema(require('./../user/schema.json'), User._omit);
const auth_schema = require('./schema.json');

chai.use(chaiJsonSchema);

export class AuthTestSDK implements IAuthSdk {
    constructor(private app) {
    }

    public register(user: IUserBase, callback: TCallback<Error | IncomingMessageError, Response>) {
        if (user == null) return callback(new TypeError('user argument to register must be defined'));

        supertest(this.app)
            .post('/api/user')
            .set('Connection', 'keep-alive')
            .send(user)
            .expect('Content-Type', /json/)
            .end((err, res: Response) => {
                if (err != null) return superEndCb(callback)(err, res);
                else if (res.error) return callback(getError(res.error));

                try {
                    expect(res.status).to.be.equal(201);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.be.jsonSchema(user_schema);
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    superEndCb(callback)(err, res);
                }
            });
    }

    public login(user: IUserBase, callback: TCallback<Error | IncomingMessageError, Response>) {
        if (user == null) return callback(new TypeError('user argument to login must be defined'));

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

    public get_user(access_token: string,
                    user: IUser | IUserBase, callback: TCallback<Error | IncomingMessageError, Response>) {
        if (access_token == null) return callback(new TypeError('access_token argument to get_user must be defined'));

        supertest(this.app)
            .get('/api/user')
            .set('X-Access-Token', access_token)
            .set('Connection', 'keep-alive')
            .end((err, res: Response) => {
                if (err != null) return superEndCb(callback)(err, res);
                else if (res.error) return callback(getError(res.error));
                try {
                    expect(res.body).to.be.an('object');
                    Object.keys(user).map(
                        attr => expect(user[attr] === res.body[attr])
                    );
                    expect(res.body).to.be.jsonSchema(user_schema);
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    superEndCb(callback)(err, res);
                }
            });
    }

    public get_all(access_token: string, callback: TCallback<Error | IncomingMessageError, Response>) {
        if (access_token == null) return callback(new TypeError('access_token argument to get_all must be defined'));

        supertest(this.app)
            .get('/api/users')
            .set('X-Access-Token', access_token)
            .set('Connection', 'keep-alive')
            .end((err, res: Response) => {
                if (err != null) return superEndCb(callback)(err, res);
                else if (res.error) return callback(getError(res.error));
                try {
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('users');
                    expect(res.body.users).to.be.an('array');
                    res.body.users.map(user => expect(user).to.be.jsonSchema(user_schema));
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    superEndCb(callback)(err, res);
                }
            });
    }

    public logout(access_token: string, callback: HttpStrResp) {
        if (access_token == null) return callback(new TypeError('access_token argument to logout must be defined'));
        else if (typeof access_token !== 'string')
            return callback(new TypeError(`Expected \`access_token\` of string, got: ${typeof access_token}`));

        supertest(this.app)
            .delete('/api/auth')
            .set('Connection', 'keep-alive')
            .set('X-Access-Token', access_token)
            .expect(204)
            .end(callback);
    }

    public unregister(ident: {access_token?: string, user_id?: string},
                      callback: TCallback<Error | IncomingMessageError, Response>) {
        if (ident == null) return callback(new TypeError('ident argument to unregister must be defined'));

        if (ident.access_token != null)
            supertest(this.app)
                .delete('/api/user')
                .set('Connection', 'keep-alive')
                .set('X-Access-Token', ident.access_token)
                .expect(204)
                .end((err, res) => superEndCb(callback)(err, res));
        else
            supertest(this.app)
                .delete('/api/user')
                .set('Connection', 'keep-alive')
                .send({ email: ident.user_id })
                .expect(204)
                .end((err, res) => superEndCb(callback)(err, res));
    }

    public unregister_all(users: Array<IUser | IUserBase>,
                          callback: TCallback<Error | IncomingMessageError, Response>) {
        mapSeries(users as any, (user: IUserBase, callb) =>
            waterfall([
                    call_back => this.login(user, (err, res) =>
                        err == null ? call_back(void 0, res.header['x-access-token']) : call_back(err)
                    ),
                    (access_token, call_back) => this.unregister({ access_token }, (err, res) =>
                        call_back(err, access_token)
                    ),
                ], callb
            ), callback as any);
    }

    public register_login(user: IUserBase, num_or_done: number | TCallback<Error | IncomingMessageError, string>,
                          callback?: TCallback<Error | IncomingMessageError, string>) {
        if (callback == null) {
            callback = num_or_done as TCallback<Error | IncomingMessageError, string>;
            num_or_done = 0;
        }
        user = user || user_mocks.successes[num_or_done as number];
        series([
            callb => this.register(user, callb),
            callb => this.login(user, callb)
        ], (err: Error, results: Response[]) => {
            if (err != null) return callback(err);
            return callback(err, results[1].get('x-access-token'));
        });
    }

    public logout_unregister(user: IUserBase, num_or_done: number | TCallback<Error | IncomingMessageError, Response>,
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
