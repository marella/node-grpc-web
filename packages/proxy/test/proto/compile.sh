#!/usr/bin/env sh

set -eu
cd "$(dirname "$0")"

protoc -I=. test.proto empty.proto messages.proto --js_out=import_style=commonjs:js

protoc -I=. test.proto --grpc-web_out=import_style=commonjs,mode=grpcwebtext:js
mv js/test_grpc_web_pb.js js/test_grpc_web_text_pb.js

protoc -I=. test.proto --grpc-web_out=import_style=commonjs,mode=grpcweb:js
