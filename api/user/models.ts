export const User = {
    identity: 'user_tbl',
    connection: 'postgres',
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
            let user = this.toObject();
            delete user.password;
            for (const key in user)
                if (!user[key]) delete user[key];
            return user;
        }
    }
};
