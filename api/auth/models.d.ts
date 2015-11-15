/// <reference path='./../../cust_typings/waterline.d.ts' />

declare module auth {
    export interface IAccessToken extends waterline.Record, waterline.Model {
        scope: string;
        token: string;
        user_id: string;
    }
}
