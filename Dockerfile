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

ENV PATH="/home/node/.npm-global/bin:${PATH}"

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

FROM node:lts-alpine as app

USER node

RUN mkdir /home/node/rest-api

WORKDIR /home/node/rest-api

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
