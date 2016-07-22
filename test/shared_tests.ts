import {Connection} from 'waterline';
import {parallel} from 'async';

export function tearDownConnections(connections: Connection[], cb) {
    return connections ? parallel(Object.keys(connections).map(
        connection => connections[connection]._adapter.teardown
    ), () => {
        Object.keys(connections).forEach(connection => {
            connections[connection]._adapter.connections.delete(connection);
        });
        cb();
    }) : cb();
}
