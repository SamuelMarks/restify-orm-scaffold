import { networkInterfaces } from 'os';

import * as Logger from 'bunyan';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import * as restify from 'restify';
import { RequestHandler as RestifyRequestHandler } from 'restify';

import { IOrmMwConfig, IOrmsOut, RequestHandler } from '@offscale/orm-mw/interfaces';
import { uri_to_config } from '@offscale/nodejs-utils';
import { IRoutesMergerConfig, TApp } from '@offscale/routes-merger/interfaces';

/* TODO: Put this all in tiered environment-variable powered .json file */

export const db_uri: string = process.env['RDBMS_URI']
    || process.env['DATABASE_URL']
    || process.env['POSTGRES_URL']
    || '';

if (db_uri == null || !db_uri.length)
    throw ReferenceError('Database URI not set. See README.md for setup tutorial.');

export const typeorm_config: PostgresConnectionOptions = Object.freeze(
    Object.assign(Object.entries(uri_to_config(db_uri))
            .map((kv: [string, any]) => ({ [kv[0] === 'user' ? 'username' : kv[0]]: kv[1] }))
            .reduce((a, b) => Object.assign(a, b), {}),
        {
            type: 'postgres',
            autoSchemaSync: true,
            synchronize: true,
            logging: false
        }
    ) as PostgresConnectionOptions
);

// import * as sequelize from 'sequelize';
export const sequelize_config /*: sequelize.Options*/ = {
    dialect: 'postgres' as 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' | 'mariadb',
    define: {
        timestamps: false
    }
};

// Database waterline_config
/*import { ConfigOptions } from 'waterline';
import * as waterline_postgres from 'waterline-postgresql';*/
export const waterline_config /*: ConfigOptions*/ = Object.freeze({
    adapters: {
        url: db_uri,
        postgres: undefined // waterline_postgres
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
} /* as any as ConfigOptions */);

// ONLY USE `_orms_out` FOR TESTS!
export const _orms_out: {orms_out: IOrmsOut} = { orms_out: undefined as any };

export const getOrmMwConfig = (models: Map<string, any>, logger: Logger,
                               cb: (err: Error | undefined,
                                    with_app?: IRoutesMergerConfig['with_app'],
                                    orms_out?: IOrmsOut) => void): IOrmMwConfig => ({
    models, logger,
    orms_in: {
        redis: {
            skip: false,
            config: {
                port: parseInt(process.env.REDIS_PORT || 6379 as any, 10),
                host: process.env.REDIS_HOST || 'localhost'
            }
        },
        sequelize: {
            skip: true,
            config: sequelize_config,
            uri: db_uri
        },
        typeorm: {
            skip: false,
            config: typeorm_config as any
        },
        waterline: {
            skip: true /*,
            config: waterline_config*/
        }
    },
    callback: (e?: Error | undefined, mw?: RequestHandler, orms_out?: IOrmsOut) => {
        if (e != null) {
            if (cb != null) return cb(e);
            throw e;
        }
        _orms_out.orms_out = orms_out!;
        return cb(void 0, (_app: TApp) => {
            if (_app['use'])
                (_app as restify.Server).use(mw as RestifyRequestHandler);
            // import { Next, Server } from 'restify';
            // import { WaterlineError } from '@offscale/custom-restify-errors';
            // import { WLError } from 'waterline';
            /*_app.on('WLError', (req, res, err: WLError, next: Next) =>
                next(new WaterlineError(err))
            );*/
            return _app;
        }, orms_out!);
    }
});

export const getPrivateIPAddress = (): string => {
    const interfaces = networkInterfaces();
    for (const devName in interfaces) {
        if (!interfaces.hasOwnProperty(devName)) continue;
        const iface = interfaces[devName];

        for (const alias of iface) {
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                return alias.address;
        }
    }

    return '0.0.0.0';
};
