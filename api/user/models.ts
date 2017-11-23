import * as argon2 from 'argon2';
import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryColumn } from 'typeorm';

import { argon2_options } from './utils';

@Entity('user_tbl')
export class User {
    public static _omit: string[] = ['password'];
    public static rolesAsStr = (roles: string[]): string => roles && roles.length ?
        roles.filter(role => role && role.length).join('::') : '';

    @PrimaryColumn({ type: 'varchar' })
    public email: string;

    @Column({ type: 'varchar', nullable: true, select: false })
    public password: string;

    @Column('varchar', { nullable: true })
    public title?: string;

    @Column('simple-array', { nullable: false, 'default': 'registered' })
    public roles: string[];

    // Might get attached for tests or in middleware; NOT present in db
    public access_token?: string;

    @BeforeUpdate()
    @BeforeInsert()
    private async hashPassword?() {
        this.password = this.password.startsWith('$argon2') ? this.password
            : await argon2.hash(this.password, argon2_options);
    }
}
