import { Redis } from 'ioredis';
import { AccessTokenType } from '@offscale/nodejs-utils/interfaces';
import { RestError } from 'restify-errors';
declare type LogoutArg = {
    user_id: string;
    access_token?: never;
} | {
    user_id?: never;
    access_token: AccessTokenType;
};
export declare class AccessToken {
    private redis;
    constructor(redis: Redis);
    static reset(): void;
    static get(cursor: Redis): AccessToken;
    findOne(access_token: AccessTokenType): Promise<string>;
    deleteOne(access_token: AccessTokenType): Promise<number>;
    logout(arg: LogoutArg, callback: (err?: Error | RestError) => void): void;
    add(user_id: string, roles: string, scope: 'access', callback: (err: Error, access_token: AccessTokenType) => void): void;
}
export {};
