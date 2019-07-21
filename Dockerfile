FROM node:lts-alpine as builder

ENV RDBMS_URI ''
ENV REDIS_HOST 'localhost'
ENV REDIS_PORT 6379
ENV NPM_CONFIG_PREFIX '/home/node/.npm-global'
ENV PATH "${NPM_CONFIG_PREFIX}/bin:${PATH}"

ADD https://raw.githubusercontent.com/wilsonsilva/wait-for/8b86892/wait-for /bin/wait_for_it.sh

RUN apk --no-cache --virtual build-dependencies add \
    git \
    python \
    build-base \
    openssl \
    netcat-openbsd

USER node

RUN mkdir /home/node/rest-api

WORKDIR /home/node/rest-api

ADD --chown=node:node . .

ENV PATH "${NPM_CONFIG_PREFIX}/bin:${PATH}"

RUN npm i -g npm \
    && npm i -g \
    bunyan \
    mocha \
    node-gyp \
    tslint \
    typings \
    typescript \
    && typings install \
    && rm -rf node_modules \
    && npm install \
    && tsc
    # && apk del build-dependencies \

# CMD npm run-script build_start

FROM alpine:latest as app

ENV RDBMS_URI ''
ENV REDIS_HOST 'localhost'
ENV REDIS_PORT 6379
ENV NPM_CONFIG_PREFIX '/home/node/.npm-global'
ENV PATH "${NPM_CONFIG_PREFIX}/bin:${PATH}"

RUN addgroup -S node -g 998 \
    && adduser -S -G node -u 998 node

USER node

RUN mkdir /home/node/rest-api

WORKDIR /home/node/rest-api

USER root

# Install C++ dependencies
COPY --from=builder /lib/ld-musl-x86_64.so.1 /lib/ld-musl-x86_64.so.1
COPY --from=builder /usr/lib/libstdc++.so.6 /usr/lib/libstdc++.so.6
COPY --from=builder /usr/lib/libgcc_s.so.1 /usr/lib/libgcc_s.so.1
COPY --from=builder /lib/ld-musl-x86_64.so.1 /lib/ld-musl-x86_64.so.1

# Install same version of Node.js that's in builder
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=builder /usr/local/include/node /usr/local/include/node
COPY --from=builder /usr/local/bin/node /usr/local/bin/node
# NOTE: If you want `yarn`, `COPY` over `/opt/yarn-*` also, and add `yarn` & `yarnpkg` symlinks.

# Install global Node.js dependencies
COPY --from=builder /home/node/.npm-global /home/node/.npm-global

# Setup core binaries (symlinks)
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

USER node
# Copy over the app
COPY --from=builder --chown=node:node /home/node/rest-api .

ENTRYPOINT ["/usr/local/bin/node", "main.js"]

# FROM scratch
#
# WORKDIR /home/node/rest-api
#
# COPY --from=0 /home/node/rest-api /home/node/rest-api
#
# ADD https://nodejs.org/dist/v10.16.0/node-v10.16.0-linux-x64.tar.xz /
#
# RUN ["/node-v10.6.0-linux-x64/bin/node", "main.js"]
