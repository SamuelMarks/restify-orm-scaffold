import { Model, Record } from 'waterline';

export interface IUser extends Model, Record, IUserBase {
}

export interface IUserBase {
    email: string;
    roles?: string;
    password?: string;
    title?: string;
    access_token?: string;  // Might get attached for testing or whatnot
}
