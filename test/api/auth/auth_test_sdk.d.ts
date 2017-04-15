import { IUser, IUserBase } from '../../../api/user/models.d';
import { cb } from '../../share_interfaces.d';

export interface IAuthSdk {
    register(user: IUserBase | IUser, cb: cb): void;
    login(user: IUserBase | IUser, cb: cb): void;
    get_user(access_token: string, user: IUser | IUserBase, cb: cb);
    get_all(access_token: string, cb: cb);
    logout(access_token: string, cb: cb): void;
    unregister(ident: { access_token?: string, user_id?: string }, cb: cb): void;
    unregister_all(users: Array<IUser | IUserBase>, done: cb);
    register_login(user: IUserBase, done: cb);
    logout_unregister(user: IUserBase, done: cb);
}
