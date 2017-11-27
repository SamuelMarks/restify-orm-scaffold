import * as argon2 from 'argon2';
import { BeforeInsert, BeforeUpdate, Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { argon2_options } from './utils';

export const hash_password = (password: string, callback): void => {
    password.startsWith('$argon2') ? callback(void 0, password)
        : argon2.hash(password, argon2_options).then(hashed =>
            callback(void 0, hashed)
        ).catch(callback);
};

@Entity('user_tbl')
export class User {
    public static _omit: string[] = ['password'];
    public static rolesAsStr = (roles: string[]): string => roles && roles.length ?
        roles.filter(role => role && role.length).join('::') : '';

    @PrimaryColumn({ type: 'varchar' })
    public email: string;

    @Column('varchar', { nullable: true, select: false })
    public password: string;

    @Column('varchar', { nullable: true })
    public title?: string;

    @CreateDateColumn()
    public createdAt?: Date;

    @UpdateDateColumn()
    public updatedAt?: Date;

    @Column('simple-array', { nullable: false })
    public roles: string[];

    // Might get attached for tests or in middleware; NOT present in db
    public access_token?: string;

    @BeforeUpdate()
    @BeforeInsert()
    public async hashPassword?() {
        this.password = this.password.startsWith('$argon2') ? this.password
            : await argon2.hash(this.password, argon2_options);
    }

    @BeforeUpdate()
    @BeforeInsert()
    public setRoles?() {
        if (this.roles == null || !this.roles.length)
            this.roles = ['registered', 'login'];
    }
}
