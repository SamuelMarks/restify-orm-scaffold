import * as supertest from 'supertest';
import {Response} from 'supertest';
import {expect} from 'chai';
import {strapFramework} from 'restify-utils';
import {strapFrameworkKwargs, IObjectCtor} from './../../../main';

declare var Object: IObjectCtor;

process.env.NO_SAMPLE_DATA = true;

describe('Root::routes', () => {
    before(done =>
        strapFramework(Object.assign({}, strapFrameworkKwargs, {
            models_and_routes: {},
            createSampleData: false,
            skip_db: true,
            use_redis: false,
            start_app: false,
            app_name: 'test-root-api',
            callback: (err, app) => {
                if (err) return done(err);
                this.app = app;
                return done();
            }
        }))
    );

    describe('/', () =>
        it('should get version', (done: any) =>
            supertest(this.app)
                .get('/')
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res: Response) => {
                    if (err) return done(err);
                    try {
                        expect(res.status).to.be.equal(200);
                        expect(res.body).to.be.an.instanceOf(Object);
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
        )
    );
});
