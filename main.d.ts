/// <reference types="node" />
/// <reference types="connect" />
import Logger from 'bunyan';
import { default as restify } from 'restify';
import { IModelRoute } from '@offscale/nodejs-utils/interfaces';
import { IOrmMwConfig, IOrmsOut } from '@offscale/orm-mw/interfaces';
import { IRoutesMergerConfig, TApp } from '@offscale/routes-merger/interfaces';
export declare const package_: any;
export declare const logger: Logger;
export declare const all_models_and_routes: Map<string, any>;
export declare const all_models_and_routes_as_mr: IModelRoute;
export declare const setupOrmApp: (models_and_routes: Map<string, any>, mergeOrmMw: Partial<IOrmMwConfig>, mergeRoutesConfig: Partial<IRoutesMergerConfig>, callback: (err: Error, app?: import("http").Server | import("https").Server | restify.Server | import("connect").Server | undefined, orms_out?: IOrmsOut | undefined) => void) => void;
