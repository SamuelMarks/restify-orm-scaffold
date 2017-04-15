import { Model, Record } from 'waterline';

export interface IUser extends Model, Record, IUserBase {
}

export interface IUserBase {
    email: string;
    password?: string;
    title?: string;
    access_token?: string;  // Might get attached for testing or whatnot
}

export interface ISalt extends Model, Record, ISaltBase {
}

export interface ISaltBase {
    salt: string;
}
