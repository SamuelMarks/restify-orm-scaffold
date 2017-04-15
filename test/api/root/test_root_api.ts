import * as supertest from 'supertest';
import { Response } from 'supertest';
import { expect } from 'chai';
import { strapFramework } from 'restify-utils';
import { Server } from 'restify';
import { IObjectCtor, strapFrameworkKwargs } from '../../../main';

declare const Object: IObjectCtor;

describe('Root::routes', () => {
    let app: Server;

    before(done =>
        strapFramework(Object.assign({}, strapFrameworkKwargs, {
            models_and_routes: {},
            createSampleData: false,
            skip_db: true,
            use_redis: false,
            start_app: false,
            app_name: 'test-root-api',
            callback: (err, _app: Server) => {
                if (err) return done(err);
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
                        if (err) return done(err);
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
