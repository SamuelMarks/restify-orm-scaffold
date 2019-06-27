import * as Logger from 'bunyan';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { IOrmMwConfig, IOrmsOut } from '@offscale/orm-mw/interfaces';
export declare const db_uri: string;
export declare const typeorm_config: PostgresConnectionOptions;
export declare const sequelize_config: {
    dialect: import("sequelize/types").Dialect;
    define: {
        timestamps: boolean;
    };
};
export declare const waterline_config: Readonly<{
    adapters: {
        url: string;
        postgres: undefined;
    };
    defaults: {
        migrate: string;
    };
    connections: {
        main_db: {
            adapter: string;
            connection: string;
            pool: {
                min: number;
                max: number;
            };
        };
    };
}>;
export declare const _orms_out: {
    orms_out: IOrmsOut;
};
export declare const getOrmMwConfig: (models: Map<string, any>, logger: Logger, cb: (err: Error | undefined, with_app?: ((app: any) => any) | undefined, orms_out?: IOrmsOut | undefined) => void) => IOrmMwConfig;
export declare const getPrivateIPAddress: () => string;
