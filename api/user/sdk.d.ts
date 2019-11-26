import { JsonSchema } from 'tv4';
import { Request } from 'restify';
import { IOrmReq } from '@offscale/orm-mw/interfaces';
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
    private static _user_config;
    constructor(public_registration: boolean, initial_accounts: User[]);
    static get instance(): UserConfig;
    static set instance(config: IUserConfig);
    static default(): UserConfig;
}
export declare const post: (req: UserBodyReq, config: UserConfig) => Promise<User>;
export declare const get: (req: UserBodyUserReq) => Promise<User>;
export declare const getAll: (req: IOrmReq) => Promise<{
    users: User[];
}>;
export declare const update: (req: UserBodyUserReq) => Promise<User | User[]>;
export declare const destroy: (req: IOrmReq & {
    body?: User | undefined;
    user_id: string;
}) => Promise<number>;
