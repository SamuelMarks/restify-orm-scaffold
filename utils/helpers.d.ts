import {WLError} from 'waterline';
import {CustomError} from './errors.d';

export interface helpers {
    trivial_merge(obj, ...objects: Array<{}>);
    uri_to_config(uri: string);
    fmtError(error: WLError | Error | any, statusCode: number): CustomError | Error;
    isShallowSubset(o0: {} | Array<any>, o1: {} | Array<any>);
    binarySearch(a: any[], e: any, c: (a, b) => boolean);
    groupBy(a: any[], f: Function): typeof a;
    objListToObj(objList: Array<{}>): {};
    populateModelRoutes(dir: string): IModelRoute;
    getUTCDate(now: Date): Date;
    sanitiseSchema(schema: {}, omit: Array<string>);
}

export interface IModelRoute {
    [key: string]: {
        routes?: {create?: Function, read?: Function, update?: Function, del?: Function};
        models?: any; // ^ Could have more than CRUD, but this is better than `any` or `{}`
    }
}
