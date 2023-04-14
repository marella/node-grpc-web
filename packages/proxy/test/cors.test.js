const http = require('node:http');
const proxy = require('../src/index.js');

const ports = {
  proxy: 8087,
  grpc: 9097,
};

const request = (options) =>
  new Promise((resolve, reject) => {
    const req = http.request({ port: ports.proxy, ...options }, resolve);
    req.on('error', reject);
    req.end();
  });

let proxyServer;

const start = (options = {}) =>
  new Promise((resolve, reject) => {
    const app = proxy({ target: `http://localhost:${ports.grpc}`, ...options });
    proxyServer = app.listen(ports.proxy, resolve);
  });

afterEach((done) => {
  proxyServer.close(done);
});

describe('OPTIONS', () => {
  test('defaults', async () => {
    await start();
    const res = await request({
      method: 'OPTIONS',
      headers: { 'access-control-request-headers': 'header-1,header-2' },
    });
    expect(res.statusCode).toEqual(204);
    expect(res.headers).toMatchObject({
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'header-1,header-2',
      'access-control-allow-methods': 'POST',
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'grpc-status,grpc-message',
    });
  });

  test('origin', async () => {
    await start({ origin: 'foo' });
    const res = await request({
      method: 'OPTIONS',
      headers: { 'access-control-request-headers': 'header-1,header-2' },
    });
    expect(res.statusCode).toEqual(204);
    expect(res.headers).toMatchObject({
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'header-1,header-2',
      'access-control-allow-methods': 'POST',
      'access-control-allow-origin': 'foo',
      'access-control-expose-headers': 'grpc-status,grpc-message',
    });
  });

  test('headers (string)', async () => {
    await start({ headers: 'foo,bar' });
    const res = await request({
      method: 'OPTIONS',
      headers: { 'access-control-request-headers': 'header-1,header-2' },
    });
    expect(res.statusCode).toEqual(204);
    expect(res.headers).toMatchObject({
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'header-1,header-2',
      'access-control-allow-methods': 'POST',
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'grpc-status,grpc-message,foo,bar',
    });
  });

  test('headers (array)', async () => {
    await start({ headers: ['foo', 'bar'] });
    const res = await request({
      method: 'OPTIONS',
      headers: { 'access-control-request-headers': 'header-1,header-2' },
    });
    expect(res.statusCode).toEqual(204);
    expect(res.headers).toMatchObject({
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'header-1,header-2',
      'access-control-allow-methods': 'POST',
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'grpc-status,grpc-message,foo,bar',
    });
  });
});

describe('POST', () => {
  const contentTypes = [
    'application/grpc-web-text',
    'application/grpc-web',
    'application/grpc-web-text+proto',
    'application/grpc-web+proto',
  ];

  test.each(contentTypes)('defaults', async (contentType) => {
    await start();
    const res = await request({
      method: 'POST',
      headers: { 'content-type': contentType },
    });
    expect(res.statusCode).toEqual(503);
    expect(res.headers).toMatchObject({
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'grpc-status,grpc-message',
    });
  });

  test.each(contentTypes)('origin', async (contentType) => {
    await start({ origin: 'foo' });
    const res = await request({
      method: 'POST',
      headers: { 'content-type': contentType },
    });
    expect(res.statusCode).toEqual(503);
    expect(res.headers).toMatchObject({
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': 'foo',
      'access-control-expose-headers': 'grpc-status,grpc-message',
    });
  });

  test.each(contentTypes)('headers (string)', async (contentType) => {
    await start({ headers: 'foo,bar' });
    const res = await request({
      method: 'POST',
      headers: { 'content-type': contentType },
    });
    expect(res.statusCode).toEqual(503);
    expect(res.headers).toMatchObject({
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'grpc-status,grpc-message,foo,bar',
    });
  });

  test.each(contentTypes)('headers (array)', async (contentType) => {
    await start({ headers: ['foo', 'bar'] });
    const res = await request({
      method: 'POST',
      headers: { 'content-type': contentType },
    });
    expect(res.statusCode).toEqual(503);
    expect(res.headers).toMatchObject({
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'grpc-status,grpc-message,foo,bar',
    });
  });
});
