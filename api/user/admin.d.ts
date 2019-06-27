import * as restify from 'restify';
export declare const create: (app: restify.Server, namespace?: string) => boolean | restify.Route;
export declare const read: (app: restify.Server, namespace?: string) => boolean | restify.Route;
export declare const readAll: (app: restify.Server, namespace?: string) => boolean | restify.Route;
export declare const update: (app: restify.Server, namespace?: string) => boolean | restify.Route;
export declare const del: (app: restify.Server, namespace?: string) => boolean | restify.Route;
