/// <reference path='./cust_typings/waterline.d.ts' />
/// <reference path='./cust_typings/sails-postgresql.d.ts' />
/// <reference path='./typings/redis/redis.d.ts' />

import * as restify from 'restify';
import * as redis from 'redis';
import * as Waterline from 'waterline';
import * as sails_postgresql from 'sails-postgresql';

import {trivial_merge, uri_to_config} from './utils/helpers';
const package_ = require('./package');

// Merge custom errors
import * as _errors from './utils/errors';

// Import models
import * as user_models from './api/user/models';
import * as auth_models from './api/auth/models';

// Import routes
import * as user_routes from './api/user/routes';
import * as auth_routes from './api/auth/routes';

// Database config
const config = {
    /* TODO: Put this all in tiered environment-variable powered .json file */
    adapters: {
        url: process.env.RDBMS_URI,
        postgres: sails_postgresql
    },
    connections: {
        postgres: trivial_merge({
            adapter: 'postgres'
        }, uri_to_config(process.env.RDBMS_URI))
    }
};

export interface IModelRoute {
    [key: string]: {
        routes?: any;
        models?: any;
    }
}

export const all_models_and_routes: IModelRoute = {
    user: { routes: user_routes, models: user_models },
    auth: { routes: auth_routes, models: auth_models }
};

export const cursors: { redis: redis.RedisClient } = {
    redis: null
};

export let collections: waterline.Query[] = null;

export function main(
    models_and_routes: IModelRoute,
    cb?: (app: restify.Server, connections?: any[]) => void,
    skip_db: boolean = false
) {
    // Init server obj
    let app = restify.createServer();
    const root: string = '/api';
    app.use(restify.queryParser());
    app.use(restify.bodyParser());

    ['/', '/version', '/api', '/api/version'].map(route_path => app.get(
        route_path,
        (req: restify.Request, res: restify.Response, next: restify.Next) =>
            res.json({ version: package_.version })
    ));

    // Init database obj
    let waterline: typeof Waterline = new Waterline();

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
            Object.keys(models_and_routes[entity].models).map(
                model =>
                    models_and_routes[entity].models
                        && (models_and_routes[entity].models[model].identity
                            ||
                            models_and_routes[entity].models[model].tableName)
                        ?
                        waterline.loadCollection(
                            Waterline.Collection.extend(
                                models_and_routes[entity].models[model]
                            )
                        )
                        : console.warn(`Not initialising: ${entity}.${model}`)
            );
    });

    if (cb && skip_db) return cb(app);

    cursors.redis = redis.createClient();
    cursors.redis.on('error', function(err) {
        console.error(`Redis::error event -
            ${cursors.redis['host']}:${cursors.redis['port']}
            - ${err}`);
        console.error(err);
    });

    // Create/init database models, populated exported collections, serve API
    waterline.initialize(config, function(err, ontology) {
        if (err !== null) throw err;

        // Tease out fully initialised models.
        collections = <Waterline.Query[]>(ontology.collections);
        console.info(
            'ORM initialised with collections:', Object.keys(collections)
        );

        if (cb) return cb(app, ontology.connections); // E.g.: for testing
        else // Start API server
            app.listen(process.env.PORT || 3000, function() {
                console.info('%s listening at %s', app.name, app.url);
            });
    });
}

if (require.main === module) {
    main(all_models_and_routes);
}
