import Logger from 'bunyan';
import { IModelRoute } from '@offscale/nodejs-utils/interfaces';
import { IOrmMwConfig, IOrmsOut } from '@offscale/orm-mw/interfaces';
import { IRoutesMergerConfig } from '@offscale/routes-merger/interfaces';
export declare const package_: any;
export declare const logger: Logger;
export declare const all_models_and_routes: Map<string, any>;
export declare const all_models_and_routes_as_mr: IModelRoute;
export declare const setupOrmApp: (models_and_routes: Map<string, any>, mergeOrmMw: Partial<IOrmMwConfig>, mergeRoutesConfig: Partial<IRoutesMergerConfig>, callback: (err: Error, app?: any, orms_out?: IOrmsOut | undefined) => void) => any;
