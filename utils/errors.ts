/// <reference path='./errors.d.ts' />

import {RestError} from 'restify';
import {inherits} from 'util';
import {trivial_merge} from './helpers';
import {WLError} from 'waterline';
import {CustomError} from './errors.d';

export function fmtError(error: WLError | Error | any, statusCode = 400) {
    if (!error) return null;
    else if (error.originalError) {
        if (!process.env['NO_DEBUG'])
            console.error(error);
        error = error.originalError;
    }

    if (error instanceof RestError) return error;
    else if (error.invalidAttributes || error.hasOwnProperty('internalQuery'))
        return new WaterlineError(error, statusCode);
    else {
        Object.keys(error).map(k => console.log(k, '=', error[k]));
        throw TypeError('Unhandled input to fmtError:' + error)
    }
}

export const to_end = res => {
    return {
        NotFound: (entity = 'Entity') => res.json(404, {
            error: 'NotFound', error_message: `${entity} not found`
        })
    }
};

export function NotFoundError(entity = 'Entity') {
    this.name = 'NotFoundError';
    const msg = `${entity} not found`;
    RestError.call(this, <CustomError>{
            restCode: this.name,
            statusCode: 404,
            message: msg,
            constructorOpt: NotFoundError,
            body: {
                error: this.name,
                error_message: msg
            }
        }
    );
}
inherits(NotFoundError, RestError);

export function WaterlineError(wl_error: WLError, statusCode = 400) {
    this.name = 'WaterlineError';
    RestError.call(this, <CustomError>{
            message: wl_error.reason || wl_error.detail,
            statusCode: statusCode,
            constructorOpt: WaterlineError,
            restCode: this.name,
            body: trivial_merge({
                    error: {
                        /* TODO: populate with http://www.postgresql.org/docs/9.5/static/errcodes-appendix.html
                         *  Or use https://raw.githubusercontent.com/ericmj/postgrex/v0.11.1/lib/postgrex/errcodes.txt
                         * */
                        23505: 'unique_violation'
                    }[wl_error.code],
                    error_message: wl_error.reason || wl_error.detail
                }, ((o: {error_metadata?: {}}) => Object.keys(o.error_metadata).length > 0 ? o : {})({
                    error_metadata: trivial_merge({},
                        wl_error.invalidAttributes ? {invalidAttributes: wl_error.invalidAttributes} : {},
                        wl_error.details ? {details: wl_error.details.split('\n')} : {}
                    )
                })
            )
        }
    );
}
inherits(WaterlineError, RestError);
