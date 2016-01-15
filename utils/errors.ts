/// <reference path='./../cust_typings/waterline.d.ts' />
/// <reference path='./errors.d.ts' />

import {RestError} from 'restify';
import {inherits} from 'util';

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
    RestError.call(this, <errors.CustomError>{
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

export function WaterlineError(wl_error: waterline.WLError, statusCode = 400) {
    this.name = 'WaterlineError';
    RestError.call(this, <errors.CustomError>{
        message: wl_error.reason,
        statusCode: statusCode,
        constructorOpt: WaterlineError,
        restCode: this.name,
        body: {
            error: wl_error.code,
            error_message: wl_error.reason,
            error_metadata: {
                details: wl_error.details.split('\n'),
                invalidAttributes: wl_error.invalidAttributes
            }
        }
    }
    );
}
inherits(NotFoundError, RestError);
