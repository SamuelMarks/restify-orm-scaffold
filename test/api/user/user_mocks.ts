import { IUserBase } from '../../../api/user/models.d';
import * as faker from 'faker';

export const user_mocks: { successes: IUserBase[], failures: Array<{}> } = {
    failures: [
        {},
        {email: 'foo@bar.com '},
        {password: 'foo '},
        {email: 'foo@bar.com', password: 'foo', bad_prop: true}
    ],
    successes: (() => {
        const a: IUserBase[] = [];
        for (let i = 0; i < 100; i++)
            a.push({email: faker.internet.email(), password: faker.internet.password()});
        return a;
    })()
};

if (require.main === module) {
    /* tslint:disable:no-console */
    console.info(user_mocks.successes);
}
