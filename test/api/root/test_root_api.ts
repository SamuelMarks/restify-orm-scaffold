import { expect } from 'chai';
import { Server } from 'restify';
import { strapFramework } from 'restify-orm-framework';
import * as supertest from 'supertest';
import { Response } from 'supertest';
import { strapFrameworkKwargs } from '../../../main';

describe('Root::routes', () => {
    let app: Server;

    before(done =>
        strapFramework(Object.assign({}, strapFrameworkKwargs, {
            models_and_routes: {},
            createSampleData: false,
            skip_waterline: true,
            skip_typeorm: true,
            skip_redis: true,
            skip_start_app: true,
            app_name: 'test-root-api',
            callback: (err, _app: Server) => {
                if (err != null) return done(err);
                app = _app;
                return done();
            }
        }))
    );

    describe('/', () =>
        it('should get version', done => {
                supertest(app)
                    .get('/')
                    .expect('Content-Type', /json/)
                    .end((err, res: Response) => {
                        if (err != null) return done(err);
                        try {
                            expect(res.status).to.be.equal(200);
                            expect(res.body).to.be.an.instanceOf(Object);
                            expect(res.body).to.have.property('version');
                            expect(res.body.version.split('.').length - 1).to.be.equal(2);
                        } catch (e) {
                            err = e as Chai.AssertionError;
                        } finally {
                            done(err);
                        }
                    });
            }
        )
    );
});
