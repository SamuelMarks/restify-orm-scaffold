import { InsertResult } from 'typeorm';

export const nullArrayPropertyToNull = (obj: {}): typeof obj =>
    Object
        .keys(obj)
        .map(k => ({ [k]: obj[k] != null && obj[k].length === 1 && obj[k][0] == null ? obj[k][0] : obj[k] }))
        .reduce((a, b) => Object.assign(a, b), {});

export const removeNullProperties = (obj: {}): typeof obj =>
    Object
        .keys(obj)
        .map(k => (obj[k] == null ? { null: null } : { [k]: obj[k] }))
        .filter(o => !o.hasOwnProperty('null'))
        .reduce((a, b) => Object.assign(a, b), {});

export const emptyTypeOrmResponse = (obj: Partial<InsertResult>): boolean =>
    obj.generatedMaps!.length + obj.raw!.length === 0;

export const removePropsFromObj = (obj: {}, props: string[]): typeof obj =>
    typeof props.forEach(prop => delete obj[prop]) === 'undefined' && obj;
