import * as argon2 from 'argon2';
import { IUser } from './models.waterline.d';
import { argon2_options } from './utils';

export const hash_password = (record: {password: string, email?: string}, callback): void => {
    const hash = cb => argon2.hash(record.password, argon2_options).then(hashed => {
        record.password = hashed;
        return cb();
    }).catch(cb);

    return record != null && record.password != null && !record.password.startsWith('$argon2') ?
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
            const user: IUser = this.toObject();
            User._omit.map(k => delete user[k]);
            for (const key in user)
                if (user.hasOwnProperty(key) && user[key] == null) delete user[key];
            return user;
        }
    },
    beforeValidate: hash_password,
    beforeCreate: hash_password,
    beforeUpdate: hash_password
};
