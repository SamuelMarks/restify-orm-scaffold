import * as argon2 from 'argon2';
import { IUser } from './models.d';
import { argon2_options, saltSeeker } from './utils';
import { cache } from '../../main';

export const hash_password = (record: { password: string, email?: string }, callback): void => {
    const hash = (salt, cb) => {
        cache['global_salt'] = salt;
        argon2.hash(record.password, cache['global_salt'], argon2_options).then(hashed => {
            record.password = hashed;
            return cb();
        }).catch((err) => console.error('hash_password::hash::err =', err, 'record =', record) || cb(err));
    };

    return record && record.password && !record.password.startsWith('$argon2') ?
        (cache.hasOwnProperty('global_salt') ? hash(cache['global_salt'], callback)
            : saltSeeker((err, salt) => err ? callback(err) : hash(salt, callback)))
        : callback();
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
        toJSON: function toJSON() {
            const user: IUser = this.toObject();
            User._omit.map(k => delete user[k]);
            for (const key in user)
                if (user.hasOwnProperty(key) && !user[key]) delete user[key];
            return user;
        }
    },
    beforeValidate: hash_password,
    beforeCreate: hash_password,
    beforeUpdate: hash_password
};

export const Salt = {
    identity: 'auth_salt_tbl',
    connection: 'main_db',
    _omit: [/*'uuid'*/],
    attributes: {
        salt: {
            type: 'string',
            required: true
        }
    }
};
