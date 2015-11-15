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
    }
};

export function toJSON(res) {
    // This should be in User.attributes. Opened bug: https://github.com/balderdashy/waterline/issues/1214
    let user = res.toObject();
    delete user.password;
    for (const key in user)
        if (!user[key]) delete user[key];
    return user;
}
