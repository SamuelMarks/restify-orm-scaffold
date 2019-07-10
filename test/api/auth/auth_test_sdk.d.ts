import { Server } from 'restify';
import { Response } from 'supertest';
import { AccessTokenType } from '@offscale/nodejs-utils/interfaces';
import { User } from '../../../api/user/models';
export declare class AuthTestSDK {
    app: Server;
    private user_sdk;
    constructor(app: Server);
    login(user: User): Promise<Response>;
    unregister_all(users: User[]): Promise<Response[]>;
    register_login(user?: User, num?: number): Promise<AccessTokenType>;
    logout_unregister(user: User, num?: number): Promise<unknown>;
}
