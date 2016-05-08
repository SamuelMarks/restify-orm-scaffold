import {v4 as uuid_v4} from 'node-uuid';
import {cursors} from './../../main';

export const AccessToken = () => {
    const redis = cursors.redis;
    return {
        _type: 'redis',
        findOne: (access_token, cb) => redis.get(access_token, (err, res) => {
            if (err) return cb(err);
            else if (!res) return cb(new TypeError('AccessToken not found'));
            return cb(err, res)
        }),
        deleteOne: (access_token) => redis.del(access_token),
        add: (user_id, scope): string => {
            const new_key: string = `${scope}::${uuid_v4()}`;
            const t = redis.multi();
            t.set(new_key, user_id);
            t.sadd(user_id, new_key);
            t.exec();
            return new_key;
        },
        logout: function logout(redis) {
            return (id: { user_id?: string, access_token?: string }, cb: (err?: Error|string|{}) => void) => {
                if (id.user_id)
                    // TODO: Rewrite this in Lua [maybe?]
                    redis.smembers(id.user_id, (err, res: any[]) => {
                        if (err) return cb(err);
                        let errors: any[] = Array<any>();
                        const t = redis.multi();
                        res.forEach(token => t.del(token, (e, r) => {
                            if (e) errors.push(e);
                        }));
                        if (errors.length) return cb(JSON.stringify(errors));
                        t.del(id.user_id, (e, r) => {
                            if (e) errors.push(e);
                        });
                        t.exec();
                        if (errors.length) return cb(JSON.stringify(errors));
                        return cb(null);
                    });
                else if (id.access_token)
                    redis.get(id.access_token, (err, user_id) => {
                        if (err) return cb(err);
                        else if (!user_id) return cb({
                            error: 'AlreadyDone',
                            error_message: 'User already logged out'
                        });
                        return logout(redis)({ user_id: user_id }, cb);
                    });
                else
                    return cb({
                        error: 'ConstraintError',
                        error_message: "Can't logout without user_id or access token"
                    });
            }
        } (redis)
    }
};
