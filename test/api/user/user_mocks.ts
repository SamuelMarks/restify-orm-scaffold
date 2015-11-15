/// <reference path='./../../../api/user/models.d.ts' />

export const user_mocks: { successes: Array<user.IUserBase>, failures: Array<{}> } = {
    "failures": [
        {},
        { "email": "foo@bar.com " },
        { "password": "foo " },
        { "email": "foo@bar.com", "password": "foo", "bad_prop": true }
    ],
    "successes": [
        { "email": "foo@bar.com", "password": "foo " },
        { "email": "foo@barc.om", "password": "foo " },
        { "email": "foobar.com", "password": "foo " }
    ]
};
