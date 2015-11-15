declare module auth_test_sdk {
    export interface ITestSDK {
        register(user: user.IUserBase | user.IUser, cb: cb): void;
        login(user: user.IUserBase | user.IUser, cb: cb): void;
        get_user(access_token: string, user: user.IUser | user.IUserBase, cb: cb);
        logout(access_token: string, cb: cb): void;
        unregister(ident: { access_token?: string, user_id?: string }, cb: cb): void;
    }

    export interface cb {
        (err: Error, res?: any): void;
    }
}
