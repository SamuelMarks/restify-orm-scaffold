import {IUser} from './models.d';

export const User = {
    identity: 'user_tbl',
    connection: 'postgres',
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
            let user: IUser = this.toObject();
            User._omit.map(k => delete user[k]);
            for (const key in user)
                if (user.hasOwnProperty(key) && !user[key]) delete user[key];
            return user;
        }
    }
};
