import * as restify from 'restify';
export declare const has_auth: (scope?: string) => (request: restify.Request, res: restify.Response, next: restify.Next) => void;
