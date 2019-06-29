import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiJsonSchema from 'chai-json-schema';
import * as supertest from 'supertest';
import { Response } from 'supertest';
import { Server } from 'restify';

import { getError, sanitiseSchema, supertestGetError } from '@offscale/nodejs-utils';
import { AccessTokenType } from '@offscale/nodejs-utils/interfaces';

import { User } from '../../../api/user/models';
import * as user_routes from '../../../api/user/routes';
import * as user_admin_routes from '../../../api/user/admin';

/* tslint:disable:no-var-requires */
const user_schema = sanitiseSchema(require('./../user/schema.json'), User._omit);

// @ts-ignore
chai.use(chaiJsonSchema);

export class UserTestSDK {
    constructor(public app: Server) {
    }

    public async register(user: User): Promise<Response> {
        return new Promise<Response>(((resolve, reject) => {
            if (user == null) return reject(new TypeError('user argument to register must be defined'));

            expect(user_routes.create).to.be.an.instanceOf(Function);
            supertest(this.app)
                .post('/api/user')
                .set('Connection', 'keep-alive')
                .send(user)
                .expect('Content-Type', /json/)
                .end((err, res: Response) => {
                    if (err != null) throw supertestGetError(err, res);
                    else if (res.error) return getError(res.error);

                    try {
                        expect(res.status).to.be.equal(201);
                        expect(res.body).to.be.an('object');
                        expect(res.body).to.be.jsonSchema(user_schema);
                    } catch (e) {
                        err = e as Chai.AssertionError;
                    }

                    if (err != null) return reject(err);
                    return resolve(res);
                });
        }));
    }

    public read(access_token: AccessTokenType, expected_user: User): Promise<Response> {
        return new Promise<Response>(((resolve, reject) => {
            if (access_token == null)
                throw new TypeError('access_token argument to get_user must be defined');

            expect(user_routes.read).to.be.an.instanceOf(Function);
            expect(user_admin_routes.read).to.be.an.instanceOf(Function);

            supertest(this.app)
                .get(`/api/user${access_token.indexOf('admin') > -1 ? '/' + expected_user.email : ''}`)
                .set('X-Access-Token', access_token)
                .set('Connection', 'keep-alive')
                .end((err, res: Response) => {
                    if (err != null) return reject(supertestGetError(err, res));
                    else if (res.error) return reject(res.error);

                    try {
                        expect(res.body).to.be.an('object');
                        Object.keys(expected_user).map(
                            attr => expect(expected_user[attr] === res.body[attr])
                        );
                        expect(res.body).to.be.jsonSchema(user_schema);
                    } catch (e) {
                        err = e as Chai.AssertionError;
                    }
                    if (err != null) return reject(err);
                    return resolve(res);
                });
        }));
    }

    public update(access_token: AccessTokenType, user_id: string | undefined,
                  user: Partial<User>): Promise<Response> {
        return new Promise<Response>(((resolve, reject) => {
            if (user == null) return reject(new TypeError('user argument to update must be defined'));

            expect(user_routes.update).to.be.an.instanceOf(Function);
            expect(user_admin_routes.update).to.be.an.instanceOf(Function);
            supertest(this.app)
                .put(`/api/user${access_token.indexOf('admin') > -1 && user_id ? '/' + user_id : ''}`)
                .set('Connection', 'keep-alive')
                .set('X-Access-Token', access_token)
                .send(user)
                // .expect('Content-Type', /json/)
                .end((err, res: Response) => {
                    if (err != null) reject(supertestGetError(err, res));
                    else if (res.error) return reject(getError(res.error));

                    try {
                        expect(res.status).to.be.equal(201);
                        expect(res.body).to.be.an('object');
                        expect(res.body).to.be.jsonSchema(user_schema);
                        Object.keys(user).forEach(k => expect(user[k]).to.be.eql(res.body[k]));
                    } catch (e) {
                        err = e as Chai.AssertionError;
                    }
                    if (err != null) return reject(err);
                    return resolve(res);
                });
        }));
    }

    public get_all(access_token: AccessTokenType) {
        return new Promise<Response>(((resolve, reject) => {
            if (access_token == null) return reject(new TypeError('access_token argument to get_all must be defined'));

            expect(user_admin_routes.readAll).to.be.an.instanceOf(Function);
            supertest(this.app)
                .get('/api/users')
                .set('X-Access-Token', access_token)
                .set('Connection', 'keep-alive')
                .end((err, res: Response) => {
                    if (err != null) return reject(supertestGetError(err, res));
                    else if (res.error) return reject(getError(res.error));
                    try {
                        expect(res.body).to.be.an('object');
                        expect(res.body).to.have.property('users');
                        expect(res.body.users).to.be.an('array');
                        res.body.users.map(user => expect(user).to.be.jsonSchema(user_schema));
                    } catch (e) {
                        err = e as Chai.AssertionError;
                    }
                    if (err != null) return reject(err);
                    return resolve(res);
                });
        }));
    }

    public unregister(ident: {access_token?: string, user_id?: string}) {
        return new Promise<Response>(((resolve, reject) => {
            if (ident == null) return reject(new TypeError('ident argument to unregister must be defined'));

            expect(user_routes.del).to.be.an.instanceOf(Function);
            if (ident.access_token != null)
                supertest(this.app)
                    .delete('/api/user')
                    .set('Connection', 'keep-alive')
                    .set('X-Access-Token', ident.access_token)
                    .expect(204)
                    .end((err, res) => {
                        const error = supertestGetError(err, res);
                        if (error != null) return reject(error);
                        return resolve(res);
                    });
            else
                supertest(this.app)
                    .delete('/api/user')
                    .set('Connection', 'keep-alive')
                    .send({ email: ident.user_id })
                    .expect(204)
                    .end((err, res) => {
                        const error = supertestGetError(err, res);
                        if (error != null) return reject(error);
                        return resolve(res);
                    });
        }));
    }
}
