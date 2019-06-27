import { TCallback } from '@offscale/nodejs-utils/interfaces';
import { IOrmReq } from '@offscale/orm-mw/interfaces';
import { RestError } from 'restify-errors';
import { JsonSchema } from 'tv4';
import { Request } from 'restify';
import { User } from './models';
export declare const schema: JsonSchema;
export declare type UserBodyReq = Request & IOrmReq & {
    body?: User;
};
export declare type UserBodyUserReq = UserBodyReq & {
    user_id: string;
};
export interface IUserConfig {
    public_registration: boolean;
    initial_accounts: User[];
}
export declare class UserConfig implements IUserConfig {
    public_registration: boolean;
    initial_accounts: User[];
    static default(): UserConfig;
    static instance: UserConfig;
    private static _user_config;
    constructor(public_registration: boolean, initial_accounts: User[]);
}
export declare const post: (req: UserBodyReq, config: UserConfig, callback: TCallback<Error, User>) => void;
export declare const get: (req: UserBodyUserReq, callback: TCallback<Error | RestError, User>) => Promise<void | User>;
export declare const getAll: (req: IOrmReq, callback: TCallback<Error | RestError, {
    users: User[];
}>) => Promise<void | {
    users: User[];
}>;
export declare const update: (req: UserBodyUserReq, callback: TCallback<Error, User>) => void | User;
export declare const destroy: (req: IOrmReq & {
    body?: User | undefined;
    user_id: string;
}, callback: TCallback<Error, number>) => void;
