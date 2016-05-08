import {Model, Record} from 'waterline';

export interface IUser extends Model, Record, IUserBase {
}

export interface IUserBase {
    email: string;
    password?: string;
    title?: string;
}
