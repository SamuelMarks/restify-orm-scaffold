import * as waterline_postgres from 'waterline-postgresql';
import { series } from 'async';
import { Collection, Connection, Query } from 'waterline';
import { createLogger } from 'bunyan';
import { Server } from 'restify';
import { Connection as TypeOrmConnection } from 'typeorm';
import { get_models_routes, IModelRoute, populateModelRoutes, raise, uri_to_config } from 'nodejs-utils';
import { IStrapFramework, strapFramework } from 'restify-orm-framework';
import { Redis } from 'ioredis';

import { user_mocks } from './test/api/user/user_mocks';
import { AuthTestSDK } from './test/api/auth/auth_test_sdk';
import { IUserBase } from './api/user/models.d';

/* tslint:disable:no-var-requires */
export const package_ = Object.freeze(require('./package'));
export const logger = createLogger({
    name: 'main'
});

/* tslint:disable:no-unused-expression */
process.env['NO_DEBUG'] || logger.info(Object.keys(process.env).sort().map(k => ({ [k]: process.env[k] })));

/* TODO: Put this all in tiered environment-variable powered .json file */
const db_uri: string = process.env['RDBMS_URI'] || process.env['DATABASE_URL'] || process.env['POSTGRES_URL'];
// Database waterline_config
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
            connection: db_uri,
            pool: {
                min: 2,
                max: 20
            }
        }
    }
});
export const typeorm_config = Object.freeze(
    Object.assign(Object.entries(uri_to_config(db_uri))
            .map((kv: [string, any]) => ({ [kv[0] === 'user' ? 'username' : kv[0]]: kv[1] }))
            .reduce((a, b) => Object.assign(a, b), {}),
        {
            type: 'postgres',
            autoSchemaSync: true
        }
    ) as any as TypeOrmConnection
);

export const all_models_and_routes: Map<string, any> = populateModelRoutes(__dirname);
export const all_models_and_routes_as_mr: IModelRoute = get_models_routes(all_models_and_routes);

export const redis_cursors: {redis: Redis} = { redis: null };

export const c: {collections: Query[], connections: Connection[], connection: TypeOrmConnection} = {
    collections: [], connections: [], connection: undefined
};

const _cache = {};
export const cache = {};
const default_user: IUserBase = user_mocks.successes[98];
export const strapFrameworkKwargs: IStrapFramework = Object.freeze({
    app_name: package_.name,
    models_and_routes: all_models_and_routes,
    logger,
    _cache,
    package_,
    root: '/api',
    skip_waterline: false,
    skip_typeorm: false,
    waterline_collections: c.collections,
    waterline_config: waterline_config as any,
    typeorm_config: typeorm_config as any,
    skip_redis: false,
    skip_start_app: false,
    skip_app_logging: false,
    redis_cursors,
    onServerStart: (uri: string, connections: Connection[], collections: Query[],
                    connection: TypeOrmConnection, _app: Server, next) => {
        c.connections = connections;
        c.collections = collections;
        c.connection = connection;

        const authSdk = new AuthTestSDK(_app);

        series([
                cb => authSdk.unregister_all([default_user],
                    (err: Error | any | {status: number}) => cb(err != null && err.status !== 404 ? err : void 0,
                        'removed default user; next: adding')),
                cb => authSdk.register_login(default_user, cb),
                // cb => logger.info(`${_app.name} listening from ${_app.url}`) || cb(void 0)
            ], (e: Error) => e == null ? next(void 0, _app, connections, collections, connection) : raise(e)
        );
    }
});

if (require.main === module)
    strapFramework(Object.assign({
            start_app: true, callback: (err, _app: Server,
                                        _connections: Connection[], _collections: Collection[],
                                        connection: TypeOrmConnection) => {
                if (err != null) throw err;
                c.connections = _connections;
                c.collections = _collections;
                c.connection = connection;
                logger.info('(require.main === module)::strapFramework::callback');
            }
        }, strapFrameworkKwargs)
    );
