const http = require('node:http');
const http2 = require('node:http2');
const startGrpcServer = require('grpc-interop-server');
const proxy = require('../src/index.js');

const ports = {
  proxy: 8086,
  grpc: 9096,
};

const request = (options) =>
  new Promise((resolve, reject) => {
    const req = http.request({ port: ports.proxy, ...options }, resolve);
    req.on('error', reject);
    req.end();
  });

let proxyServer;

beforeAll((done) => {
  proxyServer = proxy({
    target: () => http2.connect(`http://localhost:${ports.grpc}`),
  }).listen(ports.proxy, done);
});

afterAll((done) => {
  proxyServer.close(done);
});

describe('http error tests - service is not available', () => {
  test('should return 503', async () => {
    const res = await request({
      method: 'POST',
      headers: {
        'Content-Type': 'application/grpc-web',
      },
    });
    expect(res.statusCode).toEqual(503);
  });
});

describe('http error tests - service is not supported', () => {
  let httpServer;

  beforeAll((done) => {
    httpServer = http.createServer((req, res) => {
      res.end();
    });

    httpServer.listen(ports.grpc, done);
  });

  afterAll((done) => {
    httpServer.close(done);
  });

  test('should return 502', async () => {
    const res = await request({
      method: 'POST',
      headers: {
        'Content-Type': 'application/grpc-web',
      },
    });
    expect(res.statusCode).toEqual(502);
  });
});

describe('http error tests - service is available', () => {
  let grpcServer;

  beforeAll(async () => {
    grpcServer = await startGrpcServer({ port: ports.grpc });
  });

  afterAll((done) => {
    grpcServer.tryShutdown(done);
  });

  test.each(['GET', 'PUT', 'PATCH', 'DELETE'])(
    'should return 404 for unsupported method',
    async (method) => {
      const res = await request({
        method,
        headers: {
          'Content-Type': 'application/grpc-web',
        },
      });
      expect(res.statusCode).toEqual(404);
    }
  );

  test.each([
    'application/grpc',
    'application/grpc-web-',
    'application/grpc-web-+proto',
    'application/grpc-web-text-',
    'application/grpc-web-text-+proto',
    'application/javascript',
    'text/html',
    'unknown',
    '',
  ])('should return 404 for unsupported content type', async (contentType) => {
    const res = await request({
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
    });
    expect(res.statusCode).toEqual(404);
  });
});

test('show throw error when target is missing', () => {
  expect(() => {
    proxy();
  }).toThrow('Please specify the gRPC server address.');
});
