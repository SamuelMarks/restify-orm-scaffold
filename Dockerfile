FROM node:8.11.3-alpine
ENV REST_API /rest-api
ADD . ${REST_API}
WORKDIR ${REST_API}
RUN apk add --no-cache python make openssl g++ netcat-openbsd curl
RUN curl https://raw.githubusercontent.com/wilsonsilva/wait-for/8b8689221f9cfe6f7fcec61680fcad2eae25964b/wait-for -o /bin/wait_for_it.sh
RUN chmod +x /bin/wait_for_it.sh
RUN npm i -g npm; npm i -g typings typescript tslint bunyan mocha

#CMD rm -rf node_modules typings; typings i && npm i && tsc && npm start
CMD npm build_start
