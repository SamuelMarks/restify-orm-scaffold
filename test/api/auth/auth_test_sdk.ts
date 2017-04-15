import * as supertest from 'supertest';
import { Response } from 'supertest';
import * as chai from 'chai';
import { expect } from 'chai';
import { mapSeries, series, waterfall } from 'async';
import { sanitiseSchema } from 'nodejs-utils';
import { fmtError } from 'restify-errors';
import * as chaiJsonSchema from 'chai-json-schema';
import { IAuthSdk } from './auth_test_sdk.d';
import { cb } from '../../share_interfaces.d';
import { IUser, IUserBase } from '../../../api/user/models.d';
import { user_mocks } from '../user/user_mocks';
import { Salt, User } from '../../../api/user/models';
import { saltSeeker } from '../../../api/user/utils';
import { saltSeekerCb } from '../../../main';

/* tslint:disable:no-var-requires */
const user_schema = sanitiseSchema(require('./../user/schema.json'), User._omit);
const auth_schema = require('./schema.json');

chai.use(chaiJsonSchema);

export class AuthTestSDK implements IAuthSdk {
    constructor(private app) {
    }

    public register(user: IUserBase, cb: cb) {
        const _register = callback => {
            if (!user) return callback(new TypeError('user argument to register must be defined'));

            supertest(this.app)
                .post('/api/user')
                .set('Connection', 'keep-alive')
                .send(user)
                .expect('Content-Type', /json/)
                .end((err, res: Response) => {
                    if (err) return cb(err);
                    else if (res.error) return cb(fmtError(res.error));

                    try {
                        expect(res.status).to.be.equal(201);
                        expect(res.body).to.be.an('object');
                        expect(res.body).to.be.jsonSchema(user_schema);
                    } catch (e) {
                        err = e as Chai.AssertionError;
                    } finally {
                        callback(err, res);
                    }
                });
        };

        series(
            [callb => saltSeeker(saltSeekerCb(callb)),
                callb => _register(callb)], (error: Error, result: any[][2]) => {
                if (error) return cb(error);
                return cb(null, result[1]);
            }
        );
    }

    public login(user: IUserBase, cb: cb) {
        if (!user) return cb(new TypeError('user argument to login must be defined'));

        supertest(this.app)
            .post('/api/auth')
            .set('Connection', 'keep-alive')
            .send(user)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res: Response) => {
                if (err) return cb(err);
                else if (res.error) return cb(res.error);
                try {
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('access_token');
                    expect(res.body).to.be.jsonSchema(auth_schema);
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    cb(err, res);
                }
            });
    }

    public get_user(access_token: string, user: IUser | IUserBase, cb: cb) {
        if (!access_token) return cb(new TypeError('access_token argument to get_user must be defined'));

        supertest(this.app)
            .get('/api/user')
            .set('X-Access-Token', access_token)
            .set('Connection', 'keep-alive')
            .end((err, res: Response) => {
                if (err) return cb(err);
                else if (res.error) return cb(res.error);
                try {
                    expect(res.body).to.be.an('object');
                    Object.keys(user).map(
                        attr => expect(user[attr] === res.body[attr])
                    );
                    expect(res.body).to.be.jsonSchema(user_schema);
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    cb(err, res);
                }
            });
    }

    public get_all(access_token: string, cb: cb) {
        if (!access_token) return cb(new TypeError('access_token argument to get_all must be defined'));

        supertest(this.app)
            .get('/api/users')
            .set('X-Access-Token', access_token)
            .set('Connection', 'keep-alive')
            .end((err, res: Response) => {
                if (err) return cb(err);
                else if (res.error) return cb(res.error);
                try {
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.property('users');
                    expect(res.body.users).to.be.an('array');
                    res.body.users.map(user => expect(user).to.be.jsonSchema(user_schema));
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    cb(err, res);
                }
            });
    }

    public logout(access_token: string, cb: cb) {
        if (!access_token) return cb(new TypeError('access_token argument to logout must be defined'));

        supertest(this.app)
            .delete('/api/auth')
            .set('Connection', 'keep-alive')
            .set('X-Access-Token', access_token)
            .expect(204)
            .end(cb);
    }

    public unregister(ident: { access_token?: string, user_id?: string }, cb: cb) {
        if (!ident) return cb(new TypeError('ident argument to unregister must be defined'));

        if (ident.access_token)
            supertest(this.app)
                .delete('/api/user')
                .set('Connection', 'keep-alive')
                .set('X-Access-Token', ident.access_token)
                .expect(204)
                .end(cb);
        else
            supertest(this.app)
                .delete('/api/user')
                .set('Connection', 'keep-alive')
                .send({email: ident.user_id})
                .expect(204)
                .end(cb);
    }

    public unregister_all(users: Array<IUser | IUserBase>, done: cb) {
        mapSeries(users, (user, callback) =>
                waterfall([
                    cb => this.login(user, (err, res) =>
                        err ? cb(err) : cb(null, res.body.access_token)
                    ),
                    (access_token, cb) =>
                        this.unregister({access_token}, (err, res) =>
                            cb(err, access_token)
                        )
                    ,
                ], callback)
            , done
        );
    }

    public register_login(user: IUserBase, num_or_done, done?: cb) {
        if (!done) {
            done = num_or_done;
            num_or_done = 0;
        }
        user = user || user_mocks.successes[num_or_done];
        series([
                cb => this.register(user, cb),
                cb => this.login(user, cb)
            ], (err: Error, results: Response[]) => {
                if (err) return done(err);
                return done(err, results[1].get('x-access-token'));
            }
        );
    }

    public logout_unregister(user: IUserBase, num_or_done, done?: cb) {
        if (!done) {
            done = num_or_done;
            num_or_done = 0;
        }
        user = user || user_mocks.successes[num_or_done];
        if (!user)
            return done(new TypeError('user undefined in `logout_unregister`'));

        this.unregister_all([user], done);
    }
}
