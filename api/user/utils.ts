import * as argon2 from 'argon2';

export const argon2_options: argon2.Options & {raw?: false} = Object.freeze({
    timeCost: 4, memoryCost: 8192, parallelism: 2, type: argon2.argon2d, raw: false as false
});
