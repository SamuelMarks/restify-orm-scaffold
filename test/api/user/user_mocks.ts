import {IUserBase} from '../../../api/user/models.d';

export const user_mocks: { successes: Array<IUserBase>, failures: Array<{}> } = {
    "failures": [
        {},
        {"email": "foo@bar.com "},
        {"password": "foo "},
        {"email": "foo@bar.com", "password": "foo", "bad_prop": true}
    ],
    "successes": [
        {"email": "foo@bar.com", "password": "foo "},
        {"email": "foo@barc.om", "password": "foo "},
        {"email": "foobar.com", "password": "foo "},
        {"email": "foo@car.com", "password": "foo "}
    ]
};
