/// <reference path='./../../../typings/supertest/supertest.d.ts' />
/// <reference path='./../../../typings/chai/chai.d.ts' />
/// <reference path='./../../../typings/async/async.d.ts' />
/// <reference path='./auth_test_sdk.d.ts' />

import * as supertest from 'supertest';
import {expect} from 'chai';
import * as async from 'async';

export function test_sdk(app) {
    return {
        register: function register(user: user.IUser, cb: auth_test_sdk.cb) {
            if (!user) return cb(new TypeError('user argument to register must be defined'));
            supertest(app)
                .post('/api/user')
                .send(user)
                .end((err, res) => {
                    if (err) return cb(err);
                    else if (res.statusCode / 100 >= 3) return cb(new Error(JSON.stringify(res.text, null, 4)));
                    expect(Object.keys(res.body).sort()).to.deep.equal(['createdAt', 'email', 'updatedAt']);
                    return cb(err, res);
                })
        },
        login: function login(user: user.IUserBase, cb: auth_test_sdk.cb) {
            if (!user) return cb(new TypeError('user argument to login must be defined'));
            supertest(app)
                .post('/api/auth')
                .send(user)
                .end((err, res) => {
                    if (err) return cb(err);
                    else if (res.statusCode / 100 >= 3) return cb(new Error(JSON.stringify(res.text, null, 4)));
                    expect(Object.keys(res.body)).to.deep.equal(['access_token']);
                    return cb(err, res);
                })
        },
        get_user: function get_user(access_token: string, user: user.IUser | user.IUserBase, cb: auth_test_sdk.cb) {
            if (!access_token) return cb(new TypeError('access_token argument to get_user must be defined'));
            supertest(app)
                .get('/api/user')
                .set({ 'X-Access-Token': access_token })
                .end((err, res) => {
                    if (err) return cb(err);
                    else if (res.statusCode / 100 >= 3) return cb(new Error(JSON.stringify(res.text, null, 4)));
                    Object.keys(user).map(
                        attr => expect(user[attr] === res.body[attr])
                    )
                    return cb(err, res);
                })
        },
        logout: function logout(access_token: string, cb: auth_test_sdk.cb) {
            if (!access_token) return cb(new TypeError('access_token argument to logout must be defined'));
            supertest(app)
                .delete('/api/auth')
                .set({ 'X-Access-Token': access_token })
                .expect(204)
                .end(cb)
        },
        unregister: function unregister(ident: { access_token?: string, user_id?: string }, cb: auth_test_sdk.cb) {
            if (!ident) return cb(new TypeError('ident argument to unregister must be defined'));
            if (ident.access_token)
                supertest(app)
                    .delete('/api/user')
                    .set({ 'X-Access-Token': ident.access_token })
                    .expect(204)
                    .end(cb)
            else
                supertest(app)
                    .delete('/api/user')
                    .send({ email: ident.user_id })
                    .expect(204)
                    .end(cb)
        }
    }
}

export function unregister_all(sdk: auth_test_sdk.ITestSDK, users: Array<user.IUser | user.IUserBase>, done: auth_test_sdk.cb) {
    async.map(users, (user, callback) => async.waterfall([
        (cb) => sdk.login(user, (err, res) =>
            err ? cb(err) : cb(null, res.body.access_token)
        ),
        (access_token, cb) =>
            sdk.unregister({ access_token: access_token }, (err, res) =>
                cb(err, access_token)
            )
        ,
    ], callback),
        (err, res) => done(null)
    )
}
