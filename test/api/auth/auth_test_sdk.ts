import * as supertest from 'supertest';
import {Response} from 'supertest';
import {expect} from 'chai';
import * as async from 'async';
import {ITestSDK} from './auth_test_sdk.d';
import {cb} from '../../share_interfaces.d';
import {IUser, IUserBase} from '../../../api/user/models.d';
import {user_mocks} from '../user/user_mocks';

export class AuthTestSDK implements ITestSDK {
    constructor(public app) {
    }

    register(user: IUserBase, cb: cb) {
        if (!user) return cb(new TypeError('user argument to register must be defined'));

        supertest(this.app)
            .post('/api/user')
            .send(user)
            .expect('Content-Type', /json/)
            .end((err, res: Response) => {
                if (err) return cb(err);
                else if (res.error) return cb(res.error);
                try {
                    expect(res.body).to.be.an('object');
                    expect(res.status).to.be.equal(201);
                    expect(res.body).to.have.all.keys('createdAt', 'email', 'updatedAt');
                } catch (e) {
                    err = <Chai.AssertionError>e;
                } finally {
                    cb(err, res);
                }
            });
    }

    login(user: IUserBase, cb: cb) {
        if (!user) return cb(new TypeError('user argument to login must be defined'));

        supertest(this.app)
            .post('/api/auth')
            .send(user)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res: Response) => {
                if (err) return cb(err);
                else if (res.error) return cb(res.error);
                try {
                    expect(res.body).to.have.property('access_token');
                } catch (e) {
                    err = <Chai.AssertionError>e;
                } finally {
                    cb(err, res);
                }
            })
    }

    get_user(access_token: string, user: IUser | IUserBase, cb: cb) {
        if (!access_token) return cb(new TypeError('access_token argument to get_user must be defined'));

        supertest(this.app)
            .get('/api/user')
            .set({'X-Access-Token': access_token})
            .end((err, res: Response) => {
                if (err) return cb(err);
                else if (res.error) return cb(res.error);
                try {
                    Object.keys(user).map(
                        attr => expect(user[attr] === res.body[attr])
                    );
                } catch (e) {
                    err = <Chai.AssertionError>e;
                } finally {
                    cb(err, res);
                }
            })
    }

    logout(access_token: string, cb: cb) {
        if (!access_token) return cb(new TypeError('access_token argument to logout must be defined'));

        supertest(this.app)
            .delete('/api/auth')
            .set({'X-Access-Token': access_token})
            .expect(204)
            .end(cb)
    }

    unregister(ident: { access_token?: string, user_id?: string }, cb: cb) {
        if (!ident) return cb(new TypeError('ident argument to unregister must be defined'));

        if (ident.access_token)
            supertest(this.app)
                .delete('/api/user')
                .set({'X-Access-Token': ident.access_token})
                .expect(204)
                .end(cb);
        else
            supertest(this.app)
                .delete('/api/user')
                .send({email: ident.user_id})
                .expect(204)
                .end(cb)
    }

    unregister_all(users: Array<IUser | IUserBase>, done: cb) {
        async.map(users, (user, callback) =>
                async.waterfall([
                    cb => this.login(user, (err, res) =>
                        err ? cb(err) : cb(null, res.body.access_token)
                    ),
                    (access_token, cb) =>
                        this.unregister({access_token: access_token}, (err, res) =>
                            cb(err, access_token)
                        )
                    ,
                ], callback)
            , done
        )
    }

    register_login(user: IUserBase, num_or_done, done?: cb) {
        if (!done) {
            done = num_or_done;
            num_or_done = 0;
        }
        user = user || user_mocks.successes[num_or_done];
        async.series([
                cb => this.register(user, cb),
                cb => this.login(user, cb)
            ], (err, results: Array<Response>) => {
                if (err) return done(err);
                return done(err, results[1].get('x-access-token'));
            }
        )
    }

    logout_unregister(user: IUserBase, num_or_done, done?: cb) {
        if (!done) {
            done = num_or_done;
            num_or_done = 0;
        }
        user = user || user_mocks.successes[num_or_done];
        if (!user)
            return done(new TypeError('user undefined in `logout_unregister`'));

        this.unregister_all([user], done)
    }
}
