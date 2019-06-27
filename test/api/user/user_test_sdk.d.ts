import * as supertest from 'supertest';
import { AccessTokenType, SuperTestResp } from '@offscale/nodejs-utils/interfaces';
import { User } from '../../../api/user/models';
export declare class UserTestSDK {
    app: any;
    constructor(app: any);
    register(user: User, callback: SuperTestResp): void | supertest.Response;
    read(access_token: AccessTokenType, expected_user: User, callback: SuperTestResp): void | supertest.Response;
    update(access_token: AccessTokenType, user_id: string | undefined, user: Partial<User>, callback: SuperTestResp): void | supertest.Response;
    get_all(access_token: AccessTokenType, callback: SuperTestResp): void | supertest.Response;
    unregister(ident: {
        access_token?: string;
        user_id?: string;
    }, callback: SuperTestResp): void | supertest.Response;
}
