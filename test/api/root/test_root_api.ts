import * as supertest from 'supertest';
import {Response} from 'supertest';
import {expect} from 'chai';
import {main} from './../../../main';

process.env.NO_SAMPLE_DATA = true;

describe('Root::routes', () => {
    before(done =>
        main(
            {},
            app => {
                this.app = app;
                return done();
            },
            true
        )
    );

    describe('/', () => {
        it('should get version', done =>
            supertest(this.app)
                .get('/')
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res: Response) => {
                    if (err) return done(err);
                    try {
                        expect(res.status).to.be.equal(200);
                        expect(res.body).to.have.property('version');
                        expect(
                            res.body.version.split('.').length - 1
                        ).to.be.equal(2);
                    } catch (e) {
                        err = <Chai.AssertionError>e;
                    } finally {
                        done(err, res.body);
                    }
                })
        );
    });
});
