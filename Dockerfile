FROM node:17-alpine

WORKDIR /work

RUN apk add jq pcre-tools

COPY . ./

VOLUME /dist

CMD npm install && \
    npm run test:ci && \
	npm run build:ci && \
	cp -a ./dist/* /dist
