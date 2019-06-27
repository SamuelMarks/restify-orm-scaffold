/// <reference types="mocha" />
import { User } from '../api/user/models';
import { AuthTestSDK } from './api/auth/auth_test_sdk';
export declare const create_and_auth_users: (user_mocks_subset: User[], auth_sdk: AuthTestSDK, done: Mocha.Done) => void;
