import { AuthError, GenericError } from 'custom-restify-errors';
import { Redis } from 'ioredis';
import { AccessTokenType, numCb, strCbV } from 'nodejs-utils';
import { RestError } from 'restify-errors';
import { v4 as uuid_v4 } from 'uuid';

type LogoutArg = {user_id: string; access_token?: never} | {user_id?: never; access_token: AccessTokenType};

let accessToken: AccessToken;

export class AccessToken {
    public static reset() {
        accessToken = undefined;
        delete global['accessToken'];
    }

    public static get(cursor: Redis): AccessToken {
        if (typeof accessToken === 'undefined' || typeof accessToken.redis === 'undefined')
            accessToken = new AccessToken(cursor);
        return accessToken;
    }

    constructor(private redis: Redis) {}

    public findOne(access_token: AccessTokenType, callback: strCbV) {
        return this.redis.get(access_token, (err: Error, user_id: string) => {
            if (err != null) return callback(err);
            else if (user_id == null) return callback(new AuthError('Nothing associated with that access token'));
            return callback(void 0, user_id);
        });
    }

    public deleteOne(access_token: AccessTokenType, callback: numCb) {
        return callback(void 0, this.redis.del(access_token));
    }

    public logout(arg: LogoutArg, callback: (err?: Error | RestError) => void) {
        if (arg.user_id)
        // TODO: Rewrite this in Lua [maybe?]
            this.redis.smembers(arg.user_id, (err: Error, access_tokens: string[]) => {
                if (err != null) return callback(err);
                (this['redis'] as any)
                    ['multi']()
                    ['del'](...access_tokens)
                    ['exec'](errors =>
                    callback(errors != null && errors['length'] ? new GenericError({
                        statusCode: 400,
                        name: 'LogoutErrors',
                        message: JSON.stringify(errors)
                    }) : null)
                );
            });
        else if (arg.access_token)
            this.redis.get(arg.access_token, (err, user_id) => {
                if (err != null) return callback(err);
                else if (user_id == null) return callback(new GenericError({
                    statusCode: 410,
                    name: 'AlreadyDone',
                    message: 'User already logged out'
                }));
                return this.logout({ user_id }, callback);
            });
        else return callback(new GenericError({
                statusCode: 400,
                name: 'ConstraintError',
                message: 'Can\'t logout without user_id or access token'
            }));
    }

    public add(user_id: string, roles: string, scope: 'access',
               callback: (err: Error, access_token: AccessTokenType) => void) {
        const new_key: string = `${roles}::${scope}::${uuid_v4()}`;
        const t = this.redis.multi();
        t.set(new_key, user_id);
        t.sadd(user_id, new_key);
        t.exec(err => callback(err, new_key));
    }
}
