FROM node:10.15.3-alpine

ENV RDBMS_URI ''
ENV REDIS_HOST 'localhost'
ENV REDIS_PORT 6379

WORKDIR /rest-api

#RUN addgroup -g 1500 -S nodejs \
#    && adduser -u 1500 -S nodejs -G nodejs \
#    && chown -R nodejs:nodejs /usr/local/lib/node_modules /usr/local/bin /rest-api
#USER nodejs

ADD https://raw.githubusercontent.com/wilsonsilva/wait-for/8b86892/wait-for /bin/wait_for_it.sh

#    chmod +x /bin/wait_for_it.sh && \

ADD . .

RUN apk --no-cache --virtual build-dependencies add \
    git \
    python \
    build-base \
    openssl \
    netcat-openbsd \
    && npm i -g npm \
    && mkdir -p /root/.node-gyp/10.15.3 /usr/local/lib/node_modules/bunyan/node_modules/dtrace-provider \
    && npm i -g \
    typings \
    typescript@'3.3.3333' \
    tslint \
    bunyan \
    mocha \
    && npm i -g --unsafe-perms --allow-root node-gyp \
    && typings install \
    && npm install --unsafe-perms --allow-root \
    && tsc \
    && apk del build-dependencies

ENTRYPOINT ["/usr/local/bin/node", "main.js"]

# CMD npm run-script build_start

#FROM scratch
#
#WORKDIR /rest-api
#
#COPY --from=0 /rest-api /rest-api
#
#ADD https://nodejs.org/dist/v10.15.3/node-v10.15.3-linux-x64.tar.xz /
#
#RUN ["/node-v10.15.3-linux-x64/bin/node", "main.js"]
