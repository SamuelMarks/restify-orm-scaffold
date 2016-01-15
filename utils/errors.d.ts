/// <reference path='./../cust_typings/waterline.d.ts' />

declare var errors: errors.errors;

declare module errors {
    export interface errors {
        CustomError: CustomError;
        NotFoundError(string): void;
        WaterlineError(wl_error: waterline.WLError, statusCode: number): void;
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
}

declare module "errors" {
    export = errors;
}
