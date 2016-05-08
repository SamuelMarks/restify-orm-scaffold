import {WLError} from 'waterline';

export interface errors {
    fmtError(error: WLError | Error | any, statusCode: number);
    CustomError: CustomError;
    NotFoundError(string): void;
    WaterlineError(wl_error: WLError, statusCode: number): void;
}

export interface CustomError {
    body: {
        error: string,
        error_message: string,
        error_metadata?: {}
    };
    statusCode: number;
    message: string;
    constructorOpt: Function;
    restCode: string;
}
