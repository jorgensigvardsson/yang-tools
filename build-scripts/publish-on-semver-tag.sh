#!/bin/sh

if [ "$NPM_REGISTRY_TOKEN" == "" ]; then
	echo No NPM Registry token specified, stopping...
	exit 0
fi

# First, check if the tag is semver compatible.
# Official sem ver regex:
SEM_VER_REGEX='^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$'

if ! (echo $VERSION | pcregrep $SEM_VER_REGEX); then
	echo Its not a semver tag, stopping...
	exit 0
fi

echo Setting package version to $VERSION
jq -r --arg semver "$VERSION" '.version = $semver' package.json | tee package.json.tmp && \
mv package.json.tmp package.json

npm config set -- 'npm.pkg.github.com/:_authToken' "${NPM_REGISTRY_TOKEN}"
npm publish --scope @westermo