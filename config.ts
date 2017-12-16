import * as Logger from 'bunyan';
import { uri_to_config } from 'nodejs-utils';
import { IormMwConfig, IOrmsOut, RequestHandler } from 'orm-mw';
import { Server } from 'restify';
import { IRoutesMergerConfig } from 'routes-merger';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

/* TODO: Put this all in tiered environment-variable powered .json file */

export const db_uri: string = process.env['RDBMS_URI'] || process.env['DATABASE_URL'] || process.env['POSTGRES_URL'];

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
            logging: { logQueries: true }
        }
    ) as any as PostgresConnectionOptions
);

// import * as sequelize from 'sequelize';
export const sequelize_config /*: sequelize.Options*/ = {
    dialect: 'postgres',
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
export const _orms_out: {orms_out: IOrmsOut} = { orms_out: undefined };

export const getOrmMwConfig = (models: Map<string, any>, logger: Logger,
                               cb: (err: Error,
                                    with_app?: IRoutesMergerConfig['with_app'],
                                    orms_out?: IOrmsOut) => void): IormMwConfig => ({
    models, logger,
    orms_in: {
        redis: {
            skip: false
        },
        sequelize: {
            skip: true,
            config: sequelize_config,
            uri: db_uri
        },
        typeorm: {
            skip: false,
            config: typeorm_config
        },
        waterline: {
            skip: true /*,
            config: waterline_config*/
        }
    },
    callback: (e: Error, mw: RequestHandler, orms_out: IOrmsOut) => {
        if (e != null) {
            if (cb != null) return cb(e);
            throw e;
        }
        _orms_out.orms_out = orms_out;
        return cb(void 0, (_app: Server) => {
            _app.use(mw);
            // import { Next, Server } from 'restify';
            // import { WaterlineError } from 'custom-restify-errors';
            // import { WLError } from 'waterline';
            /*_app.on('WLError', (req, res, err: WLError, next: Next) =>
                next(new WaterlineError(err))
            );*/
            return _app;
        }, orms_out);
    }
});
