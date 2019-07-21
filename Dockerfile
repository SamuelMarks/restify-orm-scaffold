FROM node:lts-alpine

ENV RDBMS_URI ''
ENV REDIS_HOST 'localhost'
ENV REDIS_PORT 6379
ENV NPM_CONFIG_PREFIX '/home/node/.npm-global'
ENV PATH "${NPM_CONFIG_PREFIX}/bin:${PATH}"

WORKDIR /rest-api

ADD https://raw.githubusercontent.com/wilsonsilva/wait-for/8b86892/wait-for /bin/wait_for_it.sh

RUN apk --no-cache --virtual build-dependencies add \
    git \
    python \
    build-base \
    openssl \
    netcat-openbsd

USER node
USER root
RUN deluser --remove-home node \
    && addgroup -S node -g 998 \
    && adduser -S -G node -u 998 node \
    && chown -R node:node /home/node

ADD . .

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
    && tsc \
    && ls node_modules/async
# && apk del build-dependencies

ENTRYPOINT ["/usr/local/bin/node", "main.js"]
# CMD npm run-script build_start

# FROM scratch
#
# WORKDIR /rest-api
#
# COPY --from=0 /rest-api /rest-api
#
# ADD https://nodejs.org/dist/v10.16.0/node-v10.16.0-linux-x64.tar.xz /
#
# RUN ["/node-v10.6.0-linux-x64/bin/node", "main.js"]
