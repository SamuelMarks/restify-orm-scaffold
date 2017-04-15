import { homedir } from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as redis from 'redis';
import { Collection, Connection, Query } from 'waterline';
import * as waterline_postgres from 'waterline-postgresql';
import { createLogger } from 'bunyan';
import { Server } from 'restify';
import { NotFoundError } from 'restify-errors';
import { IModelRoute, populateModelRoutes, uri_to_config } from 'nodejs-utils';
import { IStrapFramework, strapFramework } from 'restify-utils';
import { SampleData } from './test/SampleData';
import { user_mocks } from './test/api/user/user_mocks';
import { saltSeeker, shakeSalt } from './api/user/utils';

/* tslint:disable:no-var-requires */
export const package_ = Object.freeze(require('./package'));
export const logger = createLogger({
    name: 'main'
});

/* tslint:disable:no-unused-expression */
process.env['NO_DEBUG'] || logger.info(Object.keys(process.env).sort().map(k => ({[k]: process.env[k]})));

export interface IObjectCtor extends ObjectConstructor {
    assign(target: any, ...sources: any[]): any;
}

declare const Object: IObjectCtor;

// Database waterline_config
const db_uri: string = process.env['RDBMS_URI'] || process.env['DATABASE_URL'] || process.env['POSTGRES_URL'];

const db_path = (r => !!r ? r : path.join(homedir(), '.glaucoma_risk_calculator'))(
    process.argv.length > 2 ? process.argv.slice(2).reduce((acc, arg) =>
        ['--dbpath', '-d'].indexOf(acc) > -1 ? acc = arg : null
    ) : path.join(homedir(), '.glaucoma_risk_calculator'));

const init_db_dir = (db_type, cb) => {
    ['nedb', 'tingo'].indexOf(db_type) > -1 ?
        fs.access(db_path, err => {
            if (!err) return cb();
            fs.mkdir(db_path, e => cb(err));
        }) : cb();
};

/* TODO: Put this all in tiered environment-variable powered .json file */

export const waterline_config = Object.freeze({
    adapters: {
        url: db_uri,
        postgres: waterline_postgres
    },
    defaults: {
        migrate: 'create'
    },
    connections: {
        main_db: {
            adapter: 'postgres',
            connection: uri_to_config(db_uri),
            pool: {
                min: 2,
                max: 20
            }
        }
    }
});

// Other config examples:
Object.freeze({
    adapters: {
        tingo: 'waterline_tango' // "import * as waterline_tingo from 'sails-tingo'"
    },
    connections: {
        main_db: {
            adapter: 'tingo',
            connection: db_path,
            dbPath: db_path,
            nativeObjectID: false,
            memStore: false
        }
    },
    defaults: {
        migrate: 'safe' // drop, alter, create, safe
    }
});

Object.freeze({
    adapters: {
        nedb: 'waterline_nedb' // "import * as waterline_nedb from 'waterline-nedb';"
    },
    connections: {
        main_db: {
            adapter: 'nedb',
            connection: db_path,
            dbPath: db_path,
            inMemoryOnly: false
        }
    },
    defaults: {
        migrate: 'safe'
    }
});

export const all_models_and_routes: IModelRoute = populateModelRoutes('.');

export const redis_cursors: { redis: redis.RedisClient } = {
    redis: null
};

export const c: { collections: Query[], connections: Connection[] } = {collections: [], connections: []};

const _cache = {};
export const cache = {};
const default_user: string = JSON.stringify(user_mocks.successes[98]);
export const strapFrameworkKwargs: IStrapFramework = Object.freeze({
    app_name: package_.name,
    models_and_routes: all_models_and_routes,
    logger,
    _cache,
    package_,
    root: '/api',
    skip_db: false,
    collections: c.collections,
    waterline_config: waterline_config as any,
    use_redis: true,
    redis_cursors,
    createSampleData: true,
    SampleData,
    sampleDataToCreate: (sampleData: SampleData) => [
        cb => saltSeeker(saltSeekerCb(cb)),
        cb => sampleData.unregister(default_user, (err, res) => cb(err, 'removed default user; next: adding')),
        cb => sampleData.registerLogin(default_user, cb)
    ]
} as IStrapFramework);

export const saltSeekerCb = cb => (err, salt) => {
    if (err)
        return err instanceof NotFoundError ?
            shakeSalt((e, s) => s ? cb(e, cache['global_salt'] = s) : cb(e)) :
            cb(err);
    return salt ? cb(err, cache['global_salt'] = salt) : cb(err);
};

if (require.main === module) {
    init_db_dir(waterline_config.connections.main_db.adapter, _ =>
        strapFramework(Object.assign({
            start_app: true, callback: (err, _app: Server, _connections: Connection[], _collections: Collection[]) => {
                if (err) throw err;
                c.connections = _connections;
                c.collections = _collections;
            }
        }, strapFrameworkKwargs))
    );
}
