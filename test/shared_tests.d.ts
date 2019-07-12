/// <reference types="mocha" />
import { User } from '../api/user/models';
import { AuthTestSDK } from './api/auth/auth_test_sdk';
import { IOrmsOut } from '@offscale/orm-mw/interfaces';
import { Server } from 'restify';
import Done = Mocha.Done;
export declare const create_and_auth_users: (user_mocks_subset: User[], auth_sdk: AuthTestSDK, done: Done) => void;
export declare function unregister_all(auth_sdk: AuthTestSDK, mocks: User[]): Promise<void>;
export declare function tearDownConnections(orms_out_or_done: Done | IOrmsOut, done?: Done): any;
export declare function closeApp(app: Server): (done: Done) => any;
