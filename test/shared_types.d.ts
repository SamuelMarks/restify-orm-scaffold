import { Response } from 'supertest';

export type cb = (err: Error, res?: any) => void;

export interface IncomingMessageError {
    name: string;
    jse_shortmsg: string;
    jse_info: {};
    message: string;
    statusCode: number;
    body: any | {} | {error: string, error_message: string};
    restCode: 'IncomingMessageError';
}

export type strCb = (err?: Error, res?: string) => string;
export type strCbV = (err?: Error, res?: string) => void;
export type numCb = (err?: Error, res?: number) => string;
export type TCallback<E, R> = (err?: E, res?: R) => R | void;
export type HttpStrResp = (error: Error | IncomingMessageError, response?: Response) => string;
