import * as argon2 from 'argon2';

import { IUser } from './models.waterline.interfaces.d';
import { argon2_options } from './utils';

export const hash_password = (record: {
    password: string,
    email?: string
}, callback: (error?: Error) => void): void => {
    const hash = (cb: typeof callback) => argon2.hash(record.password, argon2_options).then(hashed => {
        record.password = hashed;
        return cb();
    }).catch(cb);

    record != null && record.password != null && !record.password.startsWith('$argon2') ?
        hash(callback) : callback();
};

export const verify_password = (hashed: string, password: string): Promise<boolean> => {
    if (password.startsWith('$argon2'))
        [hashed, password] = [password, hashed];
    return argon2.verify(hashed, password);
};

export const User = {
    identity: 'user_tbl',
    connection: 'main_db',
    _omit: ['password'],
    attributes: {
        title: {
            type: 'string'
        },
        email: {
            type: 'string',
            required: true,
            primaryKey: true
        },
        password: {
            type: 'string',
            required: true
        },
        roles: {
            type: 'string',
            defaultsTo: 'registered;'
        },
        toJSON: function toJSON() {
            // @ts-ignore
            const user: IUser = this.toObject();
            User._omit.map(k => delete (user as { [key: string]: any })[k]);
            for (const key in user)
                if (user.hasOwnProperty(key) && (user as { [key: string]: any })[key] == null) delete (user as {
                    [key: string]: any
                })[key];
            return user;
        }
    },
    beforeValidate: hash_password,
    beforeCreate: hash_password,
    beforeUpdate: hash_password
};
