import { InsertResult } from 'typeorm';

type TypedIndex<K extends string | number | symbol, V> = {
    [index in K]: V;
};

export const nullArrayPropertyToNull = <V extends Array<any>>(obj: TypedIndex<string, V>): typeof obj =>
    Object
        .keys(obj)
        .map(k => ({ [k]: obj[k] != null && obj[k].length === 1 && obj[k][0] == null ? obj[k][0] : obj[k] }))
        .reduce((a, b) => Object.assign(a, b), {});

export const removeNullProperties = <V>(obj: TypedIndex<string, V>): typeof obj =>
    Object
        .keys(obj)
        .map(k => (obj[k] == null ? { null: null } : { [k]: obj[k] }))
        .filter(o => !o.hasOwnProperty('null'))
        .reduce((a: object, b: object) => Object.assign(a, b), {});

export const emptyTypeOrmResponse = (obj: Partial<InsertResult>): boolean =>
    obj.generatedMaps!.length + obj.raw!.length === 0;

export const removePropsFromObj = <V>(obj: TypedIndex<string, V>, props: string[]): typeof obj =>
    typeof props.forEach(prop => delete obj[prop]) === 'undefined' && obj || obj
