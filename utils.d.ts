import { InsertResult } from 'typeorm';
export declare const nullArrayPropertyToNull: (obj: {}) => {};
export declare const removeNullProperties: (obj: {}) => {};
export declare const emptyTypeOrmResponse: (obj: Partial<InsertResult>) => boolean;
export declare const removePropsFromObj: (obj: {}, props: string[]) => {};
