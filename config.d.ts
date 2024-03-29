import * as Logger from 'bunyan';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { Options as SequelizeOptions } from 'sequelize';
import { IOrmMwConfig, IOrmsOut } from '@offscale/orm-mw/interfaces';
import { IRoutesMergerConfig } from '@offscale/routes-merger/interfaces';
export declare const db_uri: string;
export declare const typeorm_config: PostgresConnectionOptions;
export declare const sequelize_config: SequelizeOptions;
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
export declare const getOrmMwConfig: (models: Map<string, any>, logger: Logger, cb: (err: Error | undefined, with_app?: IRoutesMergerConfig['with_app'], orms_out?: IOrmsOut) => void) => IOrmMwConfig;
export declare const getPrivateIPAddress: () => string;
