import supertest, { Response } from 'supertest';
import { Server } from 'restify';
import { AccessTokenType } from '@offscale/nodejs-utils/interfaces';
import { User } from '../../../api/user/models';
export declare class UserTestSDK {
    app: Server;
    constructor(app: Server);
    register(user: User): Promise<Response>;
    read(access_token: AccessTokenType, expected_user: User): Promise<Response>;
    update(access_token: AccessTokenType, user_id: string | undefined, user: Partial<User>): Promise<Response>;
    get_all(access_token: AccessTokenType): Promise<supertest.Response>;
    unregister(ident: {
        access_token?: string;
        user_id?: string;
    }): Promise<supertest.Response>;
}
