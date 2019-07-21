FROM node:lts-alpine as builder

ENV NPM_CONFIG_PREFIX '/home/node/.npm-global'
ENV PATH "${NPM_CONFIG_PREFIX}/bin:${PATH}"

ADD https://raw.githubusercontent.com/wilsonsilva/wait-for/8b86892/wait-for /bin/wait_for_it.sh

# Install OS dependencies
RUN apk --no-cache --virtual build-dependencies add \
    git \
    python \
    build-base \
    openssl \
    netcat-openbsd \
    && printf '%s' "${NODE_VERSION}" > /env.node

USER node

RUN mkdir /home/node/rest-api

WORKDIR /home/node/rest-api

# Transfer from the current directory (outside Docker) to inside Docker
ADD --chown=node:node . .

# Install Node.js application dependencies, both local and global
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

FROM alpine:latest as app

ENV RDBMS_URI ''
ENV REDIS_HOST 'localhost'
ENV REDIS_PORT 6379
ENV NPM_CONFIG_PREFIX '/home/node/.npm-global'
ENV PATH "${NPM_CONFIG_PREFIX}/bin:${PATH}"

COPY --from=builder /env.node /env.node

RUN addgroup -S node -g 998 \
    && adduser -S -G node -u 998 node \
    && apk --no-cache add nodejs="`cat /env.node`-r0"

USER node

RUN mkdir /home/node/rest-api

WORKDIR /home/node/rest-api

# Install global Node.js dependencies
COPY --from=builder --chown=node:node /home/node/.npm-global /home/node/.npm-global

# Copy over the app
COPY --from=builder --chown=node:node /home/node/rest-api .

ENTRYPOINT ["/usr/bin/node", "main.js"]
