import * as supertest from 'supertest';
import {Response} from 'supertest';
import {expect} from 'chai';
import {strapFramework} from 'restify-utils';
import {strapFrameworkKwargs} from './../../../main';

interface IObjectCtor extends ObjectConstructor {
    assign(target: any, ...sources: any[]): any;
}
declare var Object: IObjectCtor;

process.env.NO_SAMPLE_DATA = true;

describe('Root::routes', () => {
    before(done => strapFramework(Object.assign({}, strapFrameworkKwargs, {
        models_and_routes: {},
        createSampleData: false,
        skip_db: true,
        use_redis: false,
        callback: app => {
            this.app = app;
            done();
        }
    })));

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
        );
    });
});
