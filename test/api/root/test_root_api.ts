/// <reference path='./../../../typings/restify/restify.d.ts' />
/// <reference path='./../../../typings/supertest/supertest.d.ts' />
/// <reference path='./../../../typings/mocha/mocha.d.ts' />
/// <reference path='./../../../typings/chai/chai.d.ts' />

import * as supertest from 'supertest';
import * as restify from 'restify';
import {expect} from 'chai';

import {main} from './../../../main';

describe('Root::routes', () => {
    before(done =>
        main(
            {},
            app => {
                this.app = app;
                done();
            },
            true
        )
    );

    describe('/', () => {
        it('should get version', (done) =>
            supertest(this.app)
                .get('/')
                .expect('Content-Type', /json/)
                .expect('Content-Length', '19')
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body).to.have.property('version').with.length(5);
                    return done();
                })
        );
    });
});
