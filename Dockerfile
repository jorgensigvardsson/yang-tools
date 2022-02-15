FROM node:17-alpine

WORKDIR /work

RUN apk add jq pcre-tools

COPY package* ./
COPY ./src/ ./src/
COPY jest* ./
COPY tsconfig.json ./
COPY ./build-scripts/ ./build-scripts/

ENV NPM_REGISTRY_TOKEN=
ENV VERSION=

CMD npm install && \
    npm run test:ci && \
    npm run build:ci && \
	./build-scripts/publish-on-semver-tag.sh