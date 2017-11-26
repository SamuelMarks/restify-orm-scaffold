import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiJsonSchema from 'chai-json-schema';
import { getError, IncomingMessageError, sanitiseSchema, superEndCb, TCallback } from 'nodejs-utils';
import * as supertest from 'supertest';
import { Response } from 'supertest';
import { User } from '../../../api/user/models';
import * as user_routes from '../../../api/user/routes';

/* tslint:disable:no-var-requires */
const user_schema = sanitiseSchema(require('./../user/schema.json'), User._omit);

chai.use(chaiJsonSchema);

export class UserTestSDK {
    constructor(public app) {
    }

    public register(user: User, callback: TCallback<Error | IncomingMessageError, Response>) {
        if (user == null) return callback(new TypeError('user argument to register must be defined'));

        expect(user_routes.create).to.be.an.instanceOf(Function);
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

    public read(access_token: string, user: User,
                callback: TCallback<Error | IncomingMessageError, Response>) {
        if (access_token == null) return callback(new TypeError('access_token argument to get_user must be defined'));

        expect(user_routes.read).to.be.an.instanceOf(Function);
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

    public update(user: Partial<User>, access_token: string,
                  callback: TCallback<Error | IncomingMessageError, Response>) {
        if (user == null) return callback(new TypeError('user argument to update must be defined'));

        expect(user_routes.update).to.be.an.instanceOf(Function);
        supertest(this.app)
            .put('/api/user')
            .set('Connection', 'keep-alive')
            .set('X-Access-Token', access_token)
            .send(user)
            // .expect('Content-Type', /json/)
            .end((err, res: Response) => {
                if (err != null) return superEndCb(callback)(err, res);
                else if (res.error) return callback(getError(res.error));

                try {
                    expect(res.status).to.be.equal(201);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.be.jsonSchema(user_schema);
                    Object.keys(user).forEach(k => expect(user[k]).to.be.eql(res.body[k]));
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    superEndCb(callback)(err, res);
                }
            });
    }

    public get_all(access_token: string, callback: TCallback<Error | IncomingMessageError, Response>) {
        if (access_token == null) return callback(new TypeError('access_token argument to get_all must be defined'));

        expect(user_routes.getAll).to.be.an.instanceOf(Function);
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

    public unregister(ident: {access_token?: string, user_id?: string},
                      callback: TCallback<Error | IncomingMessageError, Response>) {
        if (ident == null) return callback(new TypeError('ident argument to unregister must be defined'));

        expect(user_routes.del).to.be.an.instanceOf(Function);
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
}
