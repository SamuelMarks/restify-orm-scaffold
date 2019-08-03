import * as faker from 'faker';

import { User } from '../../../api/user/models';

export const user_mocks: {successes: User[], failures: Array<{}>} = {
    failures: [
        {},
        { email: 'foo@bar.com ' },
        { password: 'foo ' },
        { email: 'foo@bar.com', password: 'foo', bad_prop: true }
    ],
    successes: Array(200)
        .fill(void 0)
        .map((_, idx) => {
            const user = new User();

            user.title = faker.name.title();
            user.email = faker.internet.email();
            user.password = faker.internet.password();
            /* tslint:disable:no-bitwise */
            user.roles = (idx & 1) === 0 ?
                ['registered', 'login', 'admin']
                : ['registered', 'login'];

            return user;
        })
};

if (require.main === module) {
    /* tslint:disable:no-console */
    console.info(user_mocks.successes);
}
