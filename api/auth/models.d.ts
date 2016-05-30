import {Record, Model} from 'waterline';

declare module auth {
    export interface IAccessToken extends Record, Model {
        scope: string;
        token: string;
        user_id: string;
    }
}
