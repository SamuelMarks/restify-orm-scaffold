import * as redis from 'redis';
import {Collection, Connection} from 'waterline';
import * as waterline_postgres from 'waterline-postgresql';
import {createLogger} from 'bunyan';
import {trivial_merge, uri_to_config, populateModelRoutes, IModelRoute} from 'nodejs-utils';
import {SampleData} from './test/SampleData';
import {strapFramework, IStrapFramework} from 'restify-utils';

export const package_ = require('./package');
export const logger = createLogger({
    name: 'main'
});

if (!process.env.NO_DEBUG) {
    var i = {};
    Object.keys(process.env)
        .sort()
        .forEach(function (k) {
            i[k] = process.env[k];
        });
    logger.info(JSON.stringify(i, null, 4));
    logger.info('------------');
}

export interface IObjectCtor extends ObjectConstructor {
    assign(target: any, ...sources: any[]): any;
}

declare var Object: IObjectCtor;

// Database waterline_config
const db_uri: string = process.env.RDBMS_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL;


export const waterline_config = {
    /* TODO: Put this all in tiered environment-variable powered .json file */
    adapters: {
        url: db_uri,
        postgres: waterline_postgres
    },
    defaults: {
        migrate: 'create',
    },
    connections: {
        postgres: trivial_merge({
            adapter: 'postgres'
        }, !process.env.DOKKU_POSTGRES_REST_API_DB_PORT_5432_TCP_ADDR ?
            uri_to_config(db_uri) : {
            "database": db_uri.substr(db_uri.lastIndexOf('/') + 1),
            "host": process.env.DOKKU_POSTGRES_REST_API_DB_PORT_5432_TCP_ADDR,
            "identity": "postgres",
            "password": process.env.DOKKU_POSTGRES_REST_API_DB_ENV_POSTGRES_PASSWORD,
            "user": "postgres",
        })
    }
};

export const all_models_and_routes: IModelRoute = populateModelRoutes('.');

export const redis_cursors: { redis: redis.RedisClient } = {
    redis: null
};

export const c: {collections: Collection[], connections: Connection[]} = {collections: [], connections: []};

let _cache = {};

export const strapFrameworkKwargs: IStrapFramework = Object.freeze(<IStrapFramework>{
    app_name: package_.name,
    models_and_routes: all_models_and_routes,
    logger: logger,
    _cache: _cache,
    package_: package_,
    root: '/api',
    skip_db: false,
    collections: c.collections,
    waterline_config: waterline_config,
    use_redis: true,
    redis_cursors: redis_cursors,
    createSampleData: true,
    SampleData: SampleData,
    sampleDataToCreate: (sampleData: any) => [
        cb => sampleData.unregister(cb),
        cb => sampleData.registerLogin(cb)
    ]
});

if (require.main === module) {
    strapFramework(Object.assign({
        start_app: true, callback: (_app, _connections: Connection[], _collections: Collection[]) =>
            c.collections = _collections
    }, strapFrameworkKwargs));
}
