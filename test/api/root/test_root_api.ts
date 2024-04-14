import { basename } from 'node:path';
import { describe, after, before, it } from "node:test";

import { pino, Logger } from 'pino';
import supertest, { Response } from 'supertest';
import { Server } from 'restify';

import { TApp } from '@offscale/routes-merger/interfaces';

import { setupOrmApp } from '../../../main';
import { closeApp } from '../../shared_tests';
import assert from "node:assert/strict";

const tapp_name = `test::${basename(__dirname)}`;
const logger: Logger = pino({ name: tapp_name });

describe('Root::routes', () => {
    let app: Server;

    before((t, done) => setupOrmApp(new Map(),
        { orms_in: undefined, logger },
        { skip_use: true, skip_start_app: true, app_name: tapp_name, logger },
        (err: Error, _app?: TApp) => {
            if (err != null) return done(err);
            app = _app as Server;
            return done(void 0);
        })
    );

    after((t, done) => closeApp(app)(done));

    describe('/', () =>
        it('should get version', (t, done) => {
                supertest(app)
                    .get('/')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .end((err, res: Response) => {
                        if (err != null) return done(err);
                        try {
                            assert.strictEqual(res.status, 200);
                            assert.ok(res.body instanceof Object);
                            assert.ok(res.body.hasOwnProperty('version'));
                            assert.strictEqual(res.body.version.split('.').length - 1, 2);
                        } catch (e) {
                            return done(e);
                        }
                        return done(void 0);
                    });
            }
        )
    );
});
