/// <reference path='./../typings/restify/restify.d.ts' />
/// <reference path='./../typings/tv4/tv4.d.ts' />

import * as restify from 'restify';
import {validateMultiple as tv4_validateMultiple} from 'tv4';
import {trivial_merge} from './helpers';

export function has_body(req: restify.Request, res: restify.Response, next: restify.Next) {
    if (!req.body) res.json(400, { error: 'ValidationError', error_message: 'Body required' });
    return next();
}

export function mk_valid_body_mw(json_schema: tv4.JsonSchema, to_res = true) {
    return function valid_body(req: restify.Request, res: restify.Response, next: restify.Next) {
        const body_is = tv4_validateMultiple(req.body, json_schema);
        if (!body_is.valid)
            (error => to_res ? res.json(400, error) : req['json_schema_error'] = error)(
                body_is.errors.length === 1 ? {
                    error: 'ValidationError',
                    error_message: body_is.errors[0]['message']
                } : {
                        error: 'ValidationError',
                        error_message: 'JSON-Schema validation failed',
                        error_metadata: {
                            cls: 'tv4',
                            errors: body_is['errors'].map(function(error: tv4.ErrorVar) {
                                return trivial_merge({
                                    code: error.code,
                                    dataPath: error.dataPath,
                                    message: error.message,
                                    params: error.params,
                                    schemaPath: error.schemaPath,
                                    subErrors: error.subErrors
                                }, process.env.DEBUG_LEVEL && parseInt(
                                    process.env.DEBUG_LEVEL) > 2 ? { stack: error.stack } : {})
                            }),
                            missing: body_is['missing'],
                            valid: body_is['valid']
                        }
                    }
            )
        return next();
    }
}

export function mk_valid_body_mw_ignore(json_schema: tv4.JsonSchema, ignore: Array<string>) {
    return function valid_body(req: restify.Request, res: restify.Response, next: restify.Next) {
        if (!req['json_schema_error']) return next();
        ignore.map(
            filter => {
                switch (true) {
                    case req['json_schema_error'].error_message.substr(0, filter.length) === filter:
                        req['json_schema_error'].delete_me = true;
                        break;
                    case req['json_schema_error'].error_message === 'JSON-Schema validation failed':
                        req['json_schema_error'].error_metadata.errors = req['json_schema_error'].error_metadata.errors.filter(
                            error => error.message.substr(0, filter.length) !== filter
                        )
                        break;
                    default:
                        console.warn('Unknown dataset received instead of json_schema_error');
                }
            }
        )
        if (req['json_schema_error'].delete_me
            || req['json_schema_error'].error_metadata
            && !req['json_schema_error'].error_metadata.errors.length)
            delete req['json_schema_error'];

        return next();
    }
}

export function remove_from_body(keys: Array<string>) {
    return (req: restify.Request, res: restify.Response, next: restify.Next) => {
        keys.map(key => req.body && req.body[key] ? delete req.body[key] : null);
        return next();
    }
}
