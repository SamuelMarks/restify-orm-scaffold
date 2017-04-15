import { Model, Record } from 'waterline';

/* tslint:disable no-namespace no-internal-module */
declare module auth {
    export interface IAccessToken extends Record, Model {
        scope: string;
        token: string;
        user_id: string;
    }
}
