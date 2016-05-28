import * as async from 'async';
import * as restify from 'restify';
import * as redis from 'redis';
import * as Waterline from 'waterline';
import {Query, WLError, waterline, Collection} from 'waterline';
import * as sails_postgresql from 'sails-postgresql';
import {createLogger} from 'bunyan';
import {trivial_merge, uri_to_config, populateModelRoutes, IModelRoute} from 'nodejs-utils';
import {WaterlineError} from 'restify-errors';
import {SampleData} from './test/SampleData';

const package_ = require('./package');
const logger = createLogger({
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
// Database config
const db_uri: string = process.env.RDBMS_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL;


const config = {
    /* TODO: Put this all in tiered environment-variable powered .json file */
    adapters: {
        url: db_uri,
        postgres: sails_postgresql
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

export const cursors: { redis: redis.RedisClient } = {
    redis: null
};

export let collections: Query[] = null;

export function main(models_and_routes: IModelRoute,
                     callback?: (app: restify.Server, connections?: any[]) => void,
                     skip_db: boolean = false,
                     createSampleData: boolean = !process.env.NO_SAMPLE_DATA) {
    // Init server obj
    let app = restify.createServer();
    const root: string = '/api';

    app.use(restify.queryParser());
    app.use(restify.bodyParser());

    app.on('WLError', (req: restify.Request, res: restify.Response,
                       err: WLError, next: restify.Next) => {
        return next(new WaterlineError(err));
    });

    app.on('after', restify.auditLogger({
        log: createLogger({
            name: 'audit',
            stream: process.stdout
        })
    }));

    ['/', '/version', '/api', '/api/version'].map(route_path => app.get(
        route_path,
        (req: restify.Request, res: restify.Response, next: restify.Next) => {
            res.json({version: package_.version});
            next()
        }
    ));

    // Init database obj
    const waterline: waterline = new Waterline();

    function tryTblInit(entity) {
        return function tryInit(model) {
            models_and_routes[entity].models
            && (models_and_routes[entity].models[model].identity
            ||
            models_and_routes[entity].models[model].tableName)
                ?
                waterline.loadCollection(
                    Collection.extend(
                        models_and_routes[entity].models[model]
                    )
                )
                : logger.warn(`Not initialising: ${entity}.${model}`)
        }
    }

    models_and_routes['contact'] && tryTblInit('contact')('Contact');
    models_and_routes['kv'] && tryTblInit('kv')('KV');

    Object.keys(models_and_routes).map(entity => {
        // Merge routes
        if (models_and_routes[entity].routes)
            Object.keys(models_and_routes[entity].routes).map(
                route => models_and_routes[entity].routes[route](
                    app, `${root}/${entity}`
                )
            );

        // Merge models
        if (models_and_routes[entity].models)
            Object.keys(models_and_routes[entity].models).map(tryTblInit(entity));
    });

    if (callback && skip_db) return callback(app);

    cursors.redis = redis.createClient(process.env.REDIS_URL);
    cursors.redis.on('error', function (err) {
        logger.error(`Redis::error event -
            ${cursors.redis['host']}:${cursors.redis['port']}
            - ${err}`);
        logger.error(err);
    });

    // Create/init database models, populated exported collections, serve API
    waterline.initialize(config, function (err, ontology) {
        if (err !== null) throw err;

        // Tease out fully initialised models.
        collections = <Waterline.Query[]>(ontology.collections);
        logger.info(
            'ORM initialised with collections:', Object.keys(collections)
        );

        if (callback) return callback(app, ontology.connections); // E.g.: for testing
        else // Start API server
            app.listen(process.env.PORT || 3000, function () {
                logger.info('%s listening at %s', app.name, app.url);

                if (createSampleData) {
                    const sampleData = new SampleData(app.url);
                    async.series([
                            cb => sampleData.unregister(cb),
                            cb => sampleData.registerLogin(cb)
                        ], (err, results) =>
                            err ? console.error(err) : console.info(results)
                    );
                }
            });
    });
}

if (require.main === module) {
    main(all_models_and_routes);
}
