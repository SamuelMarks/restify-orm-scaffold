/// <reference path='./../typings/node/node.d.ts' />
/// <reference path='./../cust_typings/waterline.d.ts' />
/// <reference path='./../cust_typings/waterline-error.d.ts' />

export function trivial_merge(obj, ...objects: Array<{}>) {
    for (const key in objects)
        if (isNaN(parseInt(key))) obj[key] = objects[key]
        else for (const k in objects[key]) obj[k] = objects[key][k]
    return obj
}

interface config {
    user?: string;
    password?: string;
    host?: string;
    database?: string;
}

export function uri_to_config(uri: string) {
    return (function(arr: string[]): config {
        switch (arr.length) {
            case 3: // User, [passwd@]host, [port@db]
                return <config>(trivial_merge(
                    {
                        user: arr[0]
                    }, function passwd_host(): { host: string, pass?: string } {
                        const at_at: number = arr[1].search('@');
                        if (at_at === -1) return { host: arr[1] };
                        return {
                            pass: arr[1].substr(0, at_at),
                            host: arr[1].substr(at_at + 1)
                        }
                    } (),
                    function port_db(): { database: string, port?: string } {
                        const slash_at: number = arr[2].search('/');
                        if (slash_at === -1) return { database: arr[2] };
                        return {
                            port: arr[2].substr(0, slash_at),
                            database: arr[2].substr(slash_at + 1)
                        }
                    } ()
                ));
            case 2: // User, [password@]host[/database]
                return trivial_merge(
                    {
                        user: arr[0]
                    }, function passwd_host_db(): { host: string, password?: string } {
                        function host_db(s: string): { host: string, database?: string } {
                            const slash_at = s.search('/');
                            if (slash_at === -1) return { host: s };
                            return {
                                host: s.substr(0, slash_at),
                                database: s.substr(slash_at + 1)
                            }
                        }

                        const at_at: number = arr[1].search('@');
                        if (at_at === -1) return host_db(arr[1]);
                        return trivial_merge(
                            { password: arr[1].substr(0, at_at) },
                            host_db(arr[1].substr(at_at + 1))
                        );
                    } ()
                );
            default:
                return {};
        }
    })(uri.slice('postgres'.length + 3).split(':'))
}

export function fmtError(error: waterline.WLError | Error | any, statusCode = 400): {statusCode: number, error: {}} | any {
    if (!error) return {};
    else if (error.invalidAttributes) return {
        'error': {
            error: error.code,
            error_message: error.reason,
            error_metadata: {
                details: error.details.split('\n'),

                invalidAttributes: error.invalidAttributes
            }
        },
        statusCode: statusCode
    }
    else if (error instanceof Error) return error;
    else throw TypeError('Unhandled input to fmtError:' + error)
}

export function isShallowSubset(o0: {} | Array<any>, o1: {} | Array<any>) {
    const
        l0_keys = (o0 instanceof Array ? o0 : Object.keys(o0)).sort(),
        l1_keys = (o1 instanceof Array ? o1 : Object.keys(o1)).sort();

    if (l0_keys.length > l1_keys.length) return false;
    for (const i in l0_keys)
        if (binarySearch(l1_keys, l0_keys[i]) < 0) return false;
    return true;
}

export function binarySearch(a: any[], e: any, c = (a, b) => a > b) {
    let u = a.length, m = 0;
    for (let l = 0; l <= u;)
        c(e, a[m = (l + u) >> 1]) ? l = m + 1 : u = e == a[m] ? -2 : m - 1;
    return u == -2 ? m : -1
}
