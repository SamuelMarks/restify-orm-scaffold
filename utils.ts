// TODO: Move this file to a different repo, e.g.: @offscale/nodejs-utils

export const removeNulls = (a: any[]): typeof a => a.filter(e => e != null);

export const unwrapIfOneElement = (a: any[]): typeof a | typeof a[0] => a.length === 1 ? a[0] : a;
