declare var sailsRedis: sailsRedis.sailsRedis;

declare module sailsRedis {
    export interface sailsRedis {
        new (): sailsRedis;
        registerConnection: (connection: any, collections: any, cb: any) => any;
        teardown: (conn: any, cb: any) => any;
        query: (connectionName: any, table: any, query: any, data: any, cb: any) => any;
        describe: (connectionName: any, table: any, cb: any) => any;
        define: (connectionName: any, table: any, definition: any, cb: any) => any;
        drop: (connectionName: any, table: any, relations: any, cb: any) => any;
        addAttribute: (connectionName: any, table: any, attrName: any, attrDef: any, cb: any) => any;
        removeAttribute: (connectionName: any, table: any, attrName: any, cb: any) => any;
        /* etc. */
    }
}

declare module "sails-redis" {
    export = sailsRedis;
}
