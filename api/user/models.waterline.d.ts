import { IUser } from './models.waterline.interfaces.d';
export declare const hash_password: (record: {
    password: string;
    email?: string;
}, callback: any) => void;
export declare const verify_password: (hashed: string, password: string) => Promise<boolean>;
export declare const User: {
    identity: string;
    connection: string;
    _omit: string[];
    attributes: {
        title: {
            type: string;
        };
        email: {
            type: string;
            required: boolean;
            primaryKey: boolean;
        };
        password: {
            type: string;
            required: boolean;
        };
        roles: {
            type: string;
            defaultsTo: string;
        };
        toJSON: () => IUser;
    };
    beforeValidate: (record: {
        password: string;
        email?: string;
    }, callback: any) => void;
    beforeCreate: (record: {
        password: string;
        email?: string;
    }, callback: any) => void;
    beforeUpdate: (record: {
        password: string;
        email?: string;
    }, callback: any) => void;
};
