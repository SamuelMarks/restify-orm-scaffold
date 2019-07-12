import { basename } from 'path';

import { createLogger } from 'bunyan';
import { expect } from 'chai';
import supertest, { Response } from 'supertest';
import { Server } from 'restify';

import { TApp } from '@offscale/routes-merger/interfaces';

import { setupOrmApp } from '../../../main';
import { closeApp } from '../../shared_tests';

const tapp_name = `test::${basename(__dirname)}`;
const logger = createLogger({ name: tapp_name });

describe('Root::routes', () => {
    let app: Server;

    before(done => setupOrmApp(new Map(),
        { orms_in: undefined, logger }, { skip_start_app: true, app_name: tapp_name, logger },
        (err: Error, _app?: TApp) => {
            if (err != null) return done(err);
            app = _app as Server;
            return done(void 0);
        })
    );

    after(done => closeApp(app)(done));

    describe('/', () =>
        it('should get version', done => {
                supertest(app)
                    .get('/')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .end((err, res: Response) => {
                        if (err != null) return done(err);
                        try {
                            expect(res.status).to.be.equal(200);
                            expect(res.body).to.be.an.instanceOf(Object);
                            expect(res.body).to.have.property('version');
                            expect(res.body.version.split('.').length - 1).to.be.equal(2);
                        } catch (e) {
                            return done(e as Chai.AssertionError);
                        }
                        return done(void 0);
                    });
            }
        )
    );
});
