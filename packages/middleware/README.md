# [@grpc-web/middleware](https://github.com/marella/node-grpc-web/tree/main/packages/middleware) [![npm](https://img.shields.io/npm/v/@grpc-web/middleware)](https://www.npmjs.com/package/@grpc-web/middleware) [![tests](https://github.com/marella/node-grpc-web/actions/workflows/tests.yml/badge.svg)](https://github.com/marella/node-grpc-web/actions/workflows/tests.yml) [![coverage](https://coveralls.io/repos/github/marella/node-grpc-web/badge.svg)](https://coveralls.io/github/marella/node-grpc-web)

gRPC Web middleware for Express and Connect.

> For standalone proxy, see [`@grpc-web/proxy`](https://www.npmjs.com/package/@grpc-web/proxy)

## Installation

```sh
npm install @grpc-web/middleware
```

## Usage

This middleware proxies gRPC Web requests to the given gRPC server and can be used with existing Express and Connect applications. Here is a full working example of a proxy server created using `express` and `cors` packages:

```js
const express = require('express');
const cors = require('cors');
const grpcWeb = require('@grpc-web/middleware');

const app = express();
app.use(cors({ exposedHeaders: ['grpc-status', 'grpc-message'] }));
app.use(grpcWeb('http://localhost:9090'));
app.listen(8080);
```

In above example, `express` can be replaced with `connect`. The address `http://localhost:9090` refers to the gRPC server address to which gRPC Web requests are forwarded to and `8080` refers to the port on which the proxy server is running.

gRPC Web middleware only handles gRPC Web requests and ignores normal HTTP requests, so it can be used together with normal web applications:

```js
app.use(grpcWeb('http://localhost:9090'));

app.get('/', (req, res) => {
  res.send('Hello World');
});
```

It can be run in the same process as the gRPC server:

```js
// Express or Connect server
app.use(grpcWeb('http://localhost:9090'));
app.listen(8080);

// gRPC server
const server = new grpc.Server();
server.addProtoService(service, implementation);
server.bind('0.0.0.0:9090', credentials);
server.start();
```

It also accepts a custom function which can used for configuring the HTTP/2 connection to the gRPC server:

```js
const http2 = require('node:http2');

app.use(
  grpcWeb(() => {
    return http2.connect('http://localhost:9090');
  })
);
```

## License

[MIT](https://github.com/marella/node-grpc-web/blob/main/packages/middleware/LICENSE)
