/// <reference types="mocha" />
import { Server } from 'restify';
import { IOrmsOut } from '@offscale/orm-mw/interfaces';
import { User } from '../api/user/models';
import { AuthTestSDK } from './api/auth/auth_test_sdk';
import Done = Mocha.Done;
export declare const create_and_auth_users: (user_mocks_subset: User[], auth_sdk: AuthTestSDK, done: Done) => void;
export declare function unregister_all(auth_sdk: AuthTestSDK, mocks: User[]): Promise<void>;
export declare const tearDownConnections: (orms_out_or_done: Done | IOrmsOut, done?: Done | undefined) => any;
export declare const closeApp: (app: Server) => (done: Done) => any;
