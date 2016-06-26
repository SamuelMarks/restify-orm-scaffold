import * as async from 'async';

export function tearDownConnections(connections, cb) {
    return connections ? async.parallel(Object.keys(connections).map(
        connection => connections[connection]._adapter.teardown
    ), cb) : cb()
}
