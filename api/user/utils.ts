import * as argon2 from 'argon2';
import { Query, WLError } from 'waterline';
import { NotFoundError } from 'restify-errors';
import { c } from '../../main';
import { ISalt } from './models.d';

export const argon2_options: argon2.Options = Object.freeze({
    timeCost: 4, memoryCost: 13, parallelism: 2, type: argon2.argon2d
});

export const shakeSalt = (cb: (error: WLError | Error, salt?: Buffer) => void) => {
    argon2.generateSalt().then(gen_salt => {
        const Salt: Query = c.collections['auth_salt_tbl'];
        // `return cb(null, gen_salt)` doesn't work... postgres stored salt !== gen_salt

        Salt.create({salt: gen_salt.toString('utf8')}).exec((error: WLError, salt_res: ISalt) => {
            if (error) return cb(error);
            else if (!salt_res) return cb(new NotFoundError('Salt'));
            return cb(null, Buffer.from(salt_res.salt));
        });
    });
};

export const saltSeeker = (cb: (error: WLError | Error, salt?: Buffer) => void) => {
    const Salt: Query = c.collections['auth_salt_tbl'];

    Salt.find().limit(1).exec((error: WLError, salt: ISalt[]) => {
        if (error) return cb(error);
        else if (!salt || !salt.length) return cb(new NotFoundError('Salt'));
        return cb(error, Buffer.from(salt[0].salt));
    });
};
