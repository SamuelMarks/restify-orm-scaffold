FROM node:10.15.3-alpine

WORKDIR /rest-api

RUN apk add --no-cache python make openssl g++ netcat-openbsd curl && \
    curl https://raw.githubusercontent.com/wilsonsilva/wait-for/8b8689221f9cfe6f7fcec61680fcad2eae25964b/wait-for -o /bin/wait_for_it.sh && \
    chmod +x /bin/wait_for_it.sh && \
    npm i -g npm; npm i -g typings typescript tslint bunyan mocha

ADD . .

RUN if [[ -f typings.json && ! -d typings ]]; then typings i; fi; if [ ! -d node_modules ]; then npm i; fi; tsc
RUN which bunyan && which node

# CMD npm run-script build_start

FROM scratch

WORKDIR /rest-api

COPY --from=0 /rest-api /rest-api

ADD https://nodejs.org/dist/v10.15.3/node-v10.15.3-linux-x64.tar.xz /

RUN ["/node-v10.15.3-linux-x64/bin/node", "main.js"]
