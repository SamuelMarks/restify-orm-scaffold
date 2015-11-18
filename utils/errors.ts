import * as restify from 'restify';
import {inherits} from 'util';

export const to_end = res => {
    return {
        NotFound: (entity = 'Entity') => res.json(404, {
            error: 'NotFound', error_message: `${entity} not found`
        })
    }
}

export function NotFoundError(entity = 'Entity') {
    this.name = 'NotFoundError';
    const msg = `${entity} not found`
    restify.RestError.call(this, {
        restCode: this.name,
        statusCode: 404,
        message: msg,
        error_message: msg,
        constructorOpt: NotFoundError
    });
};
inherits(NotFoundError, restify.RestError);
