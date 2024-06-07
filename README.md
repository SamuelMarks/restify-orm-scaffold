restify-orm-scaffold
====================
[![License](https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Coverage Status](https://coveralls.io/repos/github/SamuelMarks/restify-orm-scaffold/badge.svg)](https://coveralls.io/github/SamuelMarks/restify-orm-scaffold)
![TypeScript build](https://github.com/SamuelMarks/restify-orm-scaffold/workflows/TypeScript%20build/badge.svg)

Simple baseline scaffold to get you started using [TypeORM](https://github.com/typeorm/typeorm) and/or [Sequelize](https://github.com/sequelize/sequelize) and/or [Waterline](https://github.com/balderdashy/waterline) on [restify](https://github.com/restify/node-restify) with [TypeScript](https://github.com/Microsoft/TypeScript).

## Install prerequisites

### Node

  0. node & npm (tested with node v10.16.0 & npm v6.10.1)
  1. Run: `npm install -g typings typescript bunyan`
  2. `cd` to directory you've cloned this repo into
  3. Run: `typings install`
  4. Run: `npm install`

### External

  - Database, e.g.: Postgres. Set `RDBMS_URI` env var accordingly, e.g.: `postgres://username:password@hostname:port/database_name`. Modify [config.ts](https://github.com/SamuelMarks/restify-orm-scaffold/blob/master/config.ts) to use a different database.
  - Redis. Set `REDIS_URL` env var accordingly; otherwise defaults are used.
  - Set: `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` env vars

## Docker / Podman

Alternatively there is a `Dockerfile` and `docker-compose.yml`, so rather than installing dependencies (other than [Docker](https://docs.docker.com/install/#supported-platforms)), you can run:

### 0. Build image for this repo

    docker build -t restify-orm-scaffold_api_1 .

### 1. Docker Compose

    docker-compose up

### Kubernetes
If you'd rather use Kubernetes to Docker Compose, then:
<TODO>

### Docker

If you don't want to use Docker Compose, then assuming you have Redis and Postgresql running independently of Docker, or exposed in Docker through ports, you can then run:

    docker run -e RDBMS_URI="$RDBMS_URI" \
               -e REDIS_HOST="$REDIS_HOST" \
               -e DEFAULT_ADMIN_EMAIL=foo \
               -e DEFAULT_ADMIN_PASSWORD=bar \
               -p 3000:3000 \
               --name "${PWD##*/}" \
               "${PWD##*/}_api"  # Name of the Docker image, the `_api` is suffixed by Docker Compose

Where `RDBMS_URI` and `REDIS_HOST` environment variables are set correctly for your system, in the form:

    export RDBMS_URI='postgres://username:password@hostname:port/database_name'
    export REDIS_HOST='host'

## Configure a reverse proxy for server & static website files

Use a long [nginxctl](https://github.com/offscale/nginxctl) CLI command to create an nginx config and server it:

    python -m nginxctl serve --temp_dir '/tmp' -b 'server' --server_name 'localhost' --listen '8080' -b 'location' '/api' --proxy_pass 'http://localhost:3000' --proxy_redirect 'off' -} -b 'location' '/' --root '/tmp/wwwroot' --try_files '$uri$args $uri$args/ /index.html' -} -}

Or just write a config (below is what the command generates… with 2 newlines thrown in):

    server {
        server_name localhost;
        listen 8080;

        location /api {
            proxy_pass http://localhost:3000;
            proxy_redirect off;
        }

        location / {
            root /tmp/wwwroot;
            try_files $uri$args $uri$args/ /index.html;
        }
    }

## Compile+run app

    tsc
    node main.js

## Misc

### Cleanup compiled output

When `*.js` isn't present in `.gitignore`, clean out compiled js with this GNU findutils & Bash solution:

    find -name '*.js.map' -type f -exec bash -c 'rm "${1}" "${1%????}"' bash {} \;

To delete all `*.js` outside of `node_modules`, use:

    find \( -name node_modules -prune \) -o -name '*.js' -type f -exec rm {} \;

More complicated solution handling "foo.ts" & "foo.js" without "foo.js.map" coming at some point.

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or <https://www.apache.org/licenses/LICENSE-2.0>)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or <https://opensource.org/licenses/MIT>)

at your option.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you, as defined in the Apache-2.0 license, shall be
dual licensed as above, without any additional terms or conditions.
