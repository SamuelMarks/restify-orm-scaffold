import { v4 as uuid_v4 } from 'uuid';
import { RestError } from 'restify';
import { AuthError, GenericError } from 'restify-errors';
import { redis_cursors } from '../../main';

export const AccessToken = () => {
    const redis = redis_cursors.redis;
    return {
        _type: 'redis',
        findOne: (access_token, cb) => redis.get(access_token, (err, user_id) => {
            if (err) return cb(err);
            else if (!user_id) return cb(new AuthError('Nothing associated with that access token'));
            return cb(void 0, user_id);
        }),
        deleteOne: (access_token, cb) => redis.del(access_token, cb),
        add: (user_id, scope, cb: (err: Error, access_token: string) => void) => {
            const new_key: string = `${scope}::${uuid_v4()}`;
            const t = redis.multi();
            t.set(new_key, user_id);
            t.sadd(user_id, new_key);
            t.exec(err => cb(err, new_key));
        },
        logout: function logout(_redis) {
            return (id: { user_id?: string, access_token?: string }, cb: (err?: Error | RestError) => void) => {
                if (id.user_id)
                // TODO: Rewrite this in Lua [maybe?]
                    _redis.smembers(id.user_id, (err, access_tokens: string[]) => {
                        if (err) return cb(err);
                        const t = _redis.multi();
                        t.del(...access_tokens);
                        t.exec((errors: any[]) =>
                            cb(errors && errors.length ? new GenericError({
                                statusCode: 400,
                                error: 'LogoutErrors',
                                error_message: JSON.stringify(errors)
                            }) : null)
                        );
                    });
                else if (id.access_token)
                    _redis.get(id.access_token, (err, user_id) => {
                        if (err) return cb(err);
                        else if (!user_id) return cb(new GenericError({
                            statusCode: 410,
                            error: 'AlreadyDone',
                            error_message: 'User already logged out'
                        }));
                        return logout(_redis)({user_id}, cb);
                    });
                else
                    return cb(new GenericError({
                        statusCode: 400,
                        error: 'ConstraintError',
                        error_message: 'Can\'t logout without user_id or access token'
                    }));
            };
        }(redis)
    };
};
