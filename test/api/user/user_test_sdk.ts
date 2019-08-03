// tslint:disable-next-line:no-var-requires
import chai = require('chai');
import supertest, { Response } from 'supertest';
import { Server } from 'restify';

import { getError, sanitiseSchema, supertestGetError } from '@offscale/nodejs-utils';
import { AccessTokenType } from '@offscale/nodejs-utils/interfaces';

import { User } from '../../../api/user/models';
import * as user_routes from '../../../api/user/routes';
import * as user_admin_routes from '../../../api/user/admin';
import { removeNullProperties } from '../../../utils';

/* tslint:disable:no-var-requires */
const user_schema = sanitiseSchema(require('./../user/schema.json'), User._omit);

/* tslint:disable-next-line:no-var-requires */
chai.use(require('chai-json-schema-ajv'));

const expect: Chai.ExpectStatic = chai.expect;

export class UserTestSDK {
    constructor(public app: Server) {
    }

    public register(user: User): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            if (user == null) return reject(new TypeError('`user` argument to `register` must be defined'));

            expect(user_routes.create).to.be.an.instanceOf(Function);
            supertest(this.app)
                .post('/api/user')
                .send(user)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .end((err, res: Response) => {
                    if (err != null) return reject(supertestGetError(err, res));
                    else if (res.error) return reject(getError(res.error));

                    try {
                        expect(res.status).to.be.equal(201);
                        expect(res.body).to.be.an('object');
                        expect(removeNullProperties(res.body)).to.be.jsonSchema(user_schema);
                    } catch (e) {
                        return reject(e as Chai.AssertionError);
                    }

                    if (res.header['x-access-token'] == null)
                        return reject(new TypeError(
                            '`x-access-token` is `undefined` within `POST /api/user` response headers'
                        ));
                    return resolve(res);
                });
        });
    }

    public read(access_token: AccessTokenType, expected_user: User): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            if (access_token == null || !access_token.length)
                return reject(new TypeError('`access_token` argument to `get_user` must be defined'));
            else if (expected_user == null)
                return reject(TypeError('`expected_user` argument to `get_user` must be defined'));

            expect(user_routes.read).to.be.an.instanceOf(Function);
            expect(user_admin_routes.read).to.be.an.instanceOf(Function);

            const is_admin: boolean = access_token.indexOf('admin') > -1;

            supertest(this.app)
                .get(`/api/user${is_admin ? '/' + encodeURIComponent(expected_user.email) : ''}`)
                .set('x-access-token', access_token)
                .end((err, res: Response) => {
                    if (err != null) return reject(supertestGetError(err, res));
                    else if (res.error) return reject(res.error);

                    try {
                        expect(res.body).to.be.an('object');
                        Object.keys(expected_user).map(
                            attr => expect(expected_user[attr] === res.body[attr])
                        );
                        expect(removeNullProperties(res.body)).to.be.jsonSchema(user_schema);
                    } catch (e) {
                        return reject(e as Chai.AssertionError);
                    }

                    if (res.header['x-access-token'] == null)
                        res.header['x-access-token'] = access_token;
                    return resolve(res);
                });
        });
    }

    public update(access_token: AccessTokenType, user_id: string | undefined,
                  user: Partial<User>): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            if (user == null) return reject(new TypeError('`user` argument to `update` must be defined'));
            else if (access_token == null || !access_token.length)
                return reject(new TypeError('`access_token` argument to `update` must be defined'));

            expect(user_routes.update).to.be.an.instanceOf(Function);
            expect(user_admin_routes.update).to.be.an.instanceOf(Function);

            supertest(this.app)
                .put(`/api/user${access_token.indexOf('admin') > -1 && user_id ? '/' + user_id : ''}`)
                .set('Accept', 'application/json')
                .set('X-Access-Token', access_token)
                .send(user)
                // .expect('Content-Type', /json/)
                .end((err, res: Response) => {
                    if (err != null) reject(supertestGetError(err, res));
                    else if (res.error) return reject(getError(res.error));

                    try {
                        expect(res.status).to.be.equal(200);
                        expect(res.body).to.be.an('object');
                        expect(removeNullProperties(res.body)).to.be.jsonSchema(user_schema);
                        Object.keys(user).forEach(k => expect(user[k]).to.be.eql(res.body[k]));
                    } catch (e) {
                        return reject(e as Chai.AssertionError);
                    }
                    return resolve(res);
                });
        });
    }

    public get_all(access_token: AccessTokenType) {
        return new Promise<Response>((resolve, reject) => {
            if (access_token == null || !access_token.length)
                return reject(new TypeError('`access_token` argument to `get_all` must be defined'));

            expect(user_admin_routes.readAll).to.be.an.instanceOf(Function);
            supertest(this.app)
                .get('/api/users')
                .set('X-Access-Token', access_token)
                .set('Accept', 'application/json')
                .end((err, res: Response) => {
                    if (err != null) return reject(supertestGetError(err, res));
                    else if (res.error) return reject(getError(res.error));
                    try {
                        expect(res.body).to.be.an('object');
                        expect(res.body).to.have.property('users');
                        expect(res.body.users).to.be.an('array');
                        res.body.users.map(user =>
                            expect(removeNullProperties(user)).to.be.jsonSchema(user_schema)
                        );
                    } catch (e) {
                        return reject(e as Chai.AssertionError);
                    }
                    return resolve(res);
                });
        });
    }

    public unregister(ident: {access_token?: string, user_id?: string}) {
        return new Promise<Response>((resolve, reject) => {
            if (ident == null) return reject(new TypeError('`ident` argument to `unregister` must be defined'));

            expect(user_routes.del).to.be.an.instanceOf(Function);
            if (ident.access_token != null && ident.access_token.length > 0)
                supertest(this.app)
                    .delete('/api/user')
                    .set('Accept', 'application/json')
                    .set('X-Access-Token', ident.access_token)
                    .expect(204)
                    .end((err, res) => {
                        const error = supertestGetError(err, res);
                        if (error != null) return reject(error);
                        return resolve(res);
                    });
            else if (ident.user_id == null || !ident.user_id.length)
                return reject(new TypeError(
                    '`ident.user_id` or `ident.access_token` argument to `unregister` must be defined'
                ));
            else
                supertest(this.app)
                    .delete('/api/user')
                    .send({ email: ident.user_id })
                    .set('Accept', 'application/json')
                    .expect(204)
                    .end((err, res) => {
                        const error = supertestGetError(err, res);
                        if (error != null) return reject(error);
                        return resolve(res);
                    });
        });
    }
}
