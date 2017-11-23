import * as faker from 'faker';
import { User } from '../../../api/user/models';

export const user_mocks: {successes: User[], failures: Array<{}>} = {
    failures: [
        {},
        { email: 'foo@bar.com ' },
        { password: 'foo ' },
        { email: 'foo@bar.com', password: 'foo', bad_prop: true }
    ],
    successes: (() => {
        const a: User[] = [];
        for (let i = 0; i < 100; i++)
            a.push({ email: faker.internet.email(), password: faker.internet.password(), roles: ['registered'] });
        return a;
    })()
};

if (require.main === module) {
    /* tslint:disable:no-console */
    console.info(user_mocks.successes);
}
