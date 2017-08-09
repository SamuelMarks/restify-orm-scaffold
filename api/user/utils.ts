import * as argon2 from 'argon2';

export const argon2_options: argon2.Options = Object.freeze({
    timeCost: 4, memoryCost: 13, parallelism: 2, type: argon2.argon2d
});
