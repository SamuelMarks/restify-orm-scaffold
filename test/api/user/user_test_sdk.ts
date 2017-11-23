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
}
