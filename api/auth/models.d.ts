import { Redis } from 'ioredis';
import { RestError } from 'restify-errors';
import { AccessTokenType } from '@offscale/nodejs-utils/interfaces';
declare type LogoutArg = {
    user_id: string;
    access_token?: never;
} | {
    user_id?: never;
    access_token: AccessTokenType;
};
export declare class AccessToken {
    private redis;
    static reset(): void;
    static get(cursor: Redis): AccessToken;
    constructor(redis: Redis);
    findOne(access_token: AccessTokenType): Promise<string>;
    deleteOne(access_token: AccessTokenType): Promise<number>;
    logout(arg: LogoutArg, callback: (err?: Error | RestError) => void): void;
    add(user_id: string, roles: string, scope: 'access', callback: (err: Error | null, access_token: AccessTokenType) => void): void;
}
export {};
