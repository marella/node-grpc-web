# [@grpc-web/proxy](https://github.com/marella/node-grpc-web/tree/main/packages/proxy) [![npm](https://img.shields.io/npm/v/@grpc-web/proxy)](https://www.npmjs.com/package/@grpc-web/proxy) [![tests](https://github.com/marella/node-grpc-web/actions/workflows/tests.yml/badge.svg)](https://github.com/marella/node-grpc-web/actions/workflows/tests.yml) [![coverage](https://coveralls.io/repos/github/marella/node-grpc-web/badge.svg)](https://coveralls.io/github/marella/node-grpc-web)

gRPC Web proxy for Node.js

> For Express and Connect middleware, see [`@grpc-web/middleware`](https://www.npmjs.com/package/@grpc-web/middleware)

## Installation

```sh
npm install @grpc-web/proxy
```

## Usage

This is a standalone proxy server created using [`@grpc-web/middleware`](https://www.npmjs.com/package/@grpc-web/middleware), `connect` and `cors` packages. It can be run directly from the command line:

```sh
npx @grpc-web/proxy --target http://localhost:9090 --listen 8080
```

or used as a library:

```js
const proxy = require('@grpc-web/proxy');

proxy({ target: 'http://localhost:9090' }).listen(8080);
```

The address `http://localhost:9090` refers to the gRPC server address to which gRPC Web requests are forwarded to and `8080` refers to the port on which the proxy server is running.

It can be run in the same process as the gRPC server:

```js
// Proxy server
proxy({ target: 'http://localhost:9090' }).listen(8080);

// gRPC server
const server = new grpc.Server();
server.addProtoService(service, implementation);
server.bind('0.0.0.0:9090', credentials);
server.start();
```

It also accepts a custom function which can used for configuring the HTTP/2 connection to the gRPC server:

```js
const http2 = require('node:http2');

proxy({
  target: () => {
    return http2.connect('http://localhost:9090');
  },
}).listen(8080);
```

### Options

- `target`: gRPC server address or a custom function that returns a HTTP/2 connection to the gRPC server. See [`@grpc-web/middleware`](https://www.npmjs.com/package/@grpc-web/middleware).
- `origin`: Configures the **Access-Control-Allow-Origin** CORS header. See `origin` option in [`cors`](https://www.npmjs.com/package/cors#configuration-options).
- `headers`: Configures the **Access-Control-Expose-Headers** CORS header. See `exposedHeaders` option in [`cors`](https://www.npmjs.com/package/cors#configuration-options).

## License

[MIT](https://github.com/marella/node-grpc-web/blob/main/packages/proxy/LICENSE)
