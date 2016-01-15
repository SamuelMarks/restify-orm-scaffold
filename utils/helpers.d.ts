/// <reference path='./../typings/restify/restify.d.ts' />
/// <reference path='./../cust_typings/waterline.d.ts' />
/// <reference path='./errors.d.ts' />

declare var helpers: helpers.helpers;

declare module helpers {
    export interface helpers {
        trivial_merge(obj, ...objects: Array<{}>);
        uri_to_config(uri: string);
        fmtError(error: waterline.WLError | Error | any, statusCode: number): errors.CustomError | Error;
        isShallowSubset(o0: {} | Array<any>, o1: {} | Array<any>);
        binarySearch(a: any[], e: any, c: (a, b) => boolean);
        groupBy(a: any[], f: Function): typeof a;
        objListToObj(objList: Array<{}>): {};
        populateModelRoutes(dir: string): IModelRoute;
    }

    export interface IModelRoute {
        [key: string]: {
            routes?: {create?: Function, read?: Function, update?: Function, del?: Function};
            models?: any; // ^ Could have more than CRUD, but this is better than `any` or `{}`
        }
    }
}

declare module "helpers" {
    export = helpers;
}
